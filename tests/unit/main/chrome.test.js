import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { findChrome, createChrome } from "../../../src/main/chrome.js";

describe("findChrome", () => {
  it("checks the standard install locations in order", () => {
    const env = { ProgramFiles: "C:\\PF", "ProgramFiles(x86)": "C:\\PF86", LOCALAPPDATA: "C:\\LA" };
    expect(findChrome(env, p => p.startsWith("C:\\PF86"))).toBe("C:\\PF86\\Google\\Chrome\\Application\\chrome.exe");
    expect(findChrome(env, () => false)).toBeNull();
  });
});

const fakeCtx = () => {
  const handlers = {};
  return { closed: 0, on: (ev, fn) => { handlers[ev] = fn; }, close: async function () { this.closed++; handlers.close?.(); }, emitClose: () => handlers.close?.() };
};

describe("createChrome", () => {
  it("throws NO_CHROME when Chrome is missing", async () => {
    const c = createChrome({ profileDir: "C:\\p", find: () => null, launch: async () => fakeCtx() });
    await expect(c.context()).rejects.toMatchObject({ code: "NO_CHROME" });
  });
  it("launches the installed Chrome with a dedicated profile and no debugging port", async () => {
    let got;
    const c = createChrome({ profileDir: "C:\\p", find: () => "chrome.exe", launch: async (dir, opts) => { got = [dir, opts]; return fakeCtx(); } });
    await c.context();
    expect(got[0]).toBe("C:\\p");
    expect(got[1]).toMatchObject({ executablePath: "chrome.exe", headless: false });
    expect(JSON.stringify(got[1])).not.toMatch(/remote-debugging/);
  });
  it("reuses one Chrome, even for calls made at the same time", async () => {
    let launches = 0;
    const c = createChrome({ profileDir: "p", find: () => "c", launch: async () => { launches++; return fakeCtx(); } });
    const [a, b] = await Promise.all([c.context(), c.context()]);
    expect(a).toBe(b);
    expect(await c.context()).toBe(a);
    expect(launches).toBe(1);
  });
  it("starts Chrome again after the user closes its window", async () => {
    const made = [];
    const c = createChrome({ profileDir: "p", find: () => "c", launch: async () => { const x = fakeCtx(); made.push(x); return x; } });
    expect(c.isOpen()).toBe(false);
    (await c.context()).emitClose();
    expect(c.isOpen()).toBe(false);
    await c.context();
    expect(c.isOpen()).toBe(true);
    expect(made).toHaveLength(2);
  });
  it("throws UNREACHABLE when Chrome will not start, and retries next time", async () => {
    let n = 0;
    const c = createChrome({ profileDir: "p", find: () => "c", launch: async () => { if (n++ === 0) throw new Error("profile in use\nstack"); return fakeCtx(); } });
    await expect(c.context()).rejects.toMatchObject({ code: "UNREACHABLE", message: expect.stringContaining("profile in use") });
    await expect(c.context()).resolves.toBeTruthy();
  });
  it("close() shuts the Chrome it started", async () => {
    const x = fakeCtx();
    const c = createChrome({ profileDir: "p", find: () => "c", launch: async () => x });
    await c.context();
    await c.close();
    expect(x.closed).toBe(1);
  });
  it("no main-process code opens a debugging port", () => {
    for (const f of ["src/main/chrome.js", "src/main/index.js", "src/main/zimbra.js"]) {
      const src = fs.readFileSync(f, "utf8").replace(/\/\/.*$/gm, "");
      expect(src).not.toMatch(/remote-debugging-port|connectOverCDP/);
    }
  });
});
