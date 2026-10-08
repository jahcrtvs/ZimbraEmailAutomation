import { describe, it, expect } from "vitest";
import { findChrome, ensureChrome } from "../../../src/main/chrome.js";

describe("findChrome", () => {
  it("checks the standard install locations in order", () => {
    const env = { ProgramFiles: "C:\\PF", "ProgramFiles(x86)": "C:\\PF86", LOCALAPPDATA: "C:\\LA" };
    expect(findChrome(env, p => p.startsWith("C:\\PF86"))).toBe("C:\\PF86\\Google\\Chrome\\Application\\chrome.exe");
    expect(findChrome(env, () => false)).toBeNull();
  });
});

describe("ensureChrome", () => {
  const base = { port: 9222, profileDir: "C:\\p", url: "https://z" };
  it("does nothing when the port is already up", async () => {
    let spawned = false;
    await ensureChrome({ ...base, isUp: async () => true, spawnImpl: () => { spawned = true; } });
    expect(spawned).toBe(false);
  });
  it("throws NO_CHROME when Chrome is missing", async () => {
    await expect(ensureChrome({ ...base, isUp: async () => false, find: () => null })).rejects.toMatchObject({ code: "NO_CHROME" });
  });
  it("launches Chrome with a dedicated profile and waits for the port", async () => {
    let args, ups = 0;
    await ensureChrome({
      ...base, find: () => "chrome.exe", wait: async () => {},
      isUp: async () => ++ups > 2,
      spawnImpl: (exe, a) => { args = [exe, a]; return { unref() {} }; }
    });
    expect(args[0]).toBe("chrome.exe");
    expect(args[1]).toEqual(expect.arrayContaining(["--remote-debugging-port=9222", "--user-data-dir=C:\\p", "--no-first-run", "https://z"]));
  });
  it("throws UNREACHABLE if the port never comes up", async () => {
    await expect(ensureChrome({ ...base, find: () => "c", wait: async () => {}, timeoutMs: 3, isUp: async () => false, spawnImpl: () => ({ unref() {} }) })).rejects.toMatchObject({ code: "UNREACHABLE" });
  });
});
