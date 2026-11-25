import { describe, it, expect, beforeEach } from "vitest";
import { createGenerator } from "../../../src/main/generate.js";
import { SLIDE_SCHEMA, LOCAL_SORT_PROMPT, MAX_DECK_CHARS } from "../../../src/main/slidesort.js";
import { builtInDraft, MAX_TOPICS } from "../../../src/shared/slides.js";

const res = (body, status = 200, statusText = "OK") => ({ ok: status < 400, status, statusText, text: async () => typeof body === "string" ? body : JSON.stringify(body) });
const asText = c => typeof c === "string" ? c : JSON.stringify(c);
const chat = c => res({ choices: [{ message: { content: asText(c) } }] });
const down = () => new TypeError("fetch failed");

const DECK = {
  title: "Spring Security",
  slides: [
    { title: "Spring Security", lines: ["Day 3"] },
    { title: "Authentication", lines: ["Login form", "Password encoding with BCrypt"] },
    { title: "Roles and permissions", lines: ["Role based access", "Method security"] },
    { title: "Homework", lines: ["Practice JWT login tomorrow"] }
  ]
};
const EMAIL_DECK = { ...DECK, slides: [...DECK.slides, { title: "Contact", lines: ["Email boss@corp.example for the slides"] }] };
const GOOD = { topics: ["Authentication and password encoding", "Roles and method security"], progress: [], blockers: [], tomorrow: ["Practice JWT login"] };
const WORK = ["Attended the presentation on Spring Security"];

