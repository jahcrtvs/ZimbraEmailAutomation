import { describe, it, expect } from "vitest";
import { SLIDE_KEYS, SLIDE_SCHEMA, SORT_PROMPT, LOCAL_SORT_PROMPT, MAX_DECK_CHARS, deckText, factsOf, checkItems } from "../../../src/main/slidesort.js";
import { parseReply } from "../../../src/main/reply.js";
import { runLocal } from "../../../src/main/localai.js";
import { MAX_TOPICS } from "../../../src/shared/slides.js";
import { MAX_CLOUD_CHARS } from "../../../src/shared/sanitize.js";

const local = { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" };
const chat = c => ({ ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ choices: [{ message: { content: typeof c === "string" ? c : JSON.stringify(c) } }] }) });

describe("deckText", () => {
  it("lists the presentation title, then each slide with its number, title and lines", () => {
    const deck = { title: "Deck", slides: [{ title: "A", lines: ["x", "y"] }, { title: "B", lines: [] }] };
    expect(deckText(deck)).toBe("Presentation: Deck\nSlide 1: A\n- x\n- y\nSlide 2: B");
  });
  it("leaves out the presentation line when there is no title, and the colon for a slide without one", () => {
    expect(deckText({ title: "", slides: [{ title: "", lines: ["only a body"] }] })).toBe("Slide 1:\n- only a body");
  });
  it("is under the cloud limit, so the sanitiser never blocks a deck for length", () => {
    expect(MAX_DECK_CHARS).toBeLessThan(MAX_CLOUD_CHARS);
  });
  it("drops lines before titles when the deck is too long", () => {
    const slides = Array.from({ length: 100 }, (_, i) => ({ title: "Title " + (i + 1), lines: Array.from({ length: 5 }, (_, j) => `line ${j} of slide ${i + 1} with some padding text`) }));
    const text = deckText({ title: "Big", slides }, 3000);
    expect(text.length).toBeLessThanOrEqual(3000);
    const shown = new Set(text.split("\n"));
    for (let i = 1; i <= 100; i++) expect(shown.has(`Slide ${i}: Title ${i}`)).toBe(true);
  });
  it("keeps every line of a deck that fits", () => {
    const slides = Array.from({ length: 10 }, (_, i) => ({ title: "T" + i, lines: ["a", "b", "c", "d", "e", "f", "g", "h"] }));
    expect(deckText({ title: "Small", slides }).match(/^- /gm)).toHaveLength(80);
  });
  it("cuts at a whole line when even the titles do not fit", () => {
    const slides = Array.from({ length: 500 }, (_, i) => ({ title: "Title " + (i + 1), lines: [] }));
    const text = deckText({ title: "Huge", slides }, 1000);
    const all = new Set(["Presentation: Huge", ...slides.map((s, i) => `Slide ${i + 1}: ${s.title}`)]);
    expect(text.length).toBeLessThanOrEqual(1000);
    expect(all.has(text.split("\n").at(-1))).toBe(true);
  });
  it("clips a very long line", () => {
    const text = deckText({ title: "", slides: [{ title: "T", lines: ["a".repeat(500)] }] });
    expect(text.split("\n")[1]).toBe("- " + "a".repeat(200));
  });
});

describe("factsOf", () => {
  it("is every title and line, not cut", () => {
    const slides = Array.from({ length: 400 }, (_, i) => ({ title: "Title " + i, lines: ["a long line of text number " + i + " ".repeat(10) + "end"] }));
    const facts = factsOf({ title: "Deck", slides });
    expect(facts.length).toBeGreaterThan(MAX_DECK_CHARS);
    expect(facts).toContain("Deck");
    expect(facts).toContain("Title 399");
    expect(facts).toContain("text number 399");
  });
});

