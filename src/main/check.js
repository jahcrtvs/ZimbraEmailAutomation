import { SECTION_KEYS } from "./reply.js";

// Capitalised words a sentence may use even when the item does not contain them.
const TECH_TERMS = new Set(["hibernate", "spring", "boot", "java", "sql", "hql", "jdbc", "api", "apis", "orm", "crud", "id", "ids", "rest", "json", "xml", "http", "https", "html", "css", "javascript", "postgresql", "mysql", "jpa", "mvc", "maven", "git", "github", "junit", "jsp", "jstl", "tomcat", "jakarta", "criteria", "url", "ui"]);

const wordsOf = s => (s.match(/[A-Za-z][A-Za-z0-9+#]*/g) || []).map(w => w.toLowerCase());

// True when the sentence adds a number or a capitalised name that the item does not state.
export function inventsFacts(item, sentence) {
  const known = new Set(wordsOf(item));
  if ((sentence.match(/\d+/g) || []).some(d => !item.includes(d))) return true;
  const caps = (sentence.match(/\b[A-Z][A-Za-z0-9+#]*/g) || []).slice(sentence.trim().match(/^[A-Z]/) ? 1 : 0);
  return caps.some(w => { const l = w.toLowerCase(); return !known.has(l) && !TECH_TERMS.has(l); });
}

// Words that say what kind of entry an item is, not what it is about.
const FILLER = new Set(["the", "and", "for", "with", "from", "about", "into", "work", "worked", "continue", "continued", "finish", "finished", "fixed", "completed", "studied", "started", "still", "today", "tomorrow"]);
const contentStems = s => (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => (w.length >= 3 || /\d/.test(w)) && !FILLER.has(w)).map(w => w.slice(0, 4));

// True when the sentence mentions something from its own item (tense and typos allowed).
// The schema fixes how many sentences there are, not which item each one is about.
export function coversItem(item, sentence) {
  const want = contentStems(item);
  if (!want.length) return true;
  const have = new Set(contentStems(sentence));
  return want.some(w => have.has(w));
}

// Keeps each good AI sentence; any other item gets its built-in rule sentence.
export function applyChecks({ items, parsed, builtIn, partial = false }) {
  const out = {};
  let fallbacks = 0, total = 0;
  for (const k of SECTION_KEYS) {
    const src = items[k] || [], got = parsed[k] || [], base = builtIn[k] || [];
    total += src.length;
    const aligned = got.length === src.length || (partial && got.length < src.length);
    out[k] = src.map((item, i) => {
      const s = aligned && typeof got[i] === "string" ? got[i].trim() : "";
      if (s && coversItem(item, s) && !inventsFacts(item, s)) return s;
      fallbacks++;
      return base[i];
    });
  }
  return { parsed: out, fallbacks, total };
}
