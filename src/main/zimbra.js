import { ZimbraError } from "./zimbra.errors.js";
import { SELECTORS } from "./zimbra.selectors.js";
import { parseEmails } from "../shared/time.js";
export { ZimbraError };

// Prepare-only: opens a New Message and fills To/Subject/Body. There is deliberately no code
// here that locates or activates the control that transmits a message.
export function createZimbra({ getContext, selectors = SELECTORS }) {
  async function getPage(url) {
    let ctx;
    try { ctx = await getContext(); }
    catch (e) { throw e instanceof ZimbraError ? e : new ZimbraError("UNREACHABLE", "Unable to connect to Chrome: " + String(e.message || e)); }
    let page = ctx.pages().find(p => p.url().startsWith(url));
    if (!page) {
      // A freshly started Chrome has one blank tab: use it rather than leave it lying around.
      page = ctx.pages().find(p => p.url() === "about:blank") || (await ctx.newPage());
      await page.goto(url, { waitUntil: "domcontentloaded" });
    }
    await page.bringToFront();
    return page;
  }
  async function loggedIn(page) {
    await page.waitForSelector(`${selectors.mailMarker}, ${selectors.passwordField}`, { timeout: 20000 }).catch(() => {});
    if ((await page.locator(selectors.passwordField).count()) > 0) return false;
    return (await page.locator(selectors.mailMarker).count()) > 0;
  }
  return {
    async checkSession(url) { return (await loggedIn(await getPage(url))) ? "connected" : "login"; },
    async openPage(url) { await getPage(url); },
    async prepareMessage({ url, to, subject, body }, onStep = () => {}) {
      const page = await getPage(url);
      onStep(1);
      if (!(await loggedIn(page))) throw new ZimbraError("LOGIN", "Zimbra login required.");
      onStep(2);
      // Earlier compose tabs stay in the DOM hidden, so only visible matches count.
      const vis = sel => page.locator(sel).filter({ visible: true }).first();
      try {
        await page.locator(selectors.newMessage).first().click();
        // The To field runs autocomplete/bubble handlers: a bulk fill() gets clobbered and per-key
        // typing drops keystrokes while autocomplete is busy. Insert each address in one input
        // event, then press ";" so Zimbra commits it as a bubble.
        const toField = vis(selectors.to);
        const addrs = parseEmails(to);
        for (const addr of addrs) {
          await toField.focus();
          await page.keyboard.insertText(addr);
          await page.keyboard.press(";");
          await page.waitForTimeout(300);
        }
        // Read the To row back (bubble text and attributes) so a mangled address is never left silently.
        const seen = (await toField.evaluate(el => {
          const row = el.closest("tr") || el.parentElement?.parentElement || el;
          return [row.innerText, ...[...row.querySelectorAll("*")].flatMap(n => [...n.attributes].map(a => a.value))].join(" ");
        })).toLowerCase();
        const missing = addrs.filter(a => !seen.includes(a.toLowerCase()));
        if (missing.length) throw new Error("recipient not entered correctly: " + missing.join(", ") + ". Check the To field in Zimbra.");
        await vis(selectors.subject).fill(subject);
        await vis(`${selectors.body}, ${selectors.bodyFrame}`).waitFor();
        if (await vis(selectors.body).count()) await vis(selectors.body).fill(body);
        else await vis(selectors.bodyFrame).contentFrame().locator(selectors.bodyInFrame).first().fill(body);
      } catch (e) { throw new ZimbraError("COMPOSE", "Could not fill the Zimbra message: " + String(e.message || e).replace(/\x1b\[[0-9;]*m/g, "")); }
      onStep(3);
    }
  };
}
