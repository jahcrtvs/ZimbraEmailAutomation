import { contextBridge, ipcRenderer } from "electron";

async function call(channel, ...args) {
  const r = await ipcRenderer.invoke(channel, ...args);
  if (r.ok) return r.value;
  // contextBridge strips custom props (like .code) from Error objects; a plain object survives.
  throw { code: r.error.code, message: r.error.message };
}
const on = channel => cb => {
  const fn = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld("api", {
  store: { load: () => call("store:load"), save: (name, data) => call("store:save", name, data) },
  schedule: {
    upsert: item => call("schedule:upsert", item),
    setStatus: (id, status) => call("schedule:setStatus", id, status),
    onChanged: on("schedule:changed")
  },
  generate: p => call("ai:generate", p),
  localStatus: () => call("ai:status"),
  testAI: provider => call("ai:test", provider),
  setApiKey: (key, provider) => call("ai:setKey", key, provider),
  zimbra: {
    check: url => call("zimbra:check", url),
    prepare: p => call("zimbra:prepare", p),
    open: url => call("zimbra:open", url),
    onStep: on("prepare:step")
  }
});
