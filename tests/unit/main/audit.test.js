import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { createAudit, AUDIT_LIMIT } from "../../../src/main/audit.js";

let store;
beforeEach(() => { store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-audit-"))); });

describe("audit", () => {
  it("records time, provider, reason and size, and nothing else", () => {
    const audit = createAudit(store, () => new Date("2026-10-13T01:02:03.000Z"));
    audit.record({ provider: "groq", reason: "UNREACHABLE", chars: 120, text: "SECRET NOTES" });
    expect(store.read("audit")).toEqual([{ at: "2026-10-13T01:02:03.000Z", provider: "groq", reason: "UNREACHABLE", chars: 120 }]);
    expect(JSON.stringify(store.read("audit"))).not.toContain("SECRET");
  });
  it("keeps only the most recent entries", () => {
    let list = [];
    const audit = createAudit({ update: (_name, fn) => { list = fn(list); return list; } });
    for (let i = 0; i < AUDIT_LIMIT + 5; i++) audit.record({ provider: "groq", reason: "r" + i, chars: i });
    expect(list).toHaveLength(AUDIT_LIMIT);
    expect(list[list.length - 1].reason).toBe("r" + (AUDIT_LIMIT + 4));
    expect(list[0].reason).toBe("r5");
  });
});
