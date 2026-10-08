import { contextBridge, ipcRenderer } from "electron";

async function call(channel, ...args) {
  const r = await ipcRenderer.invoke(channel, ...args);
  if (r.ok) return r.value;
  const e = new Error(r.error.message); e.code = r.error.code; throw e;
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
  testAI: model => call("ai:test", model),
  setApiKey: key => call("ai:setKey", key),
  zimbra: {
    check: url => call("zimbra:check", url),
    prepare: p => call("zimbra:prepare", p),
    open: url => call("zimbra:open", url),
    onStep: on("prepare:step")
  }
});
