// Usage: node scripts/probe-zimbra.mjs https://mail.company.local [chrome-profile folder]
// Quit Daily Digest first: this opens Chrome with the app's profile (default %APPDATA%\Daily Digest\chrome-profile).
// Open a New Message in that window, press Enter here, and it prints candidate selectors; copy the right
// ones into src/main/zimbra.selectors.js.
import { chromium } from "playwright-core";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { findChrome } from "../src/main/chrome.js";
const url = process.argv[2];
const profile = process.argv[3] || join(process.env.APPDATA, "Daily Digest", "chrome-profile");
const ctx = await chromium.launchPersistentContext(profile, { executablePath: findChrome(), headless: false, viewport: null });
await (ctx.pages()[0] || (await ctx.newPage())).goto(url);
const rl = createInterface({ input: process.stdin, output: process.stdout });
await rl.question("Sign in if needed, open a New Message, then press Enter here.");
rl.close();
const page = ctx.pages().find(p => p.url().startsWith(url));
if (!page) { console.error("No tab is showing", url); process.exit(1); }
for (const f of [page, ...page.frames()]) {
  const rows = await f.evaluate(() => [...document.querySelectorAll("input,textarea,[contenteditable=true],button,[role=button]")]
    .map(e => ({ tag: e.tagName.toLowerCase(), id: e.id, name: e.getAttribute("name"), aria: e.getAttribute("aria-label"), title: e.getAttribute("title"), text: (e.innerText || "").slice(0, 30) }))
    .filter(r => r.id || r.name || r.aria || r.title));
  console.log("FRAME", f.url());
  console.table(rows);
}
await ctx.close();
