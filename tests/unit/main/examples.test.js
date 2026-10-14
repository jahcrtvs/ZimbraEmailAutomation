import { describe, it, expect } from "vitest";
import { pairsFromHistory, pickExamples, BUILT_IN_EXAMPLES } from "../../../src/main/examples.js";
import { noteItems, SAMPLE_NOTES } from "../../../src/shared/report.js";

const notes = o => ({ work: "", topics: "", progress: "", blockers: "", tomorrow: "", ...o });
const sec = (title, items) => ({ type: "section", title, items });
const entry = (n, blocks, status = "sent") => ({ status, notes: notes(n), blocks });
const none = { tasks: [], topics: [], weekly_plans: [], blockers: [] };

describe("pairsFromHistory", () => {
  it("pairs the n-th item with the n-th sentence of its section", () => {
    const h = [entry({ work: "fixed login\nwrote tests", topics: "hql" }, [sec("TASK TODAY", ["Fixed the login page.", "Wrote unit tests."]), sec("TOPICS", ["Studied HQL."]), { type: "text", text: "Regards," }])];
    expect(pairsFromHistory(h)).toEqual([
      { section: "tasks", item: "fixed login", sentence: "Fixed the login page." },
      { section: "tasks", item: "wrote tests", sentence: "Wrote unit tests." },
      { section: "topics", item: "hql", sentence: "Studied HQL." }
    ]);
  });
  it("skips a section whose sentence count differs from its item count (edited report)", () => {
    const h = [entry({ work: "a\nb", topics: "hql" }, [sec("TASK TODAY", ["Only one."]), sec("TOPICS", ["Studied HQL."])])];
    expect(pairsFromHistory(h).map(p => p.section)).toEqual(["topics"]);
  });
  it("ignores unsent entries, unknown section titles and blank sentences", () => {
    const h = [entry({ work: "a" }, [sec("TASK TODAY", ["Did a."])], "draft"), entry({ work: "a" }, [sec("WORK DONE", ["Did a."])]), entry({ work: "a" }, [sec("TASK TODAY", [" "])])];
    expect(pairsFromHistory(h)).toEqual([]);
  });
  it("copes with entries that have no notes or blocks", () => {
    expect(pairsFromHistory([{ status: "sent" }, null, {}])).toEqual([]);
  });
  it("removes exact duplicates", () => {
    const e = entry({ work: "a" }, [sec("TASK TODAY", ["Did a."])]);
    expect(pairsFromHistory([e, e])).toHaveLength(1);
  });
});

describe("pickExamples", () => {
  it("tops up with built-in examples when there is no history, covering every section that has items", () => {
    const got = pickExamples({ history: [], items: noteItems(SAMPLE_NOTES) });
    expect(got).toHaveLength(6);
    for (const s of ["tasks", "topics", "weekly_plans"]) expect(got.some(e => e.section === s)).toBe(true);
    for (const e of got) expect(BUILT_IN_EXAMPLES).toContainEqual(e);
  });
  it("prefers a similar example from the user's own history", () => {
    const h = [entry({ work: "criteria api projections" }, [sec("TASK TODAY", ["Worked on Criteria API projections in the office project."])])];
    const got = pickExamples({ history: h, items: { ...none, tasks: ["criteria query"] }, limit: 2 });
    expect(got.map(e => e.item)).toContain("criteria api projections");
  });
  it("never returns more than the limit", () => {
    expect(pickExamples({ history: [], items: noteItems(SAMPLE_NOTES), limit: 3 })).toHaveLength(3);
  });
  it("orders the result by section", () => {
    const order = ["tasks", "topics", "weekly_plans", "blockers"];
    const got = pickExamples({ history: [], items: noteItems(SAMPLE_NOTES) }).map(e => order.indexOf(e.section));
    expect(got).toEqual([...got].sort((a, b) => a - b));
  });
});
