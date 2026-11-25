import { inventsFacts, contentStems } from "./check.js";
import { MAX_TOPICS, isGenericTitle, titleKey } from "../shared/slides.js";

// Same names as the note fields, so a checked reply merges straight into them.
// Only these two: a deck says what was taught, not what is unfinished or blocking (a small model files lessons there).
export const SLIDE_KEYS = ["topics", "tomorrow"];

// Under the 8000 characters a cloud service gets, and small enough for a local model's context.
export const MAX_DECK_CHARS = 6000;
const LINE_MAX = 200;

const list = { type: "array", items: { type: "string" }, maxItems: MAX_TOPICS };
export const SLIDE_SCHEMA = { type: "object", properties: Object.fromEntries(SLIDE_KEYS.map(k => [k, list])), required: SLIDE_KEYS, additionalProperties: false };

export const SORT_PROMPT = `You turn the text of a presentation's slides into rough notes for a trainee developer's daily status email.
Rules:
- topics: group the slides into at most 8 topics the presentation covered. Each topic is a short phrase of 3 to 10 words in the slides' own words, like a note a trainee would type, for example "Spring Security authentication and roles". No full sentences, no full stop at the end. Agenda, summary, question and homework slides are not topics.
- tomorrow: fill it only when a slide clearly states it, and copy the slide's own wording. Otherwise leave it empty.
- tomorrow is homework, exercises, reading or the next session: homework and next steps always go in tomorrow.
- Never add numbers, names, tools, results or reasons that the slides do not state.
- Keep any text in square brackets, such as [EMAIL_1] or [NAME_2], exactly as written.
Return ONLY JSON with exactly these keys, each an array of strings:
{"topics":[],"tomorrow":[]}

Slides:
`;

export const LOCAL_SORT_PROMPT = `You turn the text of presentation slides into rough notes for a trainee's daily status email.
- topics: group the slides into at most 8 topics. Each is a short phrase of 3 to 10 words in the slides' own words, not a sentence. Agenda, summary, question and homework slides are not topics.
- tomorrow: fill it only when a slide clearly states it. Otherwise leave it empty.
- Homework and next steps always go in tomorrow.
- Never add numbers, names or tools the slides do not mention.
Reply only with JSON: {"topics":[],"tomorrow":[]}
`;

// The text the AI reads. A deck over the limit loses lines from every slide before it loses any slide title.
export function deckText(deck, limit = MAX_DECK_CHARS) {
  const clip = s => String(s).slice(0, LINE_MAX);
  const build = perSlide => [
    deck.title && `Presentation: ${clip(deck.title)}`,
    ...deck.slides.flatMap((s, i) => [`Slide ${i + 1}:${s.title ? " " + clip(s.title) : ""}`, ...s.lines.slice(0, perSlide).map(l => "- " + clip(l))])
  ].filter(Boolean).join("\n");
  for (const n of [Infinity, 6, 4, 3, 2, 1, 0]) {
    const text = build(n);
    if (text.length <= limit) return text;
  }
  const head = build(0).slice(0, limit + 1);
  return head.slice(0, Math.max(head.lastIndexOf("\n"), 0));
}

// Everything the deck says, uncut: what an item may draw on.
export const factsOf = deck => [deck.title, ...deck.slides.flatMap(s => [s.title, ...s.lines])].filter(Boolean).join("\n");

// An item is grounded when at least half of its content words appear in the deck.
const grounded = (item, deckStems) => {
  const own = contentStems(item);
  return !own.length || own.filter(w => deckStems.has(w)).length * 2 >= own.length;
};

// When the model repeats an item in both fields, tomorrow keeps it: a small model often lists homework as a topic too.
const KEEP_IN = ["tomorrow", "topics"];

// Keeps the items the deck supports: no new numbers or names, and about something it mentions.
// An item that is a generic slide title, or a topic that is the title slide, is left out without being counted.
export function checkItems(parsed, facts, deckTitle = "") {
  const deckStems = new Set(contentStems(facts));
  const title = titleKey(deckTitle);
  const seen = new Set();
  const items = Object.fromEntries(SLIDE_KEYS.map(k => [k, []]));
  let total = 0, dropped = 0;
  for (const k of KEEP_IN) {
    for (const raw of parsed[k] || []) {
      const item = raw.trim().replace(/\s+/g, " ");
      if (!item) continue;
      if (isGenericTitle(item) || (k === "topics" && titleKey(item) === title)) continue;
      total++;
      if (inventsFacts(facts, item) || !grounded(item, deckStems)) { dropped++; continue; }
      if (seen.has(item.toLowerCase())) continue;
      seen.add(item.toLowerCase());
      items[k].push(item);
    }
    items[k] = items[k].slice(0, MAX_TOPICS);
  }
  return { items, total, dropped };
}
