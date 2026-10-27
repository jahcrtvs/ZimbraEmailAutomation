const AI_PROVIDERS = ["gemini", "groq"];
const MODES = ["auto", "cloud", "template"];
const SAVEABLE =["history", "template", "settings", "draft"];

const wrap = fn => async (_e, ...args) => {
  try { return { ok: true, value: await fn(...args) }; }
  catch (e) { return { ok: false, error: { code: e.code || "ERROR", message: String(e.message || e) } }; }
};
const httpUrl = u => { let p; try { p = new URL(u); } catch { throw new Error("Invalid URL."); } if (!/^https?:$/.test(p.protocol)) throw new Error("Only http(s) URLs are allowed."); return u; };

export function registerIpc({ ipcMain, store, secrets, generator, scheduler, zimbra, send, update, shell }) {
  const h = (ch, fn) => ipcMain.handle(ch, wrap(fn));
  const checkProvider = p => { if (!AI_PROVIDERS.includes(p)) throw new Error("Unknown provider."); return p; };
  // The renderer never supplies AI settings: what gets sent, and where, is decided from the stored settings.
  const ai = () => store.read("settings").ai;
  h("store:load", () => ({ ...store.readAll(), hasKey: { gemini: secrets.hasKey("gemini"), groq: secrets.hasKey("groq") } }));
  h("store:save", (name, data) => { if (!SAVEABLE.includes(name)) throw new Error("Cannot save " + name); store.write(name, data); return true; });
  h("schedule:upsert", item => scheduler.upsert(item));
  h("schedule:setStatus", (id, status) => scheduler.setStatus(id, status));
  h("ai:generate", ({ notes, template, profile, date, dateFormat, mode = "auto" }) => {
    if (!MODES.includes(mode)) throw new Error("Unknown mode.");
    // History is read here, never taken from the renderer, for the same reason as the AI settings.
    return generator.generate({ notes, template, profile, date, dateFormat, mode, ai: ai(), history: store.read("history"), onProgress: p => send("ai:progress", p) });
  });
  h("ai:status", () => generator.localStatus(ai().local));
  h("ai:test", p => generator.testConnection(checkProvider(p), ai().geminiModel));
  h("ai:setKey", (key, p = "gemini") => { secrets.setKey(key, checkProvider(p)); return true; });
  h("update:check", () => update.check());
  // The address comes from the checker, never from the renderer.
  h("update:download", async () => { await shell.openExternal(update.downloadUrl); return true; });
  h("zimbra:check", url => zimbra.checkSession(httpUrl(url)));
  h("zimbra:open", async url => { await zimbra.openPage(httpUrl(url)); return true; });
  h("zimbra:prepare", async ({ url, to, subject, body }) => {
    await zimbra.prepareMessage({ url: httpUrl(url), to, subject, body }, n => send("prepare:step", n));
    return true;
  });
}
