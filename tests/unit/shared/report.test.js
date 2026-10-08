import { describe, it, expect } from "vitest";
import { polish, lines, buildVars, render, DEFAULT_TEMPLATE, SAMPLE_NOTES, EMPTY_NOTES, subjectFor, blocksToText, hasNotes } from "@shared/report.js";

const user = { name: "Mark Justine Dela Cruz", role: "CDP Trainee" };
const date = new Date(2026, 9, 8);

describe("polish", () => {
  it("applies the handoff rules", () => {
    expect(polish("worked on hibernate", "tasks")).toBe("Worked on Hibernate.");
    expect(polish("criteria query", "tasks")).toBe("Worked on Criteria API queries.");
    expect(polish("fixed duplicate result", "tasks")).toBe("Fixed duplicate query results.");
    expect(polish("continued office repository", "tasks")).toBe("Continued work on the Office repository.");
    expect(polish("hql vs criteria", "topics")).toBe("Studied HQL vs. Criteria.");
    expect(polish("tomorrow continue repository", "plans")).toBe("Continue work on the repository.");
    expect(polish("- finish embedded id mapping", "plans")).toBe("Finish the embedded ID mapping.");
    expect(polish("   ", "tasks")).toBeNull();
    expect(polish("â€¢ ", "tasks")).toBeNull();
  });
  it("does not double punctuation", () => {
    expect(polish("fixed the bug!", "tasks")).toBe("Fixed the bug!");
  });
});

describe("render with the handoff example", () => {
  const blocks = render(DEFAULT_TEMPLATE, buildVars(SAMPLE_NOTES, user, date));
  it("matches the example report", () => {
    expect(blocks).toEqual([
      { type: "section", title: "TASK TODAY", items: ["Worked on Hibernate.", "Worked on Criteria API queries.", "Fixed duplicate query results.", "Continued work on the Office repository.", "Investigating an issue with the embedded ID."] },
      { type: "section", title: "PLANS FOR THE WEEK", items: ["Continue work on the repository.", "Finish the embedded ID mapping."] },
      { type: "section", title: "TOPICS", items: ["Studied Criteria API projections.", "Studied HQL vs. Criteria."] },
      { type: "text", text: "Regards," },
      { type: "text", text: "Mark Justine Dela Cruz" },
      { type: "text", text: "CDP Trainee" }
    ]);
  });
  it("omits empty sections (no BLOCKERS)", () => {
    expect(blocks.some(b => b.title === "BLOCKERS")).toBe(false);
  });
});

describe("edge input", () => {
  it("handles Windows CRLF line endings", () => {
    expect(lines("worked on hibernate\r\nfixed duplicate result\r\n", "tasks")).toEqual(["Worked on Hibernate.", "Fixed duplicate query results."]);
    const blocks = render("TASK TODAY\r\n\r\n{tasks}\r\n\r\nRegards,\r\n{name}", buildVars({ ...EMPTY_NOTES, work: "worked on sql" }, user, date));
    expect(blocks[0].items).toEqual(["Worked on SQL."]);
    expect(blocks[blocks.length - 1]).toEqual({ type: "text", text: "Mark Justine Dela Cruz" });
  });
  it("keeps unknown variables as typed and joins arrays inline", () => {
    const b = render("Hi {unknown} {tasks}", buildVars({ ...EMPTY_NOTES, work: "worked on sql" }, user, date));
    expect(b).toEqual([{ type: "text", text: "Hi {unknown} Worked on SQL." }]);
  });
  it("hasNotes ignores whitespace", () => {
    expect(hasNotes({ ...EMPTY_NOTES, work: "  \n " })).toBe(false);
    expect(hasNotes({ ...EMPTY_NOTES, topics: "x" })).toBe(true);
  });
});

describe("subject and email text", () => {
  it("fills {date}", () => expect(subjectFor("Daily Digest - {date}", date)).toBe("Daily Digest - October 8, 2026"));
  it("converts blocks to plain text", () => {
    const t = blocksToText(render(DEFAULT_TEMPLATE, buildVars(SAMPLE_NOTES, user, date)));
    expect(t.startsWith("TASK TODAY\n- Worked on Hibernate.\n")).toBe(true);
    expect(t.endsWith("Regards,\nMark Justine Dela Cruz\nCDP Trainee")).toBe(true);
    expect(t).toContain("\n\nPLANS FOR THE WEEK\n- Continue work on the repository.");
  });
});
