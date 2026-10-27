// Takes the product screenshots the landing page shows, from the real app.
// Usage (from the repo root, after `npm run build`, with Ollama and the default model installed):
//   node site/scripts/capture-app.mjs
// It starts the built app on throwaway data folders with a made-up profile, so nothing personal is on screen,
// and writes PNGs into site/public/screens. Re-run it after the app's interface changes.
//   Phase 1 runs the real local AI (notes, report, settings).
//   Phase 2 runs the app's test mode (no network, a fake Zimbra) for the two moments that need it:
//   the prompt before notes could leave the computer, and the "email ready in Zimbra" step.
import { _electron as electron } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(root, "site", "public", "screens");
fs.mkdirSync(out, { recursive: true });

async function open(env) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-capture-"));
  fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ profile: { name: "Alex Rivera", role: "Trainee" }, app: { startWithWindows: false } }));
  const app = await electron.launch({ args: ["."], cwd: root, env: { ...process.env, DD_USER_DATA: dir, ...env } });
  const w = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => { const b = BrowserWindow.getAllWindows()[0]; b.setContentSize(1440, 900); b.center(); });
  await w.waitForTimeout(800);
  const done = async () => { await app.close(); fs.rmSync(dir, { recursive: true, force: true }); };
  return { w, done };
}
const save = async (target, name, opts = {}) => { await target.screenshot({ path: path.join(out, name + ".png"), ...opts }); console.log("wrote", name); };

// Phase 1: the real local AI.
{
  const { w, done } = await open({});
  await w.getByRole("button", { name: "Use example notes" }).click();
  await w.waitForTimeout(400);
  await save(w, "notes");

  await w.getByRole("button", { name: /Generate Digest/ }).click();
  await w.getByText("Ready for Review").waitFor({ timeout: 240000 });
  await w.waitForTimeout(600);
  await save(w, "report");

  await w.getByRole("button", { name: "Settings" }).click();
  await w.getByRole("button", { name: "Save and check" }).scrollIntoViewIfNeeded();
  await w.getByRole("button", { name: "Save and check" }).click();
  await w.getByText("Ready", { exact: true }).waitFor({ timeout: 15000 });
  await w.waitForTimeout(500);
  const at = await w.getByText("Runs on this computer through Ollama. Your notes stay here.").boundingBox();
  await save(w, "local-ai", { clip: { x: 224, y: Math.round(at.y - 54), width: 744, height: 232 } });
  await done();
}

// Phase 2: test mode, so no notes are sent anywhere and Zimbra is a stand-in.
{
  const { w, done } = await open({ DD_TEST: "1" });
  await w.evaluate(() => window.api.setApiKey("sample-key-not-real", "groq"));
  await w.getByLabel("Today's Work").fill("emailed priya@example.com about the staging build\nfixed login redirect after timeout");
  await w.getByLabel("Tomorrow").fill("review the pull request on https://git.example.com/app/pull/12");
  await w.getByRole("button", { name: /Generate Digest/ }).click();
  await w.getByRole("dialog").waitFor({ timeout: 20000 });
  await w.waitForTimeout(600);
  await save(w.getByRole("dialog"), "consent");
  await w.getByRole("button", { name: "Use plain template" }).click();
  await w.getByText("Ready for Review").waitFor({ timeout: 20000 });

  await w.getByRole("button", { name: "Send Now" }).click();
  await w.getByRole("dialog").waitFor();
  await w.waitForTimeout(500);
  await save(w.getByRole("dialog"), "send");
  await w.getByRole("button", { name: /Prepare in Zimbra/ }).click();
  await w.getByText("Email ready in Zimbra").waitFor({ timeout: 20000 });
  await w.waitForTimeout(500);
  await save(w.getByRole("dialog"), "ready");
  await done();
}
