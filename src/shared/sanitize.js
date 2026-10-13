export const NOTE_KEYS = ["work", "topics", "progress", "blockers", "tomorrow"];
export const MAX_CLOUD_CHARS = 8000;

const SECRETS = [
  [/\bgsk_[A-Za-z0-9]{20,}/, "a Groq API key"],
  [/\bAIza[0-9A-Za-z_-]{30,}/, "a Google API key"],
  [/\bsk-[A-Za-z0-9_-]{20,}/, "an API key"],
  [/\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/, "a GitHub token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{20,}/i, "a bearer token"],
  [/\b(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*\S+/i, "a password or secret"],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i, "a connection string with credentials"]
];

const RULES = [
  ["EMAIL", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["URL", /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi],
  ["IP", /\b\d{1,3}(?:\.\d{1,3}){3}\b/g],
  ["PHONE", /\+?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?\b|\b\d{9,}\b/g],
  ["TOKEN", /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g]
];

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findSecret(text) {
  for (const [re, label] of SECRETS) if (re.test(text)) return label;
  return null;
}

export function sanitizeNotes(notes, { terms = [] } = {}) {
  const total = NOTE_KEYS.reduce((n, k) => n + String(notes?.[k] || "").length, 0);
  if (total > MAX_CLOUD_CHARS) return { blocked: `Your notes are longer than ${MAX_CLOUD_CHARS} characters, so they will not be sent to a cloud service.` };
  const secret = findSecret(NOTE_KEYS.map(k => notes?.[k] || "").join("\n"));
  if (secret) return { blocked: `Your notes appear to contain ${secret}, so they will not be sent to a cloud service.` };

  const map = [], byKey = new Map(), counts = {};
  const swap = (kind, original) => {
    const key = kind + "|" + original;
    if (!byKey.has(key)) {
      counts[kind] = (counts[kind] || 0) + 1;
      const placeholder = `[${kind}_${counts[kind]}]`;
      byKey.set(key, placeholder);
      map.push({ placeholder, original });
    }
    return byKey.get(key);
  };
  const termRes = [...new Set(terms.map(t => String(t).trim()).filter(t => t.length >= 3))]
    .sort((a, b) => b.length - a.length)
    .map(t => new RegExp(`(?<![A-Za-z0-9])${escapeRe(t)}(?![A-Za-z0-9])`, "gi"));

  const out = {};
  for (const k of NOTE_KEYS) {
    let text = String(notes?.[k] || "");
    for (const [kind, re] of RULES) text = text.replace(re, m => swap(kind, m));
    for (const re of termRes) text = text.replace(re, m => swap("NAME", m));
    out[k] = text;
  }
  return { blocked: null, notes: out, map };
}

export function restore(text, map) {
  let out = String(text);
  for (const m of map) out = out.replace(new RegExp(escapeRe(m.placeholder), "gi"), () => m.original);
  return out;
}
