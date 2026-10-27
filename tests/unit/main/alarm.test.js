import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { createNotifications } from "../../../src/main/notifications.js";
import { createAlarm } from "../../../src/main/alarm.js";

let store, clock, popups, alarm;
const turnOn = (time = "4:30 PM") => store.update("settings", s => ({ ...s, alarm: { enabled: true, time } }));
beforeEach(() => {
  store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-alarm-")));
  // Wednesday
  clock = new Date(2026, 9, 28, 16, 31);
  popups = [];
  const notifications = createNotifications({ store, now: () => clock, popup: (t, b) => popups.push([t, b]) });
  alarm = createAlarm({ store, notifications, now: () => clock });
});

describe("alarm", () => {
  it("is off by default", () => {
    expect(store.read("settings").alarm.enabled).toBe(false);
    alarm.tick();
    expect(popups).toEqual([]);
  });
  it("goes off once at the set time and is listed as an alarm", () => {
    turnOn();
    clock = new Date(2026, 9, 28, 16, 29);
    alarm.tick();
    expect(popups).toEqual([]);
    clock = new Date(2026, 9, 28, 16, 30);
    alarm.tick(); alarm.tick();
    expect(popups).toHaveLength(1);
    expect(store.read("notifications")).toMatchObject([{ kind: "alarm", read: false, key: "alarm:2026-10-28" }]);
  });
  it("goes off again the next weekday", () => {
    turnOn();
    alarm.tick();
    clock = new Date(2026, 9, 29, 16, 31);
    alarm.tick();
    expect(popups).toHaveLength(2);
  });
  it("stays quiet on weekends", () => {
    turnOn();
    clock = new Date(2026, 9, 31, 16, 31);
    alarm.tick();
    expect(popups).toEqual([]);
  });
  it("stays quiet once today's digest is sent or scheduled", () => {
    turnOn();
    store.write("history", [{ id: "h", date: "2026-10-28", status: "sent" }]);
    alarm.tick();
    store.write("history", []);
    store.write("schedule", [{ id: "s", date: "2026-10-28", time: "5:00 PM", status: "scheduled" }]);
    alarm.tick();
    expect(popups).toEqual([]);
  });
  it("uses the time from Settings", () => {
    turnOn("5:00 PM");
    alarm.tick();
    expect(popups).toEqual([]);
  });
});
