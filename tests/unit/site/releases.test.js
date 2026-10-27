import { describe, it, expect } from "vitest";
import { parseChanges, releaseChanges } from "../../../site/api/releases.js";

describe("download release notes", () => {
  it("keeps only feature and fix commit subjects", () => {
    const body = [
      "- feat(site): Add a downloads page (abc1234)",
      "- fix: Keep the Download button visible (def5678)",
      "- docs: update README (a123456)",
      "- chore: release v1.3.0 (b123456)",
      "- refactor: move code (c123456)",
      "- test: add coverage (d123456)",
      "- ci: publish installer (e123456)",
      "- build: update bundler (f123456)",
      "- style: adjust spacing (a234567)",
      "- specs: plan release (b234567)",
      "- benchmark: compare models (c234567)",
      "- Miscellaneous work (d234567)"
    ].join("\n");
    expect(parseChanges(body)).toEqual([
      { type: "feat", text: "Add a downloads page" },
      { type: "fix", text: "Keep the Download button visible" }
    ]);
  });

  it("uses curated notes even when their list is empty", () => {
    const body = "- feat: A commit that should not appear (abc1234)";
    expect(releaseChanges("1.1.1", body)).toEqual({ changes: [], more: 0 });
    expect(releaseChanges("1.2.2", body).changes[0].text).toBe("Daily Digest now has its own icon in Windows.");
  });

  it("caps uncurated releases at five visible changes and counts the rest", () => {
    const body = Array.from({ length: 8 }, (_, i) => `- feat: Visible change ${i + 1} (abc1234)`).join("\n");
    expect(releaseChanges("9.9.9", body)).toEqual({
      changes: Array.from({ length: 5 }, (_, i) => ({ type: "feat", text: `Visible change ${i + 1}` })),
      more: 3
    });
  });

  it("caps curated releases too", () => {
    const curated = { "9.9.9": Array.from({ length: 6 }, (_, i) => ({ type: "fix", text: `Fix ${i + 1}` })) };
    expect(releaseChanges("9.9.9", "", curated)).toEqual({ changes: curated["9.9.9"].slice(0, 5), more: 1 });
  });
});
