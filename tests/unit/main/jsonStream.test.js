import { describe, it, expect } from "vitest";
import { createSentenceScanner } from "../../../src/main/jsonStream.js";

const json = '{\n  "tasks": [\n    "Did A.",\n    "Did \\"B\\"."\n  ],\n  "topics": [],\n  "weekly_plans": ["Plan\\nline"],\n  "blockers": ["Caf\\u00e9 closed."]\n}';
const expected = [["tasks", "Did A.", 0], ["tasks", 'Did "B".', 1], ["weekly_plans", "Plan\nline", 0], ["blockers", "Café closed.", 0]];
const feed = (text, size) => {
  const got = [];
  const s = createSentenceScanner((section, sentence, index) => got.push([section, sentence, index]));
  for (let i = 0; i < text.length; i += size) s.push(text.slice(i, i + size));
  return { got, result: s.result() };
};

describe("createSentenceScanner", () => {
  it("reports each finished sentence once, however the text is chunked", () => {
    for (const size of [1, 2, 5, 1000]) expect(feed(json, size).got).toEqual(expected);
  });
  it("collects the sentences per section", () => {
    expect(feed(json, 7).result).toEqual({ tasks: ["Did A.", 'Did "B".'], topics: [], weekly_plans: ["Plan\nline"], blockers: ["Café closed."] });
  });
  it("does not report a sentence that is still being written", () => {
    const { got, result } = feed('{"tasks":["Done.","Unfini', 3);
    expect(got).toEqual([["tasks", "Done.", 0]]);
    expect(result.tasks).toEqual(["Done."]);
  });
  it("ignores keys and strings outside the four sections, and survives garbage", () => {
    const { got } = feed('{"extra":["x"],"tasks":["Y."]} }}} "unterminated', 4);
    expect(got).toEqual([["tasks", "Y.", 0]]);
  });
  it("reads the sentence of {note, sentence} entries and ignores the echoed note", () => {
    const anchored = '{"tasks":[{"note":"sentence","sentence":"Did A."},{"note":"b","sentence":"Did \\"B\\"."}],"topics":[],"weekly_plans":[{"note":"c","sentence":"Plan."}],"blockers":[]}';
    for (const size of [1, 4, 1000]) {
      const { got, result } = feed(anchored, size);
      expect(got).toEqual([["tasks", "Did A.", 0], ["tasks", 'Did "B".', 1], ["weekly_plans", "Plan.", 0]]);
      expect(result.tasks).toEqual(["Did A.", 'Did "B".']);
    }
  });
  it("does not report a sentence whose note has been written but whose sentence has not", () => {
    const { got } = feed('{"tasks":[{"note":"fixed login","sentence":"Fixed the lo', 3);
    expect(got).toEqual([]);
  });
  it("works without a callback", () => {
    const s = createSentenceScanner();
    s.push('{"tasks":["Z."]}');
    expect(s.result().tasks).toEqual(["Z."]);
  });
});
