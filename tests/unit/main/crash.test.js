import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { createCrashLog, catchUncaught, watchRenderer } from "../../../src/main/crash.js";

const tmpLog = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "dd-crash-")), "sub", "crash.log");
const fakeContents = () => Object.assign(new EventEmitter(), { reloads: 0, reload() { this.reloads++; }, isDestroyed: () => false });

describe("crash log", () => {
  it("writes the time, where it happened and the stack", () => {
    const file = tmpLog();
    createCrashLog(file, () => new Date("2026-10-28T01:02:03.000Z")).log("main", new Error("boom"));
    const text = fs.readFileSync(file, "utf8");
    expect(text).toMatch(/^\[2026-10-28T01:02:03.000Z\] main: Error: boom/);
    expect(text).toContain("crash.test.js");
  });
  it("logs values that are not errors", () => {
    const file = tmpLog();
    const { log } = createCrashLog(file);
    log("a", "plain text"); log("b", { message: "object" }); log("c", undefined);
    const text = fs.readFileSync(file, "utf8");
    expect(text).toContain("a: plain text");
    expect(text).toContain("b: object");
    expect(text).toContain("c: undefined");
  });
  it("starts a new file when the log grows too big", () => {
    const file = tmpLog();
    const { log } = createCrashLog(file);
    log("x", "first");
    fs.appendFileSync(file, "y".repeat(300 * 1024));
    log("x", "second");
    expect(fs.readFileSync(file + ".old", "utf8")).toContain("first");
    expect(fs.readFileSync(file, "utf8")).toContain("second");
  });
  it("never throws when it cannot write", () => {
    const blocker = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "dd-crash-")), "file");
    fs.writeFileSync(blocker, "");
    expect(() => createCrashLog(path.join(blocker, "crash.log")).log("main", new Error("x"))).not.toThrow();
  });
});

describe("uncaught errors", () => {
  it("logs uncaught errors and rejected promises", () => {
    const proc = new EventEmitter(), seen = [];
    catchUncaught(proc, (where, e) => seen.push([where, e.message]));
    proc.emit("uncaughtException", new Error("a"));
    proc.emit("unhandledRejection", new Error("b"));
    expect(seen).toEqual([["main", "a"], ["main (promise)", "b"]]);
  });
});

describe("window crash", () => {
  it("reloads the window after its page crashes", () => {
    const wc = fakeContents(), seen = [];
    watchRenderer(wc, w => seen.push(w));
    wc.emit("render-process-gone", {}, { reason: "crashed", exitCode: 1 });
    expect(wc.reloads).toBe(1);
    expect(seen).toEqual(["window"]);
  });
  it("does not reload after a normal exit or once the window is gone", () => {
    const wc = fakeContents();
    watchRenderer(wc, () => {});
    wc.emit("render-process-gone", {}, { reason: "clean-exit", exitCode: 0 });
    wc.isDestroyed = () => true;
    wc.emit("render-process-gone", {}, { reason: "crashed", exitCode: 1 });
    expect(wc.reloads).toBe(0);
  });
  it("gives up after three crashes in a minute, and tries again later", () => {
    const wc = fakeContents();
    let t = 0, gaveUp = 0;
    watchRenderer(wc, () => {}, { now: () => t, onGiveUp: () => gaveUp++ });
    for (let i = 0; i < 4; i++) wc.emit("render-process-gone", {}, { reason: "crashed", exitCode: 1 });
    expect(wc.reloads).toBe(3);
    expect(gaveUp).toBe(1);
    t = 61000;
    wc.emit("render-process-gone", {}, { reason: "crashed", exitCode: 1 });
    expect(wc.reloads).toBe(4);
  });
  it("logs when the page stops responding", () => {
    const wc = fakeContents(), seen = [];
    watchRenderer(wc, (w, e) => seen.push(e.message));
    wc.emit("unresponsive");
    expect(seen).toEqual(["page stopped responding"]);
  });
});
