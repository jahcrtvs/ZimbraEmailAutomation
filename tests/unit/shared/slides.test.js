import { describe, it, expect } from "vitest";
import { builtInDraft, mergeNotes, isGenericTitle, MAX_TOPICS } from "../../../src/shared/slides.js";
import { EMPTY_NOTES, lines } from "../../../src/shared/report.js";

const deck = (title, ...slideTitles) => ({ title, slides: slideTitles.map(t => ({ title: t, lines: [] })) });

describe("builtInDraft: Today's Work", () => {
  it("writes the item from the role and the deck title", () => {
    const d = deck("Spring Security", "Authentication");
    expect(builtInDraft(d, "attended").work).toEqual(["Attended the presentation on Spring Security"]);
    expect(builtInDraft(d, "presented").work).toEqual(["Presented on Spring Security"]);
    expect(builtInDraft(d, "studied").work).toEqual(["Studied the presentation on Spring Security"]);
  });
  it("uses the file name without folder, extension or underscores when the deck has no title", () => {
    const d = deck("", "Roles");
    expect(builtInDraft(d, "attended", "C:\\Users\\me\\Downloads\\spring_security-day3.pptx").work).toEqual(["Attended the presentation on spring security day3"]);
    expect(builtInDraft(d, "attended", "/home/me/JPA Basics.pdf").work).toEqual(["Attended the presentation on JPA Basics"]);
  });
  it("leaves the title out when there is neither a deck title nor a file name", () => {
    const d = deck("", "Roles");
    expect(builtInDraft(d, "attended").work).toEqual(["Attended the presentation"]);
    expect(builtInDraft(d, "presented").work).toEqual(["Presented the presentation"]);
    expect(builtInDraft(d, "studied").work).toEqual(["Studied the presentation"]);
  });
  it("rejects a role it does not know", () => {
    expect(() => builtInDraft(deck("X", "Y"), "watched")).toThrow(/role/i);
  });
  it("keeps its verb when the built-in rules turn the item into a sentence", () => {
    const d = deck("Spring Security", "Roles");
    const [a, p, s] = ["attended", "presented", "studied"].map(r => lines(builtInDraft(d, r).work.join("\n"), "tasks")[0]);
    expect(a).toBe("Attended the presentation on Spring Security.");
    expect(p).toBe("Presented on Spring Security.");
    expect(s).toBe("Studied the presentation on Spring Security.");
  });
});

describe("builtInDraft: Topics / Lessons", () => {
  it("lists the slide titles in order", () => {
    expect(builtInDraft(deck("Deck", "Authentication", "Roles", "JWT"), "attended").topics).toEqual(["Authentication", "Roles", "JWT"]);
  });
  it("skips the title slide, which repeats the deck title", () => {
    expect(builtInDraft(deck("Spring Security", "spring security", "Roles"), "attended").topics).toEqual(["Roles"]);
  });
  it("keeps a first slide whose title differs from the deck title", () => {
    expect(builtInDraft(deck("Workshop", "Spring Security", "Roles"), "attended").topics).toEqual(["Spring Security", "Roles"]);
  });
  it("skips generic slides such as agenda, summary and questions", () => {
    const t = ["Agenda", "Outline", "Roles", "Summary", "Q&A", "Questions?", "Questions and Answers", "Thank you!", "Thanks", "Homework", "JWT"];
    expect(builtInDraft(deck("Deck", ...t), "attended").topics).toEqual(["Roles", "JWT"]);
  });
  it("shares that rule, so topics from an AI can be held to it", () => {
    for (const t of ["Questions?", "Summary", "Homework", "Thank you!", "Agenda"]) expect(isGenericTitle(t)).toBe(true);
    for (const t of ["Summary of changes", "Roles", ""]) expect(isGenericTitle(t)).toBe(false);
  });
  it("keeps a title that only contains a generic word", () => {
    expect(builtInDraft(deck("Deck", "Summary of changes", "Agenda items in Scrum"), "attended").topics).toEqual(["Summary of changes", "Agenda items in Scrum"]);
  });
  it("drops repeated titles ignoring case and spacing, and slides with no title", () => {
    const d = { title: "Deck", slides: [{ title: "Roles", lines: [] }, { title: "", lines: ["body only"] }, { title: "  roles ", lines: [] }, { title: "JWT", lines: [] }] };
    expect(builtInDraft(d, "attended").topics).toEqual(["Roles", "JWT"]);
  });
  it(`keeps at most ${MAX_TOPICS} titles, the first ones`, () => {
    const t = Array.from({ length: 20 }, (_, i) => "Topic " + (i + 1));
    const topics = builtInDraft(deck("Deck", ...t), "attended").topics;
    expect(topics).toHaveLength(MAX_TOPICS);
    expect(topics[0]).toBe("Topic 1");
    expect(topics[MAX_TOPICS - 1]).toBe("Topic " + MAX_TOPICS);
  });
  it("fills only Today's Work and Topics / Lessons, and has every note field", () => {
    expect(builtInDraft(deck("Deck", "Roles"), "studied")).toEqual({ work: ["Studied the presentation on Deck"], topics: ["Roles"], progress: [], blockers: [], tomorrow: [] });
  });
});

