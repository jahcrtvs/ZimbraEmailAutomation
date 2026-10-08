import fs from "node:fs";
import path from "node:path";
import { DEFAULT_TEMPLATE, VARIABLES, EMPTY_NOTES } from "../shared/report.js";

export const DEFAULTS = () => ({
  history: [],
  schedule: [],
  template: { id: "daily-digest", name: "Daily Digest", body: DEFAULT_TEMPLATE, variables: [...VARIABLES] },
  settings: {
    general: { defaultSendTime: "5:00 PM" },
    profile: { name: "Mark Justine Dela Cruz", role: "CDP Trainee" },
    email: { defaultRecipient: "manager@company.com", defaultSubject: "Daily Digest - {date}" },
    zimbra: { url: "https://mail.company.local" },
    ai: { provider: "gemini", model: "flash" },
    app: { startWithWindows: true }
  },
  draft: { notes: { ...EMPTY_NOTES } }
});

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
function merge(def, val) {
  if (Array.isArray(def)) return Array.isArray(val) ? val : def;
  if (!isObj(def)) return val === undefined || typeof val !== typeof def ? def : val;
  if (!isObj(val)) return def;
  const out = {};
  for (const k of Object.keys(def)) out[k] = merge(def[k], val[k]);
  return out;
}

export function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = n => path.join(dir, n + ".json");
  const check = n => { if (!(n in DEFAULTS())) throw new Error("unknown collection " + n); };

  function read(name) {
    check(name);
    const def = DEFAULTS()[name];
    let raw;
    try { raw = fs.readFileSync(file(name), "utf8"); } catch { return def; }
    try { return merge(def, JSON.parse(raw)); }
    catch {
      try { fs.renameSync(file(name), file(name) + ".bad"); } catch { /* keep going */ }
      return def;
    }
  }
  function write(name, data) {
    check(name);
    const tmp = file(name) + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file(name));
  }
  function update(name, fn) { const next = fn(read(name)); write(name, next); return next; }
  const readAll = () => Object.fromEntries(Object.keys(DEFAULTS()).map(n => [n, read(n)]));
  return { read, write, update, readAll };
}
