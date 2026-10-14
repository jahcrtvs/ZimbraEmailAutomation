import { describe, it, expect, beforeEach } from "vitest";
import { createGenerator, GROQ_MODEL, MODEL_IDS } from "../../../src/main/generate.js";
import { DEFAULT_TEMPLATE, SAMPLE_NOTES, noteItems } from "../../../src/shared/report.js";

const res = (body, status = 200, statusText = "OK") => ({ ok: status < 400, status, statusText, text: async () => typeof body === "string" ? body : JSON.stringify(body) });
const asText = c => typeof c === "string" ? c : JSON.stringify(c);
const chat = c => res({ choices: [{ message: { content: asText(c) } }] });
const geminiReply = c => res({ candidates: [{ content: { parts: [{ text: asText(c) }] } }] });
const good = { tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [] };
const down = () => new TypeError("fetch failed");

const aiSettings = (over = {}) => ({
  local: { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" },
  fallback: { provider: "groq", auto: false }, geminiModel: "flash", privacyTerms: "", ...over
});
const NOTES = { ...SAMPLE_NOTES, work: SAMPLE_NOTES.work + "\nemailed boss@corp.example about it\nasked Cruz for review" };
const aligned = (notes, over = {}) => {
  const it = noteItems(notes);
  return { tasks: it.tasks.map(x => `Worked on ${x}.`), topics: it.topics.map(x => `Studied ${x}.`), weekly_plans: it.weekly_plans.map(x => `Continue ${x}.`), blockers: it.blockers.map(x => `Blocked by ${x}.`), ...over };
};
const two = { work: "fixed login\nwrote tests", topics: "", progress: "", blockers: "", tomorrow: "" };
const enc = new TextEncoder();
const sse = (...parts) => {
  const queue = parts.map(p => p instanceof Error ? p : enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`));
  let i = 0;
  return { ok: true, status: 200, statusText: "OK", body: { getReader: () => ({ read: async () => {
    if (i >= queue.length) return { done: true };
    const x = queue[i++]; if (x instanceof Error) throw x; return { done: false, value: x };
  } }) } };
};
const payload = (over = {}) => ({ notes: NOTES, template: DEFAULT_TEMPLATE, profile: { name: "Mark Justine Dela Cruz", role: "CDP Trainee" }, date: "2026-10-08", dateFormat: "long", ai: aiSettings(), ...over });

let calls, entries;
beforeEach(() => { calls = []; entries = []; });
const audit = { record: e => entries.push(e) };
const route = ({ local = () => chat(aligned(NOTES)), groq = () => chat(good), gemini = () => geminiReply(good) } = {}) => async (url, init) => {
  calls.push({ url, init });
  const h = url.includes("localhost") ? local : url.includes("groq.com") ? groq : url.includes("googleapis") ? gemini : null;
  if (!h) throw new Error("unexpected url " + url);
  const x = h(url, init);
  if (x instanceof Error) throw x;
  return x;
};
const gen = (routes, keys = {}, extra = {}) => createGenerator({ getKey: p => keys[p] ?? null, fetchImpl: route(routes), sleep: async () => {}, audit, ...extra });
const hits = name => calls.filter(c => c.url.includes(name));
const taskItems = r => r.blocks.find(b => b.title === "TASK TODAY").items;

describe("local first", () => {
  it("uses the local model, never touches the cloud or asks for a key", async () => {
    const asked = [];
    const g = createGenerator({ getKey: p => { asked.push(p); return "KEY"; }, fetchImpl: route(), audit });
    const r = await g.generate(payload());
    expect(r).toMatchObject({ status: "ok", source: "local", note: null });
    expect(taskItems(r)).toEqual(aligned(NOTES).tasks);
    expect(r.blocks[r.blocks.length - 1]).toEqual({ type: "text", text: "CDP Trainee" });
    expect(calls.map(c => c.url)).toEqual(["http://localhost:11434/v1/chat/completions"]);
    expect(asked).toEqual([]);
    expect(entries).toEqual([]);
  });
  it("sends the raw notes to the local model", async () => {
    await gen().generate(payload());
    expect(JSON.parse(calls[0].init.body).messages.at(-1).content).toContain("boss@corp.example");
  });
  it("uses the built-in rules, with the reason, when local fails and no cloud fallback is set up", async () => {
    const r = await gen({ local: down }).generate(payload());
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/Could not reach the local AI server/);
    expect(r.note).toMatch(/No cloud fallback/);
    expect(r.blocks[0].items[0]).toBe("Worked on Hibernate.");
    expect(hits("groq.com")).toHaveLength(0);
  });
  it("treats provider none as no fallback even when a key is saved", async () => {
    const r = await gen({ local: down }, { groq: "KEY" }).generate(payload({ ai: aiSettings({ fallback: { provider: "none", auto: true } }) }));
    expect(r.source).toBe("template");
    expect(hits("groq.com")).toHaveLength(0);
  });
});

describe("local quality", () => {
  const history = [{ status: "sent", notes: { work: "fixed login", topics: "", progress: "", blockers: "", tomorrow: "" }, blocks: [{ type: "section", title: "TASK TODAY", items: ["Fixed the login page."] }] }];
  const local = reply => () => chat(reply);

  it("shows examples from sent history as an earlier exchange and asks for one sentence per item", async () => {
    await gen({ local: local(aligned(two)) }).generate(payload({ notes: two, history }));
    const body = JSON.parse(calls[0].init.body);
    const [rules, exUser, exReply, last] = body.messages;
    expect(body.messages).toHaveLength(4);
    expect(rules.role).toBe("system");
    expect(exUser).toMatchObject({ role: "user" });
    expect(exUser.content).toContain("Today's Work:\nfixed login");
    expect(exReply.role).toBe("assistant");
    expect(JSON.parse(exReply.content).tasks).toContainEqual({ note: "fixed login", sentence: "Fixed the login page." });
    expect(last.role).toBe("user");
    expect(last.content).toContain("Today's Work:\nfixed login\nwrote tests");
    expect(body.response_format.json_schema.schema.properties.tasks).toMatchObject({ minItems: 2, maxItems: 2 });
    expect(body.response_format.json_schema.schema.properties.topics).toMatchObject({ minItems: 0, maxItems: 0 });
  });
  it("replaces only a sentence that invents a number, and says so", async () => {
    const r = await gen({ local: local(aligned(two, { tasks: ["Fixed the login bug within 3 hours.", "Wrote the unit tests."] })) }).generate(payload({ notes: two }));
    expect(r.source).toBe("local");
    expect(taskItems(r)).toEqual(["Fixed login.", "Wrote the unit tests."]);
    expect(r.note).toMatch(/1 of 2 sentences use the built-in rules/);
  });
  it("uses the built-in rules and says the AI was not used when every sentence is rejected", async () => {
    const r = await gen({ local: local(aligned(two, { tasks: ["Fixed login in 3 hours.", "Wrote 5 tests."] })) }).generate(payload({ notes: two }));
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/could not be used/);
    expect(taskItems(r)).toEqual(["Fixed login.", "Wrote tests."]);
  });
  it("uses the built-in rules for a section when the model returns the wrong number of sentences", async () => {
    const r = await gen({ local: local(aligned(two, { tasks: ["Fixed the login page."] })) }).generate(payload({ notes: two }));
    expect(r.source).toBe("template");
    expect(taskItems(r)).toEqual(["Fixed login.", "Wrote tests."]);
  });
  it("streams sentences to onProgress and keeps what arrived if the connection drops", async () => {
    const seen = [];
    const r = await gen({ local: () => sse('{"tasks":["Fixed the login page.","Wro', new Error("socket closed")) }).generate(payload({ notes: two, onProgress: p => seen.push(p) }));
    expect(seen).toEqual([{ section: "tasks", sentence: "Fixed the login page." }]);
    expect(r.source).toBe("local");
    expect(taskItems(r)).toEqual(["Fixed the login page.", "Wrote tests."]);
    expect(r.note).toMatch(/1 of 2 sentences/);
  });
  it("reports progress for a complete streamed reply and sends stream: true", async () => {
    const seen = [];
    const full = JSON.stringify(aligned(two));
    const r = await gen({ local: () => sse(full.slice(0, 20), full.slice(20)) }).generate(payload({ notes: two, onProgress: p => seen.push(p.sentence) }));
    expect(seen).toEqual(aligned(two).tasks);
    expect(r.note).toBeNull();
    expect(JSON.parse(calls[0].init.body).stream).toBe(true);
  });
  it("never puts history or examples in a cloud request", async () => {
    const secret = [{ status: "sent", notes: { work: "fixed login", topics: "", progress: "", blockers: "", tomorrow: "" }, blocks: [{ type: "section", title: "TASK TODAY", items: ["SECRET SENTENCE about Project Orion."] }] }];
    await gen({}, { groq: "K" }).generate(payload({ mode: "cloud", notes: two, history: secret }));
    await gen({ local: down }, { groq: "K" }).generate(payload({ notes: two, history: secret, ai: aiSettings({ fallback: { provider: "groq", auto: true } }) }));
    expect(hits("groq.com")).toHaveLength(2);
    for (const c of hits("groq.com")) expect(c.init.body).not.toMatch(/SECRET SENTENCE|Orion|=>/);
  });
  it("exposes warmUp for the stored local settings", async () => {
    const g = gen({ local: () => chat("ok") });
    await g.warmUp(aiSettings().local);
    expect(hits("localhost")).toHaveLength(1);
  });
});

describe("asking before the cloud", () => {
  it("returns needs-consent with a sanitised preview and sends nothing", async () => {
    const r = await gen({ local: down }, { groq: "KEY" }).generate(payload());
    expect(r.status).toBe("needs-consent");
    expect(r.provider).toBe("groq");
    expect(r.failure.code).toBe("UNREACHABLE");
    expect(r.preview.text).toContain("[EMAIL_1]");
    expect(r.preview.text).not.toContain("boss@corp.example");
    expect(r.preview.text).not.toContain("Cruz");
    expect(r.preview.chars).toBe(r.preview.text.length);
    expect(hits("groq.com")).toHaveLength(0);
    expect(entries).toEqual([]);
  });
  it("also asks after two unusable local replies", async () => {
    const r = await gen({ local: () => chat("not json") }, { groq: "KEY" }).generate(payload());
    expect(r).toMatchObject({ status: "needs-consent", failure: { code: "BAD_REPLY" } });
  });
  it("never asks about notes that cannot be sent", async () => {
    const notes = { ...NOTES, work: "tried password: hunter2" };
    const r = await gen({ local: down }, { groq: "KEY" }).generate(payload({ notes }));
    expect(r.status).toBe("ok");
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/will not be sent/);
    expect(hits("groq.com")).toHaveLength(0);
    expect(entries).toEqual([]);
  });
});

describe("sending to the cloud", () => {
  it("mode cloud skips local, sends sanitised notes, restores them, and logs the send without content", async () => {
    const groq = () => chat({ tasks: ["Emailed [EMAIL_1] about the issue."], topics: [], weekly_plans: [], blockers: [] });
    const r = await gen({ groq }, { groq: "GKEY" }).generate(payload({ mode: "cloud" }));
    expect(r).toMatchObject({ status: "ok", source: "groq", note: null });
    expect(taskItems(r)).toEqual(["Emailed boss@corp.example about the issue."]);
    expect(hits("localhost")).toHaveLength(0);
    const sent = hits("groq.com")[0];
    expect(sent.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(sent.init.headers.Authorization).toBe("Bearer GKEY");
    const body = JSON.parse(sent.init.body);
    expect(body.model).toBe(GROQ_MODEL);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content).toContain("[EMAIL_1]");
    expect(body.messages[0].content).not.toContain("boss@corp.example");
    expect(body.messages[0].content).not.toContain("Cruz");
    expect(entries).toEqual([{ provider: "groq", reason: "user-requested", chars: expect.any(Number) }]);
    expect(entries[0].chars).toBeGreaterThan(0);
  });
  it("hides the extra words from Settings too", async () => {
    await gen({}, { groq: "K" }).generate(payload({ mode: "cloud", ai: aiSettings({ privacyTerms: "hibernate, Acme" }) }));
    const content = JSON.parse(hits("groq.com")[0].init.body).messages[0].content;
    expect(content.split("Notes:\n")[1]).not.toMatch(/hibernate/i);
  });
  it("restores a placeholder the model re-cased and leaves one it invented", async () => {
    const groq = () => chat({ tasks: ["Emailed [email_1] and [EMAIL_9]."], topics: [], weekly_plans: [], blockers: [] });
    const r = await gen({ groq }, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(taskItems(r)).toEqual(["Emailed boss@corp.example and [EMAIL_9]."]);
  });
  it("copes when the model drops every placeholder", async () => {
    const r = await gen({}, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(taskItems(r)).toEqual(["Did A."]);
  });
  it("sends automatically when the user opted in, and logs why", async () => {
    const r = await gen({ local: down }, { groq: "K" }).generate(payload({ ai: aiSettings({ fallback: { provider: "groq", auto: true } }) }));
    expect(r.source).toBe("groq");
    expect(entries[0]).toMatchObject({ provider: "groq", reason: "UNREACHABLE" });
  });
  it("uses Gemini when it is the chosen fallback", async () => {
    const r = await gen({}, { gemini: "GEMKEY" }).generate(payload({ mode: "cloud", ai: aiSettings({ fallback: { provider: "gemini", auto: false } }) }));
    expect(r.source).toBe("gemini");
    const sent = hits("googleapis")[0];
    expect(sent.url).toContain(`${MODEL_IDS.flash}:generateContent`);
    expect(sent.init.headers["x-goog-api-key"]).toBe("GEMKEY");
    expect(JSON.parse(sent.init.body).contents[0].parts[0].text).not.toContain("boss@corp.example");
  });
  it("falls back to the built-in rules with a note when the cloud call fails", async () => {
    const r = await gen({ groq: () => res("bad key", 401, "Unauthorized") }, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/Groq failed: 401 Unauthorized: bad key/);
  });
  it("falls back when the cloud reply is unusable", async () => {
    const r = await gen({ groq: () => chat("not json") }, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/Groq failed: Groq returned an unexpected response/);
  });
  it("retries transient cloud errors with 1000 then 3000 ms waits", async () => {
    const replies = [res("x", 503, "UNAVAILABLE"), res("x", 429, "Too Many"), chat(good)];
    let n = 0; const waits = [];
    const g = createGenerator({ getKey: () => "K", fetchImpl: route({ groq: () => replies[n++] }), sleep: async ms => { waits.push(ms); }, audit });
    const r = await g.generate(payload({ mode: "cloud" }));
    expect(r.source).toBe("groq");
    expect(waits).toEqual([1000, 3000]);
    expect(n).toBe(3);
  });
  it("does not retry other cloud errors", async () => {
    let n = 0;
    const r = await gen({ groq: () => { n++; return res("nope", 400, "Bad Request"); } }, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(n).toBe(1);
    expect(r.source).toBe("template");
  });
  it("mode cloud without a saved key uses the built-in rules", async () => {
    const r = await gen({}, {}).generate(payload({ mode: "cloud" }));
    expect(r.source).toBe("template");
    expect(calls).toHaveLength(0);
  });
});

describe("declining", () => {
  it("mode template makes no network calls", async () => {
    const r = await gen({}, { groq: "K" }).generate(payload({ mode: "template" }));
    expect(r).toMatchObject({ status: "ok", source: "template" });
    expect(r.note).toMatch(/chose not to send/);
    expect(calls).toHaveLength(0);
  });
});

describe("connection checks", () => {
  it("testConnection needs that provider's key and then succeeds", async () => {
    await expect(gen({}, {}).testConnection("groq")).rejects.toThrow(/API key/i);
    await expect(gen({}, { groq: "K" }).testConnection("groq")).resolves.toBe(true);
    await expect(gen({}, { gemini: "K" }).testConnection("gemini", "pro")).resolves.toBe(true);
    expect(hits("googleapis")[0].url).toContain(MODEL_IDS.pro);
    await expect(gen({}, { groq: "K" }).testConnection("evil")).rejects.toThrow(/provider/i);
  });
  it("localStatus reports on the given local settings", async () => {
    const g = gen({ local: () => res({ data: [{ id: "qwen2.5:3b-instruct" }] }) });
    expect(await g.localStatus(aiSettings().local)).toEqual({ state: "ready" });
  });
});
