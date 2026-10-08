import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore, DEFAULTS } from "../../../src/main/store.js";

let dir, store;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-store-")); store = createStore(dir); });

describe("store", () => {
  it("returns defaults when files are missing", () => {
    expect(store.read("history")).toEqual([]);
    expect(store.read("settings").email.defaultRecipient).toBe("manager@company.com");
    expect(store.read("template").body).toContain("TASK TODAY");
  });
  it("writes and reads back, leaving no temp file", () => {
    store.write("history", [{ id: "a" }]);
    expect(store.read("history")).toEqual([{ id: "a" }]);
    expect(fs.readdirSync(dir).filter(f => f.endsWith(".tmp"))).toEqual([]);
  });
  it("update applies a function atomically", () => {
    store.write("schedule", [{ id: "1", status: "scheduled" }]);
    const out = store.update("schedule", items => items.map(i => ({ ...i, status: "prepared" })));
    expect(out[0].status).toBe("prepared");
    expect(store.read("schedule")[0].status).toBe("prepared");
  });
  it("survives a corrupt file: defaults returned, bad file kept", () => {
    fs.writeFileSync(path.join(dir, "draft.json"), '{"notes": {"work": "abc"');
    expect(store.read("draft").notes.work).toBe("");
    expect(fs.existsSync(path.join(dir, "draft.json.bad"))).toBe(true);
  });
  it("rejects wrong-shape data (array expected)", () => {
    fs.writeFileSync(path.join(dir, "history.json"), '{"oops":true}');
    expect(store.read("history")).toEqual([]);
  });
  it("fills missing settings keys from defaults", () => {
    fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ profile: { name: "Ann" } }));
    const s = store.read("settings");
    expect(s.profile).toEqual({ name: "Ann", role: "CDP Trainee" });
    expect(s.email.defaultSubject).toBe("Daily Digest - {date}");
  });
  it("refuses unknown collections", () => {
    expect(() => store.read("nope")).toThrow(/unknown collection/);
    expect(() => store.write("nope", {})).toThrow(/unknown collection/);
  });
  it("readAll returns every collection", () => {
    expect(Object.keys(store.readAll()).sort()).toEqual(Object.keys(DEFAULTS()).sort());
  });
});
