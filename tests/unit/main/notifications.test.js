import { describe, it, expect, beforeEach } from "vitest";
import { createNotifications } from "../../../src/main/notifications.js";

// In memory: the real store is covered elsewhere, and 100 quick renames trip Windows file locks.
const memoryStore = () => {
  let list = [];
  return { read: () => list, update: (_n, fn) => (list = fn(list)) };
};
let store, popups, changes, n;
beforeEach(() => {
  store = memoryStore();
  popups = []; changes = [];
  n = createNotifications({ store, popup: (t, b) => popups.push([t, b]), onChange: l => changes.push(l) });
});

describe("notifications", () => {
  it("adds newest first, unread, and tells the window", () => {
    n.add({ kind: "error", title: "A" });
    n.add({ kind: "reminder", title: "B", body: "b" });
    expect(store.read("notifications").map(x => [x.title, x.read])).toEqual([["B", false], ["A", false]]);
    expect(changes).toHaveLength(2);
  });
  it("shows a desktop popup only when asked", () => {
    n.add({ kind: "error", title: "A" });
    n.add({ kind: "alarm", title: "B", body: "b" }, { show: true });
    expect(popups).toEqual([["B", "b"]]);
  });
  it("adds a keyed notification only once", () => {
    n.add({ kind: "update", key: "update:1.2.0", title: "U" });
    n.add({ kind: "update", key: "update:1.2.0", title: "U" }, { show: true });
    expect(store.read("notifications")).toHaveLength(1);
    expect(popups).toEqual([]);
  });
  it("rejects unknown kinds", () => {
    expect(() => n.add({ kind: "ad", title: "x" })).toThrow(/kind/);
  });
  it("keeps the newest 100", () => {
    for (let i = 0; i < 105; i++) n.add({ kind: "error", title: "e" + i });
    const list = store.read("notifications");
    expect(list).toHaveLength(100);
    expect(list[0].title).toBe("e104");
  });
  it("marks all read and clears", () => {
    n.add({ kind: "error", title: "A" });
    n.markAllRead();
    expect(store.read("notifications")[0].read).toBe(true);
    n.clear();
    expect(store.read("notifications")).toEqual([]);
  });
});
