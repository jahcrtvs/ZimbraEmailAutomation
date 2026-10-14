import { describe, it, expect } from "vitest";
import { PROMPT, LOCAL_PROMPT, localPrompt } from "../../../src/main/reply.js";

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
  it("lists the examples after the rules", () => {
    const p = localPrompt([{ section: "tasks", item: "fixed login", sentence: "Fixed the login page." }]);
    expect(p.startsWith(LOCAL_PROMPT)).toBe(true);
    expect(p).toContain("tasks: fixed login => Fixed the login page.");
  });
  it("is just the rules when there are no examples", () => {
    expect(localPrompt([])).toBe(LOCAL_PROMPT);
  });
  it("leaves the cloud prompt as it was", () => {
    expect(PROMPT).toContain("12 to 25 words");
  });
});
