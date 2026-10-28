import fs from "node:fs";
import path from "node:path";
import { DEFAULT_TEMPLATE, VARIABLES, EMPTY_NOTES } from "../shared/report.js";
import { DEFAULT_LOCAL } from "../shared/ai.js";

// A placeholder: each person sets their own Zimbra address in Settings.
export const ZIMBRA_URL = "https://mail.example.com";

export const DEFAULTS = () => ({
  history: [],
  schedule: [],
  audit: [],
  notifications: [],
  template: { id: "daily-digest", name: "Daily Digest", body: DEFAULT_TEMPLATE, variables: [...VARIABLES] },
  settings: {
    general: { defaultSendTime: "5:00 PM" },
    alarm: { enabled: false, time: "4:30 PM" },
    profile: { name: "", role: "" },
    email: { defaultRecipient: "manager@company.com", defaultSubject: "Daily Digest - {date}", dateFormat: "long" },
    zimbra: { url: ZIMBRA_URL },
    ai: { local: { ...DEFAULT_LOCAL }, fallback: { provider: "groq", auto: false }, geminiModel: "flash", privacyTerms: "" },
    app: { startWithWindows: false, onboarded: false }
  },
  // date is "" for drafts saved before it was kept. report is the generated Report saved with Save as Draft, or null.
  draft: { notes: { ...EMPTY_NOTES }, date: "", report: null }
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

// Settings written before local AI existed had ai: { provider, model }.
function migrateAi(raw) {
  const ai = raw?.ai;
  if (!isObj(ai) || "local" in ai || "fallback" in ai) return raw;
  const next = { ...ai };
  if (["gemini", "groq"].includes(ai.provider)) next.fallback = { provider: ai.provider, auto: false };
  if (["flash", "pro"].includes(ai.model)) next.geminiModel = ai.model;
  return { ...raw, ai: next };
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
    try { const parsed = JSON.parse(raw); return merge(def, name === "settings" ? migrateAi(parsed) : parsed); }
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
