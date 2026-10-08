import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ZimbraError } from "./zimbra.errors.js";

export function findChrome(env = process.env, exists = fs.existsSync) {
  const rel = ["Google", "Chrome", "Application", "chrome.exe"];
  for (const base of [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA]) {
    if (!base) continue;
    const p = path.win32.join(base, ...rel);
    if (exists(p)) return p;
  }
  return null;
}

export async function isDebugPortUp(port, fetchImpl = fetch) {
  try { return (await fetchImpl(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; }
}

export async function ensureChrome({ port, profileDir, url, spawnImpl = spawn, find = findChrome, isUp = isDebugPortUp, wait = ms => new Promise(r => setTimeout(r, ms)), timeoutMs = 15000 }) {
  if (await isUp(port)) return;
  const exe = find();
  if (!exe) throw new ZimbraError("NO_CHROME", "Google Chrome was not found on this computer.");
  spawnImpl(exe, [`--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run", url], { detached: true, stdio: "ignore" }).unref();
  for (let waited = 0; waited < timeoutMs; waited += 500) {
    await wait(500);
    if (await isUp(port)) return;
  }
  throw new ZimbraError("UNREACHABLE", "Chrome did not open its debugging port.");
}
