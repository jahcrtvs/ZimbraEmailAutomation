import { describe, it, expect } from "vitest";
import { PROMPT, LOCAL_PROMPT, exampleExchange } from "../../../src/main/reply.js";

describe("local prompt", () => {
  it("is much shorter than the cloud prompt and asks for 12 to 20 words, one sentence per note", () => {
    expect(LOCAL_PROMPT.length).toBeLessThan(PROMPT.length * 0.8);
    expect(LOCAL_PROMPT).toContain("12 to 20 words");
    expect(LOCAL_PROMPT).toContain("exactly one sentence");
    expect(LOCAL_PROMPT).toContain('{"tasks":[],"topics":[],"weekly_plans":[],"blockers":[]}');
  });
  it("does not contain the notes marker, so the fixed text stays cacheable", () => {
    expect(LOCAL_PROMPT).not.toContain("Notes:");
  });
  it("leaves the cloud prompt as it was", () => {
    expect(PROMPT).toContain("12 to 25 words");
  });
});

describe("exampleExchange", () => {
  it("is empty when there are no examples", () => {
    expect(exampleExchange([])).toEqual([]);
  });
  it("shows the examples as a past request and the answer the user wanted", () => {
    const ex = [
      { section: "tasks", item: "fixed login", sentence: "Fixed the login page." },
      { section: "weekly_plans", item: "review lesson", sentence: "Review today's lesson." },
      { section: "tasks", item: "wrote tests", sentence: "Wrote the unit tests." }
    ];
    const [user, assistant, ...rest] = exampleExchange(ex);
    expect(rest).toEqual([]);
    expect(user.role).toBe("user");
    expect(user.content.startsWith("Notes:\n")).toBe(true);
    expect(user.content).toContain("Today's Work:\nfixed login\nwrote tests");
    expect(user.content).toContain("Tomorrow:\nreview lesson");
    expect(user.content).toContain("Blockers:\n(none)");
    expect(assistant.role).toBe("assistant");
    expect(JSON.parse(assistant.content)).toEqual({ tasks: ["Fixed the login page.", "Wrote the unit tests."], topics: [], weekly_plans: ["Review today's lesson."], blockers: [] });
  });
});
