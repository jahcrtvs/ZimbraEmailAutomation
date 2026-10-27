import { noteItems, polish } from "../shared/report.js";
import { SECTION_KEYS } from "./reply.js";
import { coversItem, inventsFacts } from "./check.js";

// The kind polish() uses for each reply key.
const KIND = { tasks: "tasks", topics: "topics", weekly_plans: "plans", blockers: "blockers" };

// Report section titles (default template) -> the reply key that fills them.
const TITLES = { "TASK TODAY": "tasks", "PLANS FOR THE WEEK": "weekly_plans", "TOPICS": "topics", "BLOCKERS": "blockers" };

export const BUILT_IN_EXAMPLES = [
  { section: "tasks", item: "fixed duplicate result", sentence: "Fixed the duplicate results returned by the search query so that each record now appears once." },
  { section: "tasks", item: "worked on office repository", sentence: "Worked on the office repository, including the methods that save and retrieve records from the database." },
  { section: "tasks", item: "wrote unit tests", sentence: "Wrote unit tests for the service methods to confirm that they behave as expected." },
  { section: "topics", item: "lesson in hibernate", sentence: "Studied the Hibernate lesson, covering how Java objects are mapped to database tables using ORM." },
  { section: "topics", item: "hql vs criteria", sentence: "Reviewed the differences between HQL and the Criteria API when writing queries in Hibernate." },
  { section: "weekly_plans", item: "continue repository", sentence: "Continue work on the repository and complete the remaining data access methods." },
  { section: "weekly_plans", item: "practice joins", sentence: "Practice writing SQL joins to retrieve related records from several database tables." },
  { section: "blockers", item: "cannot connect to database", sentence: "Unable to connect to the database from the application, so the connection settings are being reviewed." }
];

// Lines each sent report up with the notes it came from. A section is used only when its
// sentence count equals its item count; a hand-edited report is skipped, never mismatched.
export function pairsFromHistory(history) {
  const out = [], seen = new Set();
  for (const h of history || []) {
    if (!h || h.status !== "sent" || !h.notes || !Array.isArray(h.blocks)) continue;
    const items = noteItems(h.notes);
    for (const b of h.blocks) {
      const k = b?.type === "section" ? TITLES[b.title] : null;
      if (!k || !items[k].length || b.items.length !== items[k].length) continue;
      items[k].forEach((item, i) => {
        const sentence = String(b.items[i] || "").trim(), key = k + "|" + item + "|" + sentence;
        // Only sentences worth copying: not the built-in rule's own output, and about their own item.
        const good = sentence && sentence !== polish(item, KIND[k]) && coversItem(item, sentence) && !inventsFacts(item, sentence);
        if (good && !seen.has(key)) { seen.add(key); out.push({ section: k, item, sentence }); }
      });
    }
  }
  return out;
}

const words = s => [...new Set(String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || [])];

export function pickExamples({ history = [], items, limit = 6 }) {
  const mine = pairsFromHistory(history).map(c => ({ c, bonus: 0.5 }));
  const today = new Set(SECTION_KEYS.flatMap(k => items[k] || []).flatMap(words));
  const ranked = [...mine, ...BUILT_IN_EXAMPLES.map(c => ({ c, bonus: 0 }))]
    .map((r, i) => ({ ...r, i, score: words(r.c.item).filter(w => today.has(w)).length + r.bonus }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const picked = [];
  for (const k of SECTION_KEYS) {
    if (!(items[k] || []).length) continue;
    const best = ranked.find(r => r.c.section === k && !picked.includes(r));
    if (best) picked.push(best);
  }
  for (const r of ranked) if (picked.length < limit && !picked.includes(r)) picked.push(r);
  return picked.slice(0, limit).sort((a, b) => SECTION_KEYS.indexOf(a.c.section) - SECTION_KEYS.indexOf(b.c.section) || a.i - b.i).map(r => r.c);
}
