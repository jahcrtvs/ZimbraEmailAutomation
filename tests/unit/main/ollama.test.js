import { describe, it, expect } from "vitest";
import { findOllama, createOllamaStarter } from "../../../src/main/ollama.js";

const local = { baseUrl: "http://localhost:11434/v1", model: "m" };
const ok = { ok: true }, down = async () => { throw new TypeError("fetch failed"); };

describe("findOllama", () => {
  it("finds the per-user install first", () => {
    const env = { LOCALAPPDATA: "C:\\LA", ProgramFiles: "C:\\PF" };
    expect(findOllama(env, () => true)).toBe("C:\\LA\\Programs\\Ollama\\ollama.exe");
    expect(findOllama(env, p => p.startsWith("C:\\PF"))).toBe("C:\\PF\\Ollama\\ollama.exe");
    expect(findOllama(env, () => false)).toBeNull();
  });
});

describe("createOllamaStarter", () => {
  it("starts ollama serve hidden and waits until it answers", async () => {
    let spawned, n = 0;
    const start = createOllamaStarter({ find: () => "ollama.exe", wait: async () => {}, fetchImpl: async () => (++n > 2 ? ok : { ok: false }), spawnImpl: (exe, args, opts) => { spawned = [exe, args, opts]; return { unref() {} }; } });
    expect(await start(local)).toBe(true);
    expect(spawned[0]).toBe("ollama.exe");
    expect(spawned[1]).toEqual(["serve"]);
    expect(spawned[2]).toMatchObject({ windowsHide: true });
  });
  it("does not start a second copy when one already answers", async () => {
    let spawned = false;
    const start = createOllamaStarter({ find: () => "o", fetchImpl: async () => ok, spawnImpl: () => { spawned = true; } });
    expect(await start(local)).toBe(true);
    expect(spawned).toBe(false);
  });
  it("never starts anything for a server that is not on this computer, or when Ollama is not installed", async () => {
    let spawned = false;
    const spawnImpl = () => { spawned = true; return { unref() {} }; };
    expect(await createOllamaStarter({ find: () => "o", fetchImpl: down, spawnImpl }) ({ ...local, baseUrl: "http://192.168.1.5:11434/v1" })).toBe(false);
    expect(await createOllamaStarter({ find: () => null, fetchImpl: down, spawnImpl })(local)).toBe(false);
    expect(spawned).toBe(false);
  });
  it("gives up when it never answers", async () => {
    const start = createOllamaStarter({ find: () => "o", wait: async () => {}, timeoutMs: 3, fetchImpl: down, spawnImpl: () => ({ unref() {} }) });
    expect(await start(local)).toBe(false);
  });
  it("starts it once for calls made at the same time", async () => {
    let spawns = 0, n = 0;
    const start = createOllamaStarter({ find: () => "o", wait: async () => {}, fetchImpl: async () => (++n > 2 ? ok : { ok: false }), spawnImpl: () => { spawns++; return { unref() {} }; } });
    await Promise.all([start(local), start(local)]);
    expect(spawns).toBe(1);
  });
});
