import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { isLoopbackUrl } from "../shared/ai.js";

export function findOllama(env = process.env, exists = fs.existsSync) {
  for (const base of [env.LOCALAPPDATA && path.win32.join(env.LOCALAPPDATA, "Programs", "Ollama"), env.ProgramFiles && path.win32.join(env.ProgramFiles, "Ollama")]) {
    if (!base) continue;
    const p = path.win32.join(base, "ollama.exe");
    if (exists(p)) return p;
  }
  return null;
}

// Starts an installed Ollama that is not running, for a server address on this computer.
// Resolves true once it answers, false if it is not installed or does not come up in time.
export function createOllamaStarter({ fetchImpl = fetch, spawnImpl = spawn, find = findOllama, wait = ms => new Promise(r => setTimeout(r, ms)), timeoutMs = 20000 } = {}) {
  let starting = null;
  const up = async url => { try { return (await fetchImpl(url, { signal: AbortSignal.timeout(2000) })).ok; } catch { return false; } };
  async function start(local) {
    if (!isLoopbackUrl(local?.baseUrl)) return false;
    const exe = find();
    if (!exe) return false;
    const models = String(local.baseUrl).trim().replace(/\/+$/, "") + "/models";
    if (await up(models)) return true;
    spawnImpl(exe, ["serve"], { stdio: "ignore", windowsHide: true }).unref();
    for (let waited = 0; waited < timeoutMs; waited += 500) {
      await wait(500);
      if (await up(models)) return true;
    }
    return false;
  }
  return local => {
    if (!starting) starting = start(local).finally(() => { starting = null; });
    return starting;
  };
}
