import { SECTION_KEYS } from "./reply.js";

const ESC = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" };

// Reads the model's JSON as it arrives and reports each finished string inside a section array.
export function createSentenceScanner(onSentence = () => {}) {
  const result = Object.fromEntries(SECTION_KEYS.map(k => [k, []]));
  let depth = 0, inStr = false, esc = false, uni = null, buf = "", key = null;
  const finish = s => {
    if (depth === 1) key = s;
    else if (depth === 2 && result[key]) { result[key].push(s); onSentence(key, s, result[key].length - 1); }
  };
  const step = c => {
    if (inStr) {
      if (uni !== null) { uni += c; if (uni.length === 4) { buf += String.fromCharCode(parseInt(uni, 16) || 63); uni = null; } }
      else if (esc) { esc = false; if (c === "u") uni = ""; else buf += ESC[c] ?? c; }
      else if (c === "\\") esc = true;
      else if (c === '"') { inStr = false; finish(buf); }
      else buf += c;
    } else if (c === '"') { inStr = true; buf = ""; }
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") { depth = Math.max(0, depth - 1); if (depth === 1) key = null; }
  };
  return { push(chunk) { for (const c of chunk) step(c); }, result: () => result };
}
