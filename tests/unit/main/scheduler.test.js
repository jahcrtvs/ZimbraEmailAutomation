import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { createScheduler } from "../../../src/main/scheduler.js";

const item = (over = {}) => ({ id: "a", date: "2026-10-08", time: "5:00 PM", recipient: "m@c.com", subject: "S", status: "scheduled", blocks: [], createdAt: "x", ...over });
let store, clock, prepared, notes, changes;
const make = (prepare) => createScheduler({ store, now: () => clock, prepare: prepare || (async it => { prepared.push(it.id); }), notify: (t, b) => notes.push([t, b]), onChange: items => changes.push(items) });
beforeEach(() => {
  store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-sch-")));
  clock = new Date(2026, 9, 8, 16, 59, 30);
  prepared = []; notes = []; changes = [];
});

describe("scheduler", () => {
  it("does nothing before the due time", async () => {
    const s = make(); s.upsert(item());
    await s.tick();
    expect(prepared).toEqual([]);
  });
  it("prepares at the due time, marks prepared, notifies", async () => {
    const s = make(); s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 0, 10);
    await s.tick();
    expect(prepared).toEqual(["a"]);
    expect(store.read("schedule")[0].status).toBe("prepared");
    expect(notes[0][0]).toMatch(/prepared in Zimbra/i);
  });
  it("never prepares the same item twice", async () => {
    const s = make(); s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 1);
    await s.tick(); await s.tick();
    expect(prepared).toEqual(["a"]);
  });
  it("does not re-enter while a prepare is still running", async () => {
    let release; let calls = 0;
    const s = make(() => { calls++; return new Promise(r => { release = r; }); });
    s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 1);
    const first = s.tick(); const second = s.tick();
    await second;
    release(); await first;
    expect(calls).toBe(1);
  });
  it("marks the item missed if prepare fails; nothing sent", async () => {
    const s = make(async () => { throw new Error("boom"); }); s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 1);
    await s.tick();
    expect(store.read("schedule")[0].status).toBe("missed");
    expect(notes[0][1]).toMatch(/No email was sent/);
  });
  it("never reports a prepared item as missed when saving its status fails", async () => {
    const s = make(); s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 1);
    const update = store.update;
    store.update = () => { throw new Error("disk full"); };
    await s.tick();
    expect(prepared).toEqual(["a"]);
    expect(store.read("schedule")[0].status).toBe("scheduled");
    expect(notes).toHaveLength(1);
    expect(notes[0][0]).toMatch(/prepared in Zimbra/i);
    expect(notes[0][1]).not.toMatch(/No email was sent/);
    await s.tick();
    expect(prepared).toEqual(["a"]);
    store.update = update;
    await s.tick();
    expect(prepared).toEqual(["a"]);
    expect(store.read("schedule")[0].status).toBe("prepared");
  });
  it("tells the user once when the schedule cannot be checked, and again after it recovers", async () => {
    const s = make();
    const read = store.read;
    store.read = () => { throw new Error("locked"); };
    await s.tick(); await s.tick();
    expect(notes).toEqual([["Scheduled digests could not be checked", expect.stringMatching(/keep trying/)]]);
    store.read = read;
    await s.tick();
    store.read = () => { throw new Error("locked"); };
    await s.tick();
    expect(notes).toHaveLength(2);
    store.read = read;
    await expect(s.tick()).resolves.toBeUndefined();
  });
  it("marks overdue items missed on launch without preparing", async () => {
    const s = make(); s.upsert(item({ date: "2026-10-07" }));
    clock = new Date(2026, 9, 8, 9, 0);
    s.markOverdueMissed();
    expect(store.read("schedule")[0].status).toBe("missed");
    expect(prepared).toEqual([]);
  });
  it("ignores cancelled items", async () => {
    const s = make(); s.upsert(item({ status: "cancelled" }));
    clock = new Date(2026, 9, 8, 18, 0);
    await s.tick();
    expect(prepared).toEqual([]);
  });
  it("rejects bad times and recipients on upsert", () => {
    const s = make();
    expect(() => s.upsert(item({ time: "noon" }))).toThrow(/date or time/i);
    expect(() => s.upsert(item({ recipient: "nope" }))).toThrow(/valid email/i);
    expect(() => s.upsert(item({ recipient: "a@x.com, b@y.org" }))).not.toThrow();
  });
  it("upsert replaces by id, setStatus and remove work, onChange fires", () => {
    const s = make(); s.upsert(item()); s.upsert(item({ time: "6:00 PM" }));
    expect(store.read("schedule")).toHaveLength(1);
    expect(store.read("schedule")[0].time).toBe("6:00 PM");
    s.setStatus("a", "cancelled");
    expect(store.read("schedule")[0].status).toBe("cancelled");
    s.remove("a");
    expect(store.read("schedule")).toEqual([]);
    expect(changes.length).toBe(4);
  });
});
