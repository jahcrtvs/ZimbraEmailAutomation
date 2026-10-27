import fs from "node:fs";
import path from "node:path";

const MAX_BYTES = 256 * 1024;
const MAX_TEXT = 4000;
const RELOADS = 3, RELOAD_WINDOW_MS = 60000;

const text = e => e instanceof Error ? (e.stack || e.message) : e && typeof e === "object" ? String(e.stack || e.message || JSON.stringify(e)) : String(e);

// crash.log in the app data folder: error text and stack only, so there is something to look at after a crash.
// Logging must never throw, or it would turn one error into two.
export function createCrashLog(file, now = () => new Date()) {
  function log(where, err) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      try { if (fs.statSync(file).size > MAX_BYTES) fs.renameSync(file, file + ".old"); } catch { /* no log yet */ }
      fs.appendFileSync(file, `[${now().toISOString()}] ${where}: ${text(err).slice(0, MAX_TEXT)}\n`);
    } catch { /* nowhere to write; keep running */ }
  }
  return { file, log };
}

// Log and keep running, so a digest that is scheduled can still be prepared.
export function catchUncaught(proc, log) {
  proc.on("uncaughtException", e => log("main", e));
  proc.on("unhandledRejection", e => log("main (promise)", e));
}

// Reload the window when its page crashes. A page that keeps crashing on load is not reloaded forever.
export function watchRenderer(wc, log, { onGiveUp = () => {}, now = () => Date.now() } = {}) {
  let recent = [];
  wc.on("render-process-gone", (_e, d) => {
    log("window", new Error(`page gone: ${d.reason} (exit code ${d.exitCode})`));
    if (d.reason === "clean-exit" || wc.isDestroyed()) return;
    const t = now();
    recent = recent.filter(x => t - x < RELOAD_WINDOW_MS);
    if (recent.length >= RELOADS) { onGiveUp(); return; }
    recent.push(t);
    wc.reload();
  });
  wc.on("unresponsive", () => log("window", new Error("page stopped responding")));
}
