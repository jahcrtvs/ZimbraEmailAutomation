import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { registerIpc } from "../../../src/main/ipc.js";
import { createNotifications } from "../../../src/main/notifications.js";
import { buildPptx } from "./deckFiles.js";

const DECK_FILE = { name: "Spring Security.pptx", data: buildPptx({ title: "Spring Security", slides: [{ title: "Authentication", lines: ["Login form"] }, { title: "Roles", lines: ["Method security"] }] }) };
const OLD_FILE = { name: "old.ppt", data: Buffer.from("x") };
const DRAFT = { work: ["Attended the presentation on Spring Security"], topics: ["Authentication", "Roles"], progress: [], blockers: [], tomorrow: [] };
const ok = (source = "template") => ({ status: "ok", source, note: null, draft: DRAFT });

// The deck is kept inside one registerIpc call, so tests change what the picker and generator do
// behind the same handlers instead of registering again.
let handlers, deps, sorted, picks, pickImpl;
beforeEach(() => {
  handlers = {}; sorted = []; picks = []; pickImpl = async () => DECK_FILE;
  const store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-ipc-slides-")));
  deps = {
    ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
    store, send: () => {},
    secrets: { hasKey: () => false, setKey: () => {} },
    generator: { sortSlides: async p => { sorted.push(p); return ok(); } },
    scheduler: {}, zimbra: {}, shell: {}, update: {},
    notifications: createNotifications({ store }),
    pickSlides: async () => { picks.push(1); return pickImpl(); }
  };
  registerIpc(deps);
});
const call = (ch, ...a) => handlers[ch]({}, ...a);

describe("slides:pick", () => {
  it("reads the chosen file in the main process and tells the page only its name and slide count", async () => {
    expect(await call("slides:pick")).toEqual({ ok: true, value: { fileName: "Spring Security.pptx", slides: 2 } });
  });
  it("returns null when the user cancels the dialog", async () => {
    pickImpl = async () => null;
    expect(await call("slides:pick")).toEqual({ ok: true, value: null });
  });
  it("passes on why a file cannot be read", async () => {
    pickImpl = async () => OLD_FILE;
    expect(await call("slides:pick")).toMatchObject({ ok: false, error: { code: "UNSUPPORTED", message: expect.stringMatching(/\.pptx or PDF/) } });
  });
  it("passes on a picker error such as a file that is too big", async () => {
    pickImpl = async () => { throw Object.assign(new Error("This file is larger than 25 MB."), { code: "TOO_BIG" }); };
    expect(await call("slides:pick")).toEqual({ ok: false, error: { code: "TOO_BIG", message: "This file is larger than 25 MB." } });
  });
  it("forgets an earlier deck when a new file cannot be read", async () => {
    await call("slides:pick");
    pickImpl = async () => OLD_FILE;
    await call("slides:pick");
    expect(await call("slides:sort", { role: "attended" })).toMatchObject({ ok: false, error: { code: "NO_FILE" } });
    expect(sorted).toHaveLength(0);
  });
  it("keeps the earlier deck when the user cancels a second time", async () => {
    await call("slides:pick");
    pickImpl = async () => null;
    await call("slides:pick");
    expect((await call("slides:sort", { role: "attended" })).ok).toBe(true);
    expect(sorted[0].deck.title).toBe("Spring Security");
  });
});

describe("slides:sort", () => {
  it("sorts the picked deck with the stored AI settings and profile, and ignores any the page sends", async () => {
    await call("slides:pick");
    const r = await call("slides:sort", { role: "studied", mode: "cloud", ai: { evil: true }, profile: { name: "Evil" }, deck: { title: "Evil", slides: [] }, fileName: "evil.pptx" });
    expect(r).toEqual({ ok: true, value: ok() });
    const settings = deps.store.read("settings");
    expect(sorted).toHaveLength(1);
    expect(sorted[0]).toMatchObject({ role: "studied", mode: "cloud", fileName: "Spring Security.pptx", ai: settings.ai, profile: settings.profile });
    expect(sorted[0].deck.title).toBe("Spring Security");
    expect(sorted[0].deck.slides.map(s => s.title)).toEqual(["Authentication", "Roles"]);
  });
  it("defaults the mode to auto and rejects an unknown role or mode", async () => {
    await call("slides:pick");
    expect((await call("slides:sort", { role: "watched" })).ok).toBe(false);
    expect((await call("slides:sort", { role: "attended", mode: "bogus" })).ok).toBe(false);
    expect((await call("slides:sort")).ok).toBe(false);
    expect(sorted).toHaveLength(0);
    await call("slides:sort", { role: "attended" });
    expect(sorted[0].mode).toBe("auto");
  });
  it("asks the user to choose a file first when none was picked", async () => {
    expect(await call("slides:sort", { role: "attended" })).toMatchObject({ ok: false, error: { code: "NO_FILE", message: expect.stringMatching(/Choose a presentation/) } });
    expect(sorted).toHaveLength(0);
  });
  it("sorts the same deck again after consent, then forgets it once a draft is returned", async () => {
    await call("slides:pick");
    deps.generator.sortSlides = async p => { sorted.push(p); return p.mode === "cloud" ? ok("groq") : { status: "needs-consent", provider: "groq", failure: null, preview: { text: "t", chars: 1 } }; };
    expect((await call("slides:sort", { role: "attended" })).value.status).toBe("needs-consent");
    expect((await call("slides:sort", { role: "attended", mode: "cloud" })).value.status).toBe("ok");
    expect(picks).toHaveLength(1);
    expect((await call("slides:sort", { role: "attended" })).error.code).toBe("NO_FILE");
  });
  it("keeps the deck when sorting fails, so the user can try again", async () => {
    await call("slides:pick");
    let n = 0;
    deps.generator.sortSlides = async () => { if (n++ === 0) throw new Error("boom"); return ok(); };
    expect((await call("slides:sort", { role: "attended" })).ok).toBe(false);
    expect((await call("slides:sort", { role: "attended" })).ok).toBe(true);
  });
});
