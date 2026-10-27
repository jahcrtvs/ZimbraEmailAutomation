import { describe, it, expect } from "vitest";
import { polish, lines, buildVars, render, DEFAULT_TEMPLATE, SAMPLE_NOTES, EMPTY_NOTES, subjectFor, blocksToText, hasNotes } from "@shared/report.js";

const user = { name: "Ann Reyes", role: "Trainee" };
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
    expect(polish("• ", "tasks")).toBeNull();
  });
  it("keeps a note's own verb instead of adding a lead-in", () => {
    expect(polish("- completed all of the exercises and submitted it on time", "tasks")).toBe("Completed all of the exercises and submitted it on time.");
    expect(polish("started the aws skill builder lessons", "tasks")).toBe("Started the AWS skill builder lessons.");
    expect(polish("- Complete the given exercises on monday", "plans")).toBe("Complete the given exercises on Monday.");
    expect(polish("Do the review lesson for aws", "plans")).toBe("Do the review lesson for AWS.");
    expect(polish("continue studying spring", "plans")).toBe("Continue studying Spring.");
    expect(polish("learning docker", "topics")).toBe("Learned Docker.");
  });
  it("puts a verb in the tense its section needs", () => {
    expect(polish("testing login page", "tasks")).toBe("Tested login page.");
    expect(polish("deploy the app", "tasks")).toBe("Deployed the app.");
    expect(polish("finished the report", "plans")).toBe("Finish the report.");
    expect(polish("fix login bug", "progress")).toBe("Fixing login bug.");
    expect(polish("studying spring", "topics")).toBe("Studied Spring.");
  });
  it("adds the lead-in when the first word is not a verb, or is a noun as well", () => {
    expect(polish("review of pull request", "tasks")).toBe("Worked on review of pull request.");
    expect(polish("hibernate lesson", "plans")).toBe("Continue work on Hibernate lesson.");
    expect(polish("test driven development", "topics")).toBe("Studied test driven development.");
  });
  it("words a blocker as written, with no lead-in", () => {
    expect(polish("waiting for db access", "blockers")).toBe("Waiting for db access.");
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
      { type: "text", text: "Ann Reyes" },
      { type: "text", text: "Trainee" }
    ]);
  });
  it("words Still Working On notes without a stacked lead-in", () => {
    const v = buildVars({ ...EMPTY_NOTES, progress: "fixing login bug\nembedded id mapping\ncontinued office repo" }, user, date);
    expect(v.tasks).toEqual(["Still working on: fixing login bug.", "Still working on: embedded ID mapping.", "Continuing work on the Office repo."]);
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
    expect(blocks[blocks.length - 1]).toEqual({ type: "text", text: "Ann Reyes" });
  });
  it("leaves no blank line for a name or role not set yet", () => {
    const b = render("Regards,\n{name}\n{role}", buildVars(EMPTY_NOTES, { name: "", role: "" }, date));
    expect(b).toEqual([{ type: "text", text: "Regards," }]);
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
    expect(t.endsWith("Regards,\nAnn Reyes\nTrainee")).toBe(true);
    expect(t).toContain("\n\nPLANS FOR THE WEEK\n- Continue work on the repository.");
  });
});
