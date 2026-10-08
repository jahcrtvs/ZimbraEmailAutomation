const AI_PROVIDERS = ["gemini", "groq"];
const SAVEABLE =["history", "template", "settings", "draft"];

const wrap = fn => async (_e, ...args) => {
  try { return { ok: true, value: await fn(...args) }; }
  catch (e) { return { ok: false, error: { code: e.code || "ERROR", message: String(e.message || e) } }; }
};
const httpUrl = u => { let p; try { p = new URL(u); } catch { throw new Error("Invalid URL."); } if (!/^https?:$/.test(p.protocol)) throw new Error("Only http(s) URLs are allowed."); return u; };

export function registerIpc({ ipcMain, store, secrets, generator, scheduler, zimbra, send }) {
  const h = (ch, fn) => ipcMain.handle(ch, wrap(fn));
  const provider = p => { if (!AI_PROVIDERS.includes(p)) throw new Error("Unknown provider."); return p; };
  h("store:load", () => ({ ...store.readAll(), hasKey: { gemini: secrets.hasKey("gemini"), groq: secrets.hasKey("groq") } }));
  h("store:save", (name, data) => { if (!SAVEABLE.includes(name)) throw new Error("Cannot save " + name); store.write(name, data); return true; });
  h("schedule:upsert", item => scheduler.upsert(item));
  h("schedule:setStatus", (id, status) => scheduler.setStatus(id, status));
  h("ai:generate", p => generator.generate(p));
  h("ai:test", (model, p = "gemini") => generator.testConnection(model, provider(p)));
  h("ai:setKey", (key, p = "gemini") => { secrets.setKey(key, provider(p)); return true; });
  h("zimbra:check", url => zimbra.checkSession(httpUrl(url)));
  h("zimbra:open", async url => { await zimbra.openPage(httpUrl(url)); return true; });
  h("zimbra:prepare", async ({ url, to, subject, body }) => {
    await zimbra.prepareMessage({ url: httpUrl(url), to, subject, body }, n => send("prepare:step", n));
    return true;
  });
}
