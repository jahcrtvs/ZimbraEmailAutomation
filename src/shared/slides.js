export const MAX_TOPICS = 8;

// The deck cannot say what the user did with it, so this is the only text the user's choice decides.
// Each starts with a verb the built-in rules already keep as written.
const WORK = {
  attended: t => t ? `Attended the presentation on ${t}` : "Attended the presentation",
  presented: t => t ? `Presented on ${t}` : "Presented the presentation",
  studied: t => t ? `Studied the presentation on ${t}` : "Studied the presentation"
};
export const SLIDE_ROLES = Object.keys(WORK);

// Slides that are on every deck and say nothing about the topic.
const GENERIC = /^(agenda|outline|summary|homework|q\s*&\s*a|questions?(\s+and\s+answers?)?|thank\s*you|thanks)\W*$/i;
export const isGenericTitle = title => GENERIC.test(title);

export const titleKey = s => s.trim().toLowerCase().replace(/\s+/g, " ");
const nameOf = file => String(file || "").split(/[\\/]/).pop().replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

// What the app can write without any AI: the user's part, and the slide titles as topics.
export function builtInDraft(deck, role, fileName = "") {
  if (!WORK[role]) throw new Error("Unknown role.");
  const title = deck.title?.trim() || nameOf(fileName);
  // The title slide repeats the deck title, so the deck title counts as already listed.
  const seen = new Set(title ? [titleKey(title)] : []);
  const topics = [];
  for (const s of deck.slides) {
    const t = s.title?.trim();
    if (!t || isGenericTitle(t) || seen.has(titleKey(t))) continue;
    seen.add(titleKey(t));
    topics.push(t);
  }
  return { work: [WORK[role](title)], topics: topics.slice(0, MAX_TOPICS), tomorrow: [] };
}

// Adds the draft below what the user already typed. Nothing typed is changed or removed, and an item
// already in the same field word for word is not added again, so importing a deck twice is safe.
export function mergeNotes(notes, draft) {
  const out = { ...notes };
  for (const [field, items] of Object.entries(draft)) {
    const have = String(notes[field] || "");
    const seen = new Set(have.split(/\r?\n/).map(l => l.trim()));
    const add = [];
    for (const raw of items) {
      const item = raw.trim();
      if (item && !seen.has(item)) { seen.add(item); add.push(item); }
    }
    if (add.length) out[field] = have.trim() ? have + (have.endsWith("\n") ? "" : "\n") + add.join("\n") : add.join("\n");
  }
  return out;
}
