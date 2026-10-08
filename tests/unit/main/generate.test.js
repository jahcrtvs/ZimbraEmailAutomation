import { describe, it, expect } from "vitest";
import { createGenerator } from "../../../src/main/generate.js";
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
    expect(seen.url).toContain("gemini-2.5-flash:generateContent");
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
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => ({ ok: false, status: 503, statusText: "UNAVAILABLE", text: async () => "service overloaded" }) });
    await expect(g.generate(payload)).rejects.toThrow(/503 UNAVAILABLE.*service overloaded/);
  });
  it("throws on malformed or wrong-shape output", async () => {
    for (const bad of ["not json", { tasks: "a string" }, { tasks: [], topics: [], weekly_plans: [], blockers: [] }, { tasks: [1, 2] }]) {
      const g = createGenerator({ getKey: () => "K", fetchImpl: async () => geminiReply(bad) });
      await expect(g.generate(payload)).rejects.toThrow(/unexpected response/i);
    }
  });
  it("throws on network failure", async () => {
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => { throw new Error("ECONNRESET"); } });
    await expect(g.generate(payload)).rejects.toThrow(/ECONNRESET/);
  });
  it("testConnection fails without a key and succeeds with one", async () => {
    await expect(createGenerator({ getKey: () => null }).testConnection("flash")).rejects.toThrow(/API key/i);
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => geminiReply("ok") });
    await expect(g.testConnection("flash")).resolves.toBe(true);
  });
});
