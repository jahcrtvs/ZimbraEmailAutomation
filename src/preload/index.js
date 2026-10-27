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
  update: { check: () => call("update:check"), download: () => call("update:download") },
  logError: e => call("log:error", e),
  generate: p => call("ai:generate", p),
  onGenerateProgress: on("ai:progress"),
  localStatus: () => call("ai:status"),
  testAI: provider => call("ai:test", provider),
  setApiKey: (key, provider) => call("ai:setKey", key, provider),
  zimbra: {
    check: () => call("zimbra:check"),
    prepare: p => call("zimbra:prepare", p),
    open: () => call("zimbra:open"),
    onStep: on("prepare:step")
  }
});