describe("checkItems", () => {
  const facts = factsOf({ title: "Spring Security", slides: [{ title: "Authentication", lines: ["Login form", "Password encoding with BCrypt"] }, { title: "Homework", lines: ["Practice JWT login"] }] });
  const run = parsed => checkItems(parsed, facts, "Spring Security");

  it("keeps items that come from the deck, trimmed", () => {
    const { items, total, dropped } = run({ topics: ["  Authentication and password encoding "], tomorrow: ["Practice JWT login"] });
    expect(items).toEqual({ topics: ["Authentication and password encoding"], tomorrow: ["Practice JWT login"] });
    expect([total, dropped]).toEqual([2, 0]);
  });
  it("drops an item with a number the deck does not have", () => {
    const { items, dropped } = run({ topics: ["Spring Security 6 migration", "Authentication form"] });
    expect(items.topics).toEqual(["Authentication form"]);
    expect(dropped).toBe(1);
  });
  it("drops an item with a capitalised name the deck does not have", () => {
    expect(run({ topics: ["Authentication with Okta"] }).items.topics).toEqual([]);
  });
  it("drops an item about something the deck never mentions", () => {
    expect(run({ topics: ["Kubernetes deployment pipelines"] }).items.topics).toEqual([]);
  });
  it("ignores empty items, repeated items (any case), and missing keys", () => {
    const { items, total } = run({ topics: ["", "  ", "Login form", "login FORM"] });
    expect(items).toEqual({ topics: ["Login form"], tomorrow: [] });
    expect(total).toBe(2);
  });
  it("leaves out topics that are the deck title or a generic slide, without counting them", () => {
    const { items, total, dropped } = run({ topics: ["Spring Security", "spring  security", "Questions?", "Homework", "Summary", "Authentication form"] });
    expect(items.topics).toEqual(["Authentication form"]);
    expect([total, dropped]).toEqual([1, 0]);
  });
  it("leaves a generic slide title out of tomorrow too, without counting it", () => {
    const { items, total } = run({ tomorrow: ["Questions?", "Homework", "Practice JWT login"] });
    expect(items.tomorrow).toEqual(["Practice JWT login"]);
    expect(total).toBe(1);
  });
  it("keeps an item in tomorrow when the model repeats it in topics", () => {
    const { items } = run({ topics: ["Practice JWT login", "Login form"], tomorrow: ["practice jwt LOGIN"] });
    expect(items.tomorrow).toEqual(["practice jwt LOGIN"]);
    expect(items.topics).toEqual(["Login form"]);
  });
  it("ignores progress and blockers from the model, without counting them", () => {
    const { items, total, dropped } = run({ topics: ["Login form"], progress: ["Login form 2"], blockers: ["Password encoding"] });
    expect(items).toEqual({ topics: ["Login form"], tomorrow: [] });
    expect([total, dropped]).toEqual([1, 0]);
  });
  it(`keeps at most ${MAX_TOPICS} items per field`, () => {
    const many = factsOf({ title: "", slides: Array.from({ length: 12 }, (_, i) => ({ title: "Topic " + (i + 1), lines: [] })) });
    const { items } = checkItems({ topics: Array.from({ length: 12 }, (_, i) => "Topic " + (i + 1)) }, many);
    expect(items.topics).toHaveLength(MAX_TOPICS);
    expect(items.topics[0]).toBe("Topic 1");
  });
});

describe("prompts and schema", () => {
  it("name the two fields and ask for at most 8 topics", () => {
    for (const p of [SORT_PROMPT, LOCAL_SORT_PROMPT]) {
      expect(p).toContain('{"topics":[],"tomorrow":[]}');
      expect(p).toContain("at most 8");
    }
  });
  it("do not mention progress or blockers", () => {
    for (const p of [SORT_PROMPT, LOCAL_SORT_PROMPT]) expect(p).not.toMatch(/progress|blocker/i);
  });
  it("tell the model to leave tomorrow empty unless a slide says so, and not to invent", () => {
    for (const p of [SORT_PROMPT, LOCAL_SORT_PROMPT]) {
      expect(p).toMatch(/only when a slide/i);
      expect(p).toMatch(/never (add|invent)/i);
    }
  });
  it("send homework and next steps to tomorrow, and keep agenda, summary and question slides out of topics", () => {
    for (const p of [SORT_PROMPT, LOCAL_SORT_PROMPT]) {
      expect(p).toMatch(/homework[^.]*tomorrow/i);
      expect(p).toMatch(/not (as )?topics|never (as )?topics|not in topics/i);
    }
  });
  it("keep the local prompt shorter than the cloud one and free of the slides marker, so it can be cached", () => {
    expect(LOCAL_SORT_PROMPT.length).toBeLessThan(SORT_PROMPT.length);
    expect(LOCAL_SORT_PROMPT).not.toContain("Slides:");
  });
  it("schema is a list of text per field, at most 8 each", () => {
    expect(SLIDE_KEYS).toEqual(["topics", "tomorrow"]);
    expect(SLIDE_SCHEMA.required).toEqual(SLIDE_KEYS);
    expect(SLIDE_SCHEMA.additionalProperties).toBe(false);
    for (const k of SLIDE_KEYS) expect(SLIDE_SCHEMA.properties[k]).toEqual({ type: "array", items: { type: "string" }, maxItems: 8 });
  });
});

describe("parseReply with other keys", () => {
  it("reads only the keys it is given and treats a missing key as empty", () => {
    expect(parseReply('{"topics":["A"],"tomorrow":["B"],"tasks":["ignored"]}', "X", SLIDE_KEYS)).toEqual({ topics: ["A"], tomorrow: ["B"] });
  });
  it("still fails when every list is empty", () => {
    expect(() => parseReply('{"topics":[]}', "X", SLIDE_KEYS)).toThrow(/no items/);
  });
});

describe("runLocal with its own schema and parser", () => {
  const f = reply => { const calls = []; const fn = async (url, init) => { calls.push(JSON.parse(init.body)); return reply(calls.length); }; fn.calls = calls; return fn; };
  it("sends the given schema and returns what the given parser makes of the reply", async () => {
    const fetchImpl = f(() => chat({ topics: ["A"], tomorrow: [] }));
    const out = await runLocal({ fetchImpl, local, text: "t", schema: SLIDE_SCHEMA, parse: r => parseReply(r, "The local model", SLIDE_KEYS) });
    expect(out.topics).toEqual(["A"]);
    expect(fetchImpl.calls[0].response_format.json_schema.schema).toEqual(SLIDE_SCHEMA);
  });
  it("asks once more when the given parser rejects the reply", async () => {
    const fetchImpl = f(n => chat(n === 1 ? "nope" : { topics: ["A"] }));
    const out = await runLocal({ fetchImpl, local, text: "t", schema: SLIDE_SCHEMA, parse: r => parseReply(r, "The local model", SLIDE_KEYS) });
    expect(out.topics).toEqual(["A"]);
    expect(fetchImpl.calls).toHaveLength(2);
  });
});
