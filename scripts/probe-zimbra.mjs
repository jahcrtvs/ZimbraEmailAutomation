// Usage: node scripts/probe-zimbra.mjs https://mail.company.local
// Requires Chrome running with --remote-debugging-port=9222 (use the app's "Open Zimbra" once to start it),
// signed in to Zimbra with the compose window open. Prints candidate selectors; copy the right ones
// into src/main/zimbra.selectors.js.
import { chromium } from "playwright-core";
const url = process.argv[2];
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser.contexts()[0].pages().find(p => p.url().startsWith(url));
if (!page) { console.error("Open", url, "in the debug Chrome first."); process.exit(1); }
for (const f of [page, ...page.frames()]) {
  const rows = await f.evaluate(() => [...document.querySelectorAll("input,textarea,[contenteditable=true],button,[role=button]")]
    .map(e => ({ tag: e.tagName.toLowerCase(), id: e.id, name: e.getAttribute("name"), aria: e.getAttribute("aria-label"), title: e.getAttribute("title"), text: (e.innerText || "").slice(0, 30) }))
    .filter(r => r.id || r.name || r.aria || r.title));
  console.log("FRAME", f.url());
  console.table(rows);
}
await browser.close();