const aiSettings = (over = {}) => ({
  local: { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" },
  fallback: { provider: "groq", auto: false }, geminiModel: "flash", privacyTerms: "", ...over
});
const REMOTE = { baseUrl: "http://192.168.1.5:11434/v1", model: "qwen2.5:3b-instruct" };

let calls, entries;
beforeEach(() => { calls = []; entries = []; });
const audit = { record: e => entries.push(e) };
const route = ({ local = () => chat(GOOD), groq = () => chat(GOOD) } = {}) => async (url, init) => {
  calls.push({ url, init, body: JSON.parse(init.body) });
  const h = url.includes("localhost") || url.includes("192.168") ? local : url.includes("groq.com") ? groq : null;
  if (!h) throw new Error("unexpected url " + url);
  const x = h(url, init);
  if (x instanceof Error) throw x;
  return x;
};
const gen = (routes, keys = {}, extra = {}) => createGenerator({ getKey: p => keys[p] ?? null, fetchImpl: route(routes), sleep: async () => {}, audit, ...extra });
const sort = (g, over = {}) => g.sortSlides({ deck: DECK, role: "attended", fileName: "spring.pptx", profile: { name: "Mark Anton Cruz", role: "CDP Trainee" }, ai: aiSettings(), ...over });
const hits = name => calls.filter(c => c.url.includes(name));
const userText = c => c.body.messages.at(-1).content;

describe("sortSlides: local AI", () => {
  it("fills topics and stated items from the local model and writes Today's Work itself", async () => {
    const r = await sort(gen());
    expect(r).toEqual({ status: "ok", source: "local", note: null, draft: { work: WORK, topics: GOOD.topics, progress: [], blockers: [], tomorrow: ["Practice JWT login"] } });
    expect(calls).toHaveLength(1);
    expect(entries).toEqual([]);
  });
  it("never fills Still Working On or Blockers, even when the model returns items for them", async () => {
    const r = await sort(gen({ local: () => chat({ ...GOOD, progress: ["Authentication"], blockers: ["Roles and method security"] }) }));
    expect(r.draft.progress).toEqual([]);
    expect(r.draft.blockers).toEqual([]);
    expect(r.draft.topics).toEqual(GOOD.topics);
    expect(r.note).toBeNull();
  });
  it("sends the deck text, the slide prompt and the slide schema to the local model, as is", async () => {
    await sort(gen(), { deck: EMAIL_DECK });
    const { body } = calls[0];
    expect(body.messages[0]).toEqual({ role: "system", content: LOCAL_SORT_PROMPT });
    expect(userText(calls[0])).toMatch(/^Slides:\nPresentation: Spring Security\nSlide 1: Spring Security\n- Day 3\n/);
    expect(userText(calls[0])).toContain("boss@corp.example");
    expect(body.response_format.json_schema.schema).toEqual(SLIDE_SCHEMA);
  });
  it("keeps the text it sends within the limit for a very long deck", async () => {
    const slides = Array.from({ length: 300 }, (_, i) => ({ title: "Title " + i, lines: Array.from({ length: 6 }, (_, j) => `line ${j} about slide ${i} padding padding padding`) }));
    await sort(gen(), { deck: { title: "Big", slides } });
    expect(userText(calls[0]).length).toBeLessThanOrEqual("Slides:\n".length + MAX_DECK_CHARS);
  });
  it("drops an item that adds a number, and says so", async () => {
    const r = await sort(gen({ local: () => chat({ ...GOOD, topics: [GOOD.topics[0], "Spring Security 6 migration"] }) }));
    expect(r.source).toBe("local");
    expect(r.draft.topics).toEqual([GOOD.topics[0]]);
    expect(r.note).toMatch(/1 of 3 items were left out/);
  });
  it("drops an item about something the deck never mentions", async () => {
    const r = await sort(gen({ local: () => chat({ ...GOOD, topics: ["Kubernetes deployment pipelines", GOOD.topics[1]] }) }));
    expect(r.draft.topics).toEqual([GOOD.topics[1]]);
    expect(r.note).toMatch(/1 of 3 items/);
  });
  it("does not list the title slide, a generic slide or the homework slide as a topic", async () => {
    const r = await sort(gen({ local: () => chat({ topics: ["Spring Security", "Homework", "Authentication and password encoding"], progress: [], blockers: [], tomorrow: [] }) }));
    expect(r.draft.topics).toEqual(["Authentication and password encoding"]);
    expect(r.note).toBeNull();
  });
  it("uses the slide titles for topics when the model gives none that can be used, and keeps its other items", async () => {
    const r = await sort(gen({ local: () => chat({ topics: [], progress: [], blockers: [], tomorrow: ["Practice JWT login"] }) }));
    expect(r.source).toBe("local");
    expect(r.draft.topics).toEqual(["Authentication", "Roles and permissions"]);
    expect(r.draft.tomorrow).toEqual(["Practice JWT login"]);
    expect(r.note).toBeNull();
  });
  it("uses the built-in rules, and says the AI was not used, when no item can be used", async () => {
    const r = await sort(gen({ local: () => chat({ topics: ["Kubernetes deployment pipelines"], progress: [], blockers: [], tomorrow: [] }) }));
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/could not be used/);
    expect(r.draft).toEqual(builtInDraft(DECK, "attended", "spring.pptx"));
  });
  it("keeps an item once and at most 8 per field", async () => {
    const slides = Array.from({ length: 12 }, (_, i) => ({ title: "Topic " + (i + 1), lines: [] }));
    const topics = ["Topic 1", "topic 1", ...slides.map(s => s.title)];
    const r = await sort(gen({ local: () => chat({ topics, progress: [], blockers: [], tomorrow: [] }) }), { deck: { title: "Many", slides } });
    expect(r.draft.topics).toHaveLength(MAX_TOPICS);
    expect(new Set(r.draft.topics.map(t => t.toLowerCase())).size).toBe(MAX_TOPICS);
  });
  it("starts an installed Ollama that is not running and asks again", async () => {
    let up = false, started = 0;
    const g = gen({ local: () => (up ? chat(GOOD) : down()) }, {}, { startLocal: async () => { started++; up = true; return true; } });
    const r = await sort(g);
    expect(started).toBe(1);
    expect(r.source).toBe("local");
  });
  it("rejects a role it does not know", async () => {
    await expect(sort(gen(), { role: "watched" })).rejects.toThrow(/role/i);
  });
});

describe("sortSlides: no AI", () => {
  const builtIn = builtInDraft(DECK, "attended", "spring.pptx");

  it("uses the built-in rules without any request when the user chose not to send the slides", async () => {
    const r = await sort(gen(), { mode: "template" });
    expect(r).toMatchObject({ status: "ok", source: "template", draft: builtIn });
    expect(r.note).toMatch(/chose not to send/);
    expect(calls).toHaveLength(0);
  });
  it("uses the built-in rules, with the reason, when the local model fails and there is no cloud fallback", async () => {
    const r = await sort(gen({ local: down }));
    expect(r).toMatchObject({ status: "ok", source: "template", draft: builtIn });
    expect(r.note).toMatch(/Could not reach the local AI server/);
    expect(r.note).toMatch(/No cloud fallback/);
  });
  it("treats provider none as no fallback even when a key is saved", async () => {
    const r = await sort(gen({ local: down }, { groq: "KEY" }), { ai: aiSettings({ fallback: { provider: "none", auto: true } }) });
    expect(r.source).toBe("template");
    expect(hits("groq.com")).toHaveLength(0);
  });
  it("uses the built-in rules when the model returns nothing usable twice", async () => {
    const r = await sort(gen({ local: () => chat({ topics: [], progress: [], blockers: [], tomorrow: [] }) }));
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/did not return a usable reply/);
    expect(r.draft).toEqual(builtIn);
  });
});

