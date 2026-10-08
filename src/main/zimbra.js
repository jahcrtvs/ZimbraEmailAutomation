import { ZimbraError } from "./zimbra.errors.js";
import { SELECTORS } from "./zimbra.selectors.js";
export { ZimbraError };

// Prepare-only: opens a New Message and fills To/Subject/Body. There is deliberately no code
// here that locates or activates the control that transmits a message.
export function createZimbra({ connect, ensure, selectors = SELECTORS }) {
  async function getPage(url) {
    await ensure(url);
    let browser;
    try { browser = await connect(); }
    catch (e) { throw new ZimbraError("UNREACHABLE", "Unable to connect to Chrome: " + String(e.message || e)); }
    const ctx = browser.contexts()[0] || (await browser.newContext());
    let page = ctx.pages().find(p => p.url().startsWith(url));
    if (page) await page.bringToFront();
    else { page = await ctx.newPage(); await page.goto(url, { waitUntil: "domcontentloaded" }); }
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
      try {
        await page.locator(selectors.newMessage).first().click();
        await page.locator(selectors.to).first().fill(to);
        await page.locator(selectors.subject).first().fill(subject);
        const scope = selectors.bodyFrame ? page.frameLocator(selectors.bodyFrame) : page;
        await scope.locator(selectors.body).first().fill(body);
      } catch (e) { throw new ZimbraError("COMPOSE", "Could not fill the Zimbra message: " + String(e.message || e)); }
      onStep(3);
    }
  };
}
