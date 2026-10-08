import { describe, it, expect } from "vitest";
import { createGenerator, GROQ_MODEL, MODEL_IDS } from "../../../src/main/generate.js";

const noSleep = async () => {};
import { DEFAULT_TEMPLATE, SAMPLE_NOTES } from "../../../src/shared/report.js";

const payload = { notes: SAMPLE_NOTES, template: DEFAULT_TEMPLATE, profile: { name: "Mark", role: "CDP Trainee" }, date: "2026-10-08", model: "flash" };
const geminiReply = obj => ({ ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === "string" ? obj : JSON.stringify(obj) }] } }] }) });

describe("generate", () => {
  it("uses local rules when no key is saved (and never calls fetch)", async () => {
    let called = false;
    const g = createGenerator({ getKey: () => null, fetchImpl: async () => { called = true; } });
    const blocks = await g.generate(payload);
    expect(called).toBe(false);
    expect(blocks[0]).toEqual(expect.objectContaining({ title: "TASK TODAY" }));
    expect(blocks[0].items[0]).toBe("Worked on Hibernate.");
  });
  it("calls Gemini with the key header and renders its JSON through the template", async () => {
    let seen;
    const g = createGenerator({
      getKey: () => "KEY",
      fetchImpl: async (url, init) => { seen = { url, init }; return geminiReply({ tasks: ["Did A."], topics: ["Studied B."], weekly_plans: ["Do C."], blockers: [] }); }
    });
    const blocks = await g.generate(payload);
    expect(seen.url).toContain(`${MODEL_IDS.flash}:generateContent`);
    expect(seen.init.headers["x-goog-api-key"]).toBe("KEY");
    expect(JSON.parse(seen.init.body).contents[0].parts[0].text).toContain("worked on hibernate");
    expect(blocks.find(b => b.title === "TASK TODAY").items).toEqual(["Did A."]);
    expect(blocks.some(b => b.title === "BLOCKERS")).toBe(false);
    expect(blocks[blocks.length - 1]).toEqual({ type: "text", text: "CDP Trainee" });
  });
  it("accepts JSON wrapped in a markdown fence", async () => {
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => geminiReply('```json\n{"tasks":["X."],"topics":[],"weekly_plans":[],"blockers":[]}\n```') });
    expect((await g.generate(payload))[0].items).toEqual(["X."]);
  });
  it("throws with details on HTTP errors", async () => {
    const g = createGenerator({ getKey: () => "K", sleep: noSleep, fetchImpl: async () => ({ ok: false, status: 503, statusText: "UNAVAILABLE", text: async () => "service overloaded" }) });
    await expect(g.generate(payload)).rejects.toThrow(/503 UNAVAILABLE.*service overloaded/);
  });
  it("throws on malformed or wrong-shape output", async () => {
    for (const bad of ["not json", { tasks: "a string" }, { tasks: [], topics: [], weekly_plans: [], blockers: [] }, { tasks: [1, 2] }]) {
      const g = createGenerator({ getKey: () => "K", fetchImpl: async () => geminiReply(bad) });
      await expect(g.generate(payload)).rejects.toThrow(/unexpected response/i);
    }
  });
  it("throws on network failure", async () => {
    const g = createGenerator({ getKey: () => "K", sleep: noSleep, fetchImpl: async () => { throw new Error("ECONNRESET"); } });
    await expect(g.generate(payload)).rejects.toThrow(/ECONNRESET/);
  });
  it("testConnection fails without a key and succeeds with one", async () => {
    await expect(createGenerator({ getKey: () => null }).testConnection("flash")).rejects.toThrow(/API key/i);
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => geminiReply("ok") });
    await expect(g.testConnection("flash")).resolves.toBe(true);
  });
});

const groqPayload = { ...payload, provider: "groq" };
const groqReply = obj => ({ ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ choices: [{ message: { content: typeof obj === "string" ? obj : JSON.stringify(obj) } }] }) });
const httpErr = (status, statusText, body = "oops") => ({ ok: false, status, statusText, text: async () => body });
const good = { tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [] };

