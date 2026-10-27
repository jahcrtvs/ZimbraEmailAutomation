import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { registerIpc } from "../../../src/main/ipc.js";
import { createNotifications } from "../../../src/main/notifications.js";

let handlers, sent, deps, opened;
beforeEach(() => {
  handlers = {}; sent = []; opened = [];
  const store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-ipc-")));
  deps = {
    ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
    store, send: (c, p) => sent.push([c, p]),
    secrets: { hasKey: () => false, setKey: () => {} },
    generator: { generate: async () => ({ status: "ok", source: "local", note: null, blocks: [] }), testConnection: async () => true, localStatus: async () => ({ state: "ready" }) },
    scheduler: { upsert: i => [i], setStatus: () => [] },
    zimbra: { checkSession: async () => "connected", openPage: async () => {}, prepareMessage: async (_p, onStep) => { onStep(1); onStep(2); onStep(3); } },
    shell: { openExternal: async url => { opened.push(url); } },
    update: { check: async () => ({ state: "ok" }), downloadUrl: "https://site.test/api/download" },
    notifications: createNotifications({ store })
  };
  registerIpc(deps);
});
const call = (ch, ...a) => handlers[ch]({}, ...a);

describe("ipc", () => {
  it("loads everything plus hasKey", async () => {
    const r = await call("store:load");
    expect(r.ok).toBe(true);
    expect(Object.keys(r.value).sort()).toEqual(["audit", "draft", "hasKey", "history", "notifications", "schedule", "settings", "template"]);
  });
  it("checks for updates and opens only the checker's download address", async () => {
    expect(await call("update:check")).toEqual({ ok: true, value: { state: "ok" } });
    await call("update:download", "https://evil.test");
    expect(opened).toEqual(["https://site.test/api/download"]);
  });
  it("lists a new version once in notifications", async () => {
    deps.update.check = async () => ({ state: "optional", latest: "9.0.0" });
    await call("update:check"); await call("update:check");
    expect(deps.store.read("notifications")).toMatchObject([{ kind: "update", title: expect.stringContaining("9.0.0") }]);
  });
  it("lets the page add only errors, cut short", async () => {
    await call("notifications:addError", { title: "x".repeat(500), body: "y" });
    const [n] = deps.store.read("notifications");
    expect(n.kind).toBe("error");
    expect(n.title).toHaveLength(120);
    expect((await call("notifications:markAllRead")).value[0].read).toBe(true);
    expect((await call("notifications:clear")).value).toEqual([]);
  });
  it("saves only whitelisted collections (schedule is main-owned)", async () => {
    expect((await call("store:save", "history", [])).ok).toBe(true);
    const bad = await call("store:save", "schedule", []);
    expect(bad.ok).toBe(false);
  });
  it("wraps thrown errors with a code", async () => {
    deps.zimbra.checkSession = async () => { const e = new Error("no"); e.code = "UNREACHABLE"; throw e; };
    registerIpc(deps);
    expect(await call("zimbra:check", "https://z")).toEqual({ ok: false, error: { code: "UNREACHABLE", message: "no" } });
  });
  it("forwards prepare steps as events", async () => {
    const r = await call("zimbra:prepare", { url: "https://z", to: "a@b.co", subject: "s", body: "b" });
    expect(r.ok).toBe(true);
    expect(sent.filter(([c]) => c === "prepare:step").map(([, n]) => n)).toEqual([1, 2, 3]);
  });
  it("uses the saved Zimbra address and ignores any the renderer sends", async () => {
    const seen = [];
    deps.zimbra = { checkSession: async u => { seen.push(u); return "connected"; }, openPage: async u => { seen.push(u); }, prepareMessage: async m => { seen.push(m.url); } };
    registerIpc(deps);
    await call("zimbra:check", "http://127.0.0.1:9");
    await call("zimbra:open", "https://evil.test");
    await call("zimbra:prepare", { url: "https://evil.test", to: "a@b.co", subject: "s", body: "b" });
    const saved = deps.store.read("settings").zimbra.url;
    expect(seen).toEqual([saved, saved, saved]);
  });
  it("rejects a saved Zimbra address that is not http(s)", async () => {
    const settings = deps.store.read("settings");
    deps.store.write("settings", { ...settings, zimbra: { url: "file:///etc/passwd" } });
    expect((await call("zimbra:check")).ok).toBe(false);
    expect((await call("zimbra:prepare", { to: "a@b.co", subject: "s", body: "b" })).ok).toBe(false);
  });
  it("applies saved settings at once, and only for settings", async () => {
    const applied = [];
    deps.onSettingsSaved = s => applied.push(s.app.startWithWindows);
    registerIpc(deps);
    const settings = deps.store.read("settings");
    await call("store:save", "settings", { ...settings, app: { startWithWindows: false } });
    await call("store:save", "history", []);
    expect(applied).toEqual([false]);
  });
  it("reports per-provider hasKey booleans only", async () => {
    deps.secrets.hasKey = p => p === "groq";
    registerIpc(deps);
    const r = await call("store:load");
    expect(r.value.hasKey).toEqual({ gemini: false, groq: true });
  });
  it("saves a key for the given provider (write-only) and rejects unknown providers", async () => {
    const calls = [];
    deps.secrets.setKey = (k, p) => calls.push([k, p]);
    registerIpc(deps);
    const ok = await call("ai:setKey", "K1", "groq");
    expect(ok).toEqual({ ok: true, value: true });
    expect(calls).toEqual([["K1", "groq"]]);
    expect((await call("ai:setKey", "K2", "evil")).ok).toBe(false);
    expect(calls).toHaveLength(1);
  });
  it("tests the connection for the selected provider with the stored Gemini model", async () => {
    const seen = [];
    deps.generator.testConnection = async (p, m) => { seen.push([p, m]); return true; };
    registerIpc(deps);
    await call("ai:test", "groq");
    expect(seen).toEqual([["groq", "flash"]]);
    expect((await call("ai:test", "evil")).ok).toBe(false);
    expect(seen).toHaveLength(1);
  });
  it("generates with the stored AI settings and ignores any the caller sends", async () => {
    let seen;
    deps.generator.generate = async p => { seen = p; return { status: "ok" }; };
    registerIpc(deps);
    const r = await call("ai:generate", { notes: { work: "x" }, template: "t", profile: {}, date: "2026-10-13", dateFormat: "long", mode: "cloud", ai: { evil: true } });
    expect(r.ok).toBe(true);
    expect(seen.ai).toEqual(deps.store.read("settings").ai);
    expect(seen.mode).toBe("cloud");
  });
  it("defaults the mode to auto and rejects unknown modes", async () => {
    let seen;
    deps.generator.generate = async p => { seen = p; return { status: "ok" }; };
    registerIpc(deps);
    await call("ai:generate", { notes: {}, template: "t", profile: {}, date: "2026-10-13", dateFormat: "long" });
    expect(seen.mode).toBe("auto");
    expect((await call("ai:generate", { notes: {}, mode: "bogus" })).ok).toBe(false);
  });
  it("gives the generator the stored history, and forwards sentences as ai:progress events", async () => {
    let seen;
    deps.generator.generate = async p => { seen = p; p.onProgress({ section: "tasks", sentence: "Done." }); return { status: "ok" }; };
    registerIpc(deps);
    const history = [{ id: "1", status: "sent", notes: {}, blocks: [] }];
    deps.store.write("history", history);
    const r = await call("ai:generate", { notes: { work: "x" }, template: "t", profile: {}, date: "2026-10-14", dateFormat: "long", history: [{ evil: true }] });
    expect(r.ok).toBe(true);
    expect(seen.history).toEqual(history);
    expect(sent).toContainEqual(["ai:progress", { section: "tasks", sentence: "Done." }]);
  });
  it("reports local status for the stored local settings", async () => {
    let seen;
    deps.generator.localStatus = async l => { seen = l; return { state: "ready" }; };
    registerIpc(deps);
    expect(await call("ai:status")).toEqual({ ok: true, value: { state: "ready" } });
    expect(seen).toEqual(deps.store.read("settings").ai.local);
  });
  it("writes page errors to the crash log, cut short", async () => {
    const seen = [];
    deps.log = (where, text) => seen.push([where, text]);
    registerIpc(deps);
    expect(await call("log:error", { where: "screen", message: "boom", stack: "Error: boom\n at x" })).toEqual({ ok: true, value: true });
    await call("log:error", { where: "w".repeat(100), message: "m".repeat(10000) });
    expect(seen[0]).toEqual(["page screen", "Error: boom\n at x"]);
    expect(seen[1][0]).toHaveLength(5 + 40);
    expect(seen[1][1]).toHaveLength(4000);
    expect((await call("log:error")).ok).toBe(true);
  });
  it("never returns the API key", async () => {
    deps.secrets.hasKey = () => true; deps.secrets.getKey = () => "SECRET";
    registerIpc(deps);
    expect(JSON.stringify(await call("store:load"))).not.toContain("SECRET");
  });
});