describe("sortSlides: cloud fallback", () => {
  const failing = { local: down };
  const auto = aiSettings({ fallback: { provider: "groq", auto: true } });

  it("asks for consent, showing the sanitised text, and sends nothing", async () => {
    const r = await sort(gen(failing, { groq: "KEY" }), { deck: EMAIL_DECK });
    expect(r).toMatchObject({ status: "needs-consent", provider: "groq", failure: { code: "UNREACHABLE" } });
    expect(r.preview.text).toContain("[EMAIL_1]");
    expect(r.preview.text).not.toContain("boss@corp.example");
    expect(r.preview.chars).toBe(r.preview.text.length);
    expect(hits("groq.com")).toHaveLength(0);
    expect(entries).toEqual([]);
  });
  it("sends sanitised text once the user agrees, restores what the model returns, and records it", async () => {
    const reply = { topics: ["Authentication with [EMAIL_1]"], progress: [], blockers: [], tomorrow: [] };
    const r = await sort(gen({ groq: () => chat(reply) }, { groq: "KEY" }), { deck: EMAIL_DECK, mode: "cloud" });
    expect(hits("localhost")).toHaveLength(0);
    const sent = hits("groq.com")[0].init.body;
    expect(sent).toContain("[EMAIL_1]");
    expect(sent).not.toContain("boss@corp.example");
    expect(r).toMatchObject({ status: "ok", source: "groq" });
    expect(r.draft.topics).toEqual(["Authentication with boss@corp.example"]);
    expect(r.draft.work).toEqual(WORK);
    expect(entries).toEqual([{ provider: "groq", reason: "user-requested", chars: expect.any(Number) }]);
  });
  it("sends without asking when the user opted in, and records why the local model was not used", async () => {
    const r = await sort(gen(failing, { groq: "KEY" }), { ai: auto });
    expect(r).toMatchObject({ status: "ok", source: "groq" });
    expect(r.draft.topics).toEqual(GOOD.topics);
    expect(entries).toEqual([{ provider: "groq", reason: "UNREACHABLE", chars: expect.any(Number) }]);
  });
  it("checks what the cloud returns the same way", async () => {
    const r = await sort(gen({ ...failing, groq: () => chat({ ...GOOD, topics: ["Spring Security 6 migration", GOOD.topics[0]] }) }, { groq: "KEY" }), { ai: auto });
    expect(r.draft.topics).toEqual([GOOD.topics[0]]);
    expect(r.note).toMatch(/1 of 3 items/);
  });
  it("uses the built-in rules and does not send when the slides look like they hold a secret", async () => {
    const deck = { ...DECK, slides: [...DECK.slides, { title: "Config", lines: ["password: hunter2"] }] };
    const r = await sort(gen(failing, { groq: "KEY" }), { deck, ai: auto });
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/The slides appear to contain a password or secret/);
    expect(hits("groq.com")).toHaveLength(0);
  });
  it("uses the built-in rules, with the provider's error, when the cloud request fails", async () => {
    const r = await sort(gen({ ...failing, groq: () => res("boom", 500, "Internal Server Error") }, { groq: "KEY" }), { ai: auto });
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/Groq failed/);
    expect(r.note).toMatch(/built-in text rules were used/);
  });
});

describe("sortSlides: AI server that is not on this computer", () => {
  it("sends sanitised text and restores the items", async () => {
    const reply = { topics: ["Authentication with [EMAIL_1]"], progress: [], blockers: [], tomorrow: [] };
    const r = await sort(gen({ local: () => chat(reply) }), { deck: EMAIL_DECK, ai: aiSettings({ local: REMOTE }) });
    expect(calls).toHaveLength(1);
    expect(calls[0].init.body).not.toContain("boss@corp.example");
    expect(userText(calls[0])).toContain("[EMAIL_1]");
    expect(calls[0].body.messages[0].content).toMatch(/square brackets/);
    expect(r.source).toBe("local");
    expect(r.draft.topics).toEqual(["Authentication with boss@corp.example"]);
  });
  it("sends nothing and uses the built-in rules when the slides look like they hold a secret", async () => {
    const deck = { ...DECK, slides: [...DECK.slides, { title: "Config", lines: ["password: hunter2"] }] };
    const r = await sort(gen(), { deck, ai: aiSettings({ local: REMOTE }) });
    expect(calls).toHaveLength(0);
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/The slides appear to contain a password or secret/);
    expect(r.note).toMatch(/not on this computer/);
  });
});
