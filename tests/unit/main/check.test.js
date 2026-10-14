import { describe, it, expect } from "vitest";
import { inventsFacts, coversItem, applyChecks } from "../../../src/main/check.js";

describe("coversItem", () => {
  it("accepts a sentence that rewords its own item, despite tense and typos", () => {
    expect(coversItem("fixed duplicate result", "Fixed the duplicate results in the query.")).toBe(true);
    expect(coversItem("advcance study", "Continue advanced study of the next topics.")).toBe(true);
    expect(coversItem("cannot connect to database", "Unable to connect to the database from the application.")).toBe(true);
    expect(coversItem("completed execie 5", "Completed exercise 5, verifying its behavior.")).toBe(true);
  });
  it("rejects a sentence about something else", () => {
    expect(coversItem("criteria query", "Continued work on the office repository, focusing on data access methods.")).toBe(false);
  });
  it("cannot judge an item made only of filler words, so it accepts", () => {
    expect(coversItem("continue", "Continue work on the repository.")).toBe(true);
  });
});

describe("inventsFacts", () => {
  it("accepts a sentence that only rewords the item", () => {
    expect(inventsFacts("fixed duplicate result", "Fixed the duplicate query results in the repository.")).toBe(false);
  });
  it("rejects a number the item does not state, and accepts one it does", () => {
    expect(inventsFacts("fixed login bug", "Fixed the login bug within 3 hours.")).toBe(true);
    expect(inventsFacts("fixed 2 bugs", "Fixed 2 bugs in the login page.")).toBe(false);
  });
  it("rejects a name the item does not mention", () => {
    expect(inventsFacts("emailed boss", "Emailed Cruz about the issue.")).toBe(true);
    expect(inventsFacts("asked Cruz for review", "Asked Cruz to review the changes.")).toBe(false);
  });
  it("allows well-known technical terms and the item's own words in any case", () => {
    expect(inventsFacts("lesson in hibernate", "Studied the Hibernate lesson, covering how Java objects map to database tables using ORM.")).toBe(false);
    expect(inventsFacts("hql vs criteria", "Studied the difference between HQL and Criteria queries.")).toBe(false);
  });
  it("does not treat the first word or a lower-case word as a name", () => {
    expect(inventsFacts("wrote tests", "Wrote unit tests for the service methods.")).toBe(false);
  });
});

const items = { tasks: ["fixed login", "wrote tests"], topics: [], weekly_plans: [], blockers: [] };
const builtIn = { tasks: ["Fixed login.", "Wrote tests."], topics: [], weekly_plans: [], blockers: [], date: "x" };
const reply = tasks => ({ tasks, topics: [], weekly_plans: [], blockers: [] });

describe("applyChecks", () => {
  it("keeps good sentences", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page.", "Wrote the unit tests."]), builtIn });
    expect(r).toEqual({ parsed: reply(["Fixed the login page.", "Wrote the unit tests."]), fallbacks: 0, total: 2 });
  });
  it("replaces only the sentence that fails", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed login in 3 hours.", "Wrote the unit tests."]), builtIn });
    expect(r.parsed.tasks).toEqual(["Fixed login.", "Wrote the unit tests."]);
    expect(r.fallbacks).toBe(1);
  });
  it("uses the built-in rules for a whole section whose sentence count is wrong", () => {
    const r = applyChecks({ items, parsed: reply(["Only one."]), builtIn });
    expect(r.parsed.tasks).toEqual(["Fixed login.", "Wrote tests."]);
    expect(r.fallbacks).toBe(2);
  });
  it("replaces blank sentences", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page.", "   "]), builtIn });
    expect(r.parsed.tasks).toEqual(["Fixed the login page.", "Wrote tests."]);
  });
  it("aligns a partial reply by prefix and uses built-in rules for the rest", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page."]), builtIn, partial: true });
    expect(r.parsed.tasks).toEqual(["Fixed the login page.", "Wrote tests."]);
    expect(r.fallbacks).toBe(1);
  });
  it("does not trust a partial reply that has more sentences than items", () => {
    const r = applyChecks({ items, parsed: reply(["A.", "B.", "C."]), builtIn, partial: true });
    expect(r.parsed.tasks).toEqual(["Fixed login.", "Wrote tests."]);
  });
  it("replaces a sentence that is about a different item than its own", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page.", "Studied the Hibernate lesson on mapping."]), builtIn });
    expect(r.parsed.tasks).toEqual(["Fixed the login page.", "Wrote tests."]);
    expect(r.fallbacks).toBe(1);
  });
  it("returns empty sections as empty and counts only real items", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page.", "Wrote the unit tests."]), builtIn });
    expect(r.parsed.topics).toEqual([]);
    expect(r.total).toBe(2);
  });
});