describe("mergeNotes", () => {
  const draft = { work: ["Attended the presentation on JPA"], topics: ["Entities", "Mappings"], progress: [], blockers: [], tomorrow: [] };

  it("fills empty fields with one item per line and no blank line first", () => {
    expect(mergeNotes(EMPTY_NOTES, draft)).toEqual({ work: "Attended the presentation on JPA", topics: "Entities\nMappings", progress: "", blockers: "", tomorrow: "" });
  });
  it("adds below what is already typed and leaves that text exactly as it is", () => {
    const notes = { ...EMPTY_NOTES, work: "fixed login bug\n  wrote tests  ", topics: "hql" };
    const merged = mergeNotes(notes, draft);
    expect(merged.work).toBe("fixed login bug\n  wrote tests  \nAttended the presentation on JPA");
    expect(merged.topics).toBe("hql\nEntities\nMappings");
  });
  it("does not add a blank line when the field already ends with a new line", () => {
    expect(mergeNotes({ ...EMPTY_NOTES, topics: "hql\n" }, draft).topics).toBe("hql\nEntities\nMappings");
  });
  it("skips an item already in that field word for word, ignoring spaces around it", () => {
    const merged = mergeNotes({ ...EMPTY_NOTES, topics: "  Entities  \nhql" }, draft);
    expect(merged.topics).toBe("  Entities  \nhql\nMappings");
  });
  it("is case sensitive, as an exact match", () => {
    expect(mergeNotes({ ...EMPTY_NOTES, topics: "entities" }, draft).topics).toBe("entities\nEntities\nMappings");
  });
  it("only compares within the same field", () => {
    expect(mergeNotes({ ...EMPTY_NOTES, work: "Entities" }, draft).topics).toBe("Entities\nMappings");
  });
  it("adds an item once when the draft repeats it", () => {
    expect(mergeNotes(EMPTY_NOTES, { ...draft, topics: ["Roles", "Roles", "JWT"] }).topics).toBe("Roles\nJWT");
  });
  it("changes nothing when the same draft is merged twice", () => {
    const once = mergeNotes({ ...EMPTY_NOTES, work: "fixed login bug" }, draft);
    expect(mergeNotes(once, draft)).toEqual(once);
  });
  it("leaves fields the draft does not fill, and other keys, as they were, without changing the input", () => {
    const notes = { ...EMPTY_NOTES, blockers: "waiting on access", extra: "keep me" };
    const copy = JSON.parse(JSON.stringify(notes));
    const merged = mergeNotes(notes, draft);
    expect(merged.blockers).toBe("waiting on access");
    expect(merged.extra).toBe("keep me");
    expect(notes).toEqual(copy);
  });
  it("treats a missing field as empty", () => {
    expect(mergeNotes({}, draft).topics).toBe("Entities\nMappings");
  });
});