describe("generate with Groq", () => {
  it("calls the chat completions endpoint with a Bearer header and the expected body", async () => {
    let seen;
    const keys = [];
    const g = createGenerator({ getKey: p => { keys.push(p); return p === "groq" ? "GKEY" : null; }, fetchImpl: async (url, init) => { seen = { url, init }; return groqReply(good); } });
    const blocks = await g.generate(groqPayload);
    expect(seen.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(seen.init.method).toBe("POST");
    expect(seen.init.headers.Authorization).toBe("Bearer GKEY");
    const body = JSON.parse(seen.init.body);
    expect(body.model).toBe(GROQ_MODEL);
    expect(GROQ_MODEL).toBe("llama-3.3-70b-versatile");
    expect(body.temperature).toBe(0.2);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContain("worked on hibernate");
    expect(blocks.find(b => b.title === "TASK TODAY").items).toEqual(["Did A."]);
    expect(keys).toContain("groq");
  });
  it("uses local rules when no Groq key is saved, even if a Gemini key exists (never calls fetch)", async () => {
    let called = false;
    const g = createGenerator({ getKey: p => (p === "gemini" ? "GEMKEY" : null), fetchImpl: async () => { called = true; } });
    const blocks = await g.generate(groqPayload);
    expect(called).toBe(false);
    expect(blocks[0].items[0]).toBe("Worked on Hibernate.");
  });
  it("defaults to Gemini when no provider is given", async () => {
    let url;
    const g = createGenerator({ getKey: p => (p === "gemini" ? "K" : null), fetchImpl: async u => { url = u; return geminiReply(good); } });
    await g.generate(payload);
    expect(url).toContain("generativelanguage.googleapis.com");
  });
  it("throws the same error shapes for HTTP errors and malformed output", async () => {
    const e = createGenerator({ getKey: () => "K", sleep: noSleep, fetchImpl: async () => httpErr(401, "Unauthorized", "bad key") });
    await expect(e.generate(groqPayload)).rejects.toThrow("401 Unauthorized: bad key");
    for (const bad of ["not json", { tasks: "a string" }, { tasks: [], topics: [], weekly_plans: [], blockers: [] }, { tasks: [1] }]) {
      const g = createGenerator({ getKey: () => "K", fetchImpl: async () => groqReply(bad) });
      await expect(g.generate(groqPayload)).rejects.toThrow(/unexpected response/i);
    }
    const noChoices = createGenerator({ getKey: () => "K", fetchImpl: async () => ({ ok: true, status: 200, statusText: "OK", text: async () => "{}" }) });
    await expect(noChoices.generate(groqPayload)).rejects.toThrow(/unexpected response/i);
  });
  it("testConnection works per provider and needs that provider's key", async () => {
    const getKey = p => (p === "groq" ? "K" : null);
    let url;
    const g = createGenerator({ getKey, fetchImpl: async u => { url = u; return groqReply("ok"); } });
    await expect(g.testConnection("flash", "groq")).resolves.toBe(true);
    expect(url).toContain("api.groq.com");
    await expect(g.testConnection("flash", "gemini")).rejects.toThrow(/API key/i);
  });
});

describe("retries", () => {
  const run = async provider => {
    const waits = [];
    const replies = [httpErr(503, "UNAVAILABLE"), httpErr(429, "Too Many"), provider === "groq" ? groqReply(good) : geminiReply(good)];
    let n = 0;
    const g = createGenerator({ getKey: () => "K", sleep: async ms => { waits.push(ms); }, fetchImpl: async () => replies[n++] });
    const blocks = await g.generate({ ...payload, provider });
    return { n, waits, blocks };
  };
  for (const provider of ["gemini", "groq"]) {
    it(`${provider}: retries 503 then 429 with 1000/3000 ms waits, then succeeds`, async () => {
      const r = await run(provider);
      expect(r.n).toBe(3);
      expect(r.waits).toEqual([1000, 3000]);
      expect(r.blocks.find(b => b.title === "TASK TODAY").items).toEqual(["Did A."]);
    });
  }
  it("retries 500 and network failures", async () => {
    const seq = [httpErr(500, "ISE"), new Error("ECONNRESET"), geminiReply(good)];
    let n = 0;
    const g = createGenerator({ getKey: () => "K", sleep: noSleep, fetchImpl: async () => { const x = seq[n++]; if (x instanceof Error) throw x; return x; } });
    await g.generate(payload);
    expect(n).toBe(3);
  });
  it("rethrows the LAST error with details after 3 attempts", async () => {
    const seq = [httpErr(503, "UNAVAILABLE", "first"), httpErr(500, "ISE", "second"), httpErr(503, "UNAVAILABLE", "third")];
    let n = 0;
    const waits = [];
    const g = createGenerator({ getKey: () => "K", sleep: async ms => { waits.push(ms); }, fetchImpl: async () => seq[n++] });
    await expect(g.generate(groqPayload)).rejects.toThrow("503 UNAVAILABLE: third");
    expect(n).toBe(3);
    expect(waits).toEqual([1000, 3000]);
  });
  it("does not retry other 4xx errors", async () => {
    let n = 0;
    const g = createGenerator({ getKey: () => "K", sleep: async () => { throw new Error("should not sleep"); }, fetchImpl: async () => { n++; return httpErr(400, "Bad Request", "nope"); } });
    await expect(g.generate(payload)).rejects.toThrow("400 Bad Request: nope");
    expect(n).toBe(1);
  });
  it("does not retry malformed output", async () => {
    let n = 0;
    const g = createGenerator({ getKey: () => "K", sleep: noSleep, fetchImpl: async () => { n++; return groqReply("not json"); } });
    await expect(g.generate(groqPayload)).rejects.toThrow(/unexpected response/i);
    expect(n).toBe(1);
  });
});
