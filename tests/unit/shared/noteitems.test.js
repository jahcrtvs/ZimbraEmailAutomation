import { describe, it, expect } from "vitest";
import { noteItems, buildVars, SAMPLE_NOTES } from "../../../src/shared/report.js";
import { fromISODate } from "../../../src/shared/time.js";

const KEYS = ["tasks", "topics", "weekly_plans", "blockers"];
const vars = n => buildVars(n, { name: "A", role: "B" }, fromISODate("2026-10-08"), "long");

describe("noteItems", () => {
  it("splits each field into trimmed non-empty lines and puts Still Working On after Today's Work", () => {
    const n = { work: "  fixed login \n\n- wrote tests\r\n", topics: "• hql", progress: "* still on ids", blockers: "", tomorrow: "tomorrow review" };
    expect(noteItems(n)).toEqual({ tasks: ["fixed login", "wrote tests", "still on ids"], topics: ["hql"], weekly_plans: ["tomorrow review"], blockers: [] });
  });
  it("has the same lengths as the built-in sentences, so item N matches sentence N", () => {
    const messy = { work: "a\n\n- b\r\n  \nc", topics: "\n• x\n", progress: "- y", blockers: "z\n\n", tomorrow: "- t1\nt2" };
    for (const n of [SAMPLE_NOTES, messy]) {
      const items = noteItems(n), v = vars(n);
      for (const k of KEYS) expect(items[k]).toHaveLength(v[k].length);
    }
  });
  it("treats missing fields as empty", () => {
    expect(noteItems({})).toEqual({ tasks: [], topics: [], weekly_plans: [], blockers: [] });
  });
});
