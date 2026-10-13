import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { registerIpc } from "../../../src/main/ipc.js";

let handlers, sent, deps;
beforeEach(() => {
  handlers = {}; sent = [];
  const store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-ipc-")));
  deps = {
    ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
    store, send: (c, p) => sent.push([c, p]),
    secrets: { hasKey: () => false, setKey: () => {} },
    generator: { generate: async () => [{ type: "text", text: "x" }], testConnection: async () => true },
    scheduler: { upsert: i => [i], setStatus: () => [] },
    zimbra: { checkSession: async () => "connected", openPage: async () => {}, prepareMessage: async (_p, onStep) => { onStep(1); onStep(2); onStep(3); } },
    shell: { openExternal: async () => {} }
  };
  registerIpc(deps);
});
const call = (ch, ...a) => handlers[ch]({}, ...a);

describe("ipc", () => {
  it("loads everything plus hasKey", async () => {
    const r = await call("store:load");
    expect(r.ok).toBe(true);
    expect(Object.keys(r.value).sort()).toEqual(["audit", "draft", "hasKey", "history", "schedule", "settings", "template"]);
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
  it("rejects non-http(s) Zimbra URLs", async () => {
    expect((await call("zimbra:check", "file:///etc/passwd")).ok).toBe(false);
    expect((await call("zimbra:prepare", { url: "javascript:alert(1)", to: "a@b.co", subject: "s", body: "b" })).ok).toBe(false);
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
  it("tests the connection for the selected provider", async () => {
    const seen = [];
    deps.generator.testConnection = async (m, p) => { seen.push([m, p]); return true; };
    registerIpc(deps);
    await call("ai:test", "flash", "groq");
    expect(seen).toEqual([["flash", "groq"]]);
  });
  it("never returns the API key", async () => {
    deps.secrets.hasKey = () => true; deps.secrets.getKey = () => "SECRET";
    registerIpc(deps);
    expect(JSON.stringify(await call("store:load"))).not.toContain("SECRET");
  });
});
