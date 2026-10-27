import fs from "node:fs";
import path from "node:path";
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

// Chrome is driven over a pipe, never a debugging port, so no other program on this computer
// can attach to the signed-in Zimbra session. The Chrome window closes when the app quits.
export function createChrome({ profileDir, launch, find = findChrome }) {
  let pending = null;
  async function start() {
    const exe = find();
    if (!exe) throw new ZimbraError("NO_CHROME", "Google Chrome was not found on this computer.");
    let ctx;
    try {
      ctx = await launch(profileDir, { executablePath: exe, headless: false, viewport: null, args: ["--no-first-run"], ignoreDefaultArgs: ["--enable-automation"] });
    } catch (e) {
      throw new ZimbraError("UNREACHABLE", "Could not start Chrome. If a Chrome window opened by Daily Digest is still open, close it and retry. " + String(e.message || e).split("\n")[0]);
    }
    ctx.on("close", () => { pending = null; });
    return ctx;
  }
  return {
    context() {
      if (!pending) pending = start().catch(e => { pending = null; throw e; });
      return pending;
    },
    isOpen: () => pending !== null,
    async close() {
      const p = pending;
      pending = null;
      if (p) await p.then(c => c.close(), () => {}).catch(() => {});
    }
  };
}
