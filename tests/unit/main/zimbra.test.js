import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { createZimbra, ZimbraError } from "../../../src/main/zimbra.js";
import { SELECTORS } from "../../../src/main/zimbra.selectors.js";

function fakeBrowser({ loggedIn = true, hasPage = false, htmlBody = false } = {}) {
  const log = [];
  const locator = sel => ({
    count: async () => (sel === SELECTORS.passwordField ? (loggedIn ? 0 : 1) : sel === SELECTORS.mailMarker ? (loggedIn ? 1 : 0) : sel === SELECTORS.body && htmlBody ? 0 : 1),
    click: async () => log.push(["click", sel]),
    fill: async v => log.push(["fill", sel, v]),
    waitFor: async () => {},
    contentFrame: () => ({ locator: s => locator("frame:" + s) }),
    filter() { return this; },
    first() { return this; }
  });
  const page = {
    url: () => "https://z/mail",
    goto: async u => log.push(["goto", u]),
    bringToFront: async () => log.push(["front"]),
    waitForSelector: async () => {},
    locator, frameLocator: () => ({ locator })
  };
  const ctx = { pages: () => (hasPage ? [page] : []), newPage: async () => page };
  return { log, browser: { contexts: () => [ctx], newContext: async () => ctx } };
}

describe("zimbra", () => {
  it("exposes exactly checkSession, prepareMessage, openPage", () => {
    const z = createZimbra({ connect: async () => fakeBrowser().browser, ensure: async () => {} });
    expect(Object.keys(z).sort()).toEqual(["checkSession", "openPage", "prepareMessage"]);
  });
  it("has no send selector and exactly one click in its source", () => {
    expect(Object.entries(SELECTORS).some(([k, v]) => /send/i.test(k) || /send/i.test(String(v)))).toBe(false);
    const src = fs.readFileSync("src/main/zimbra.js", "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect([...src.matchAll(/\.click\(/g)].length).toBe(1);
  });
  it("prepares a message: steps 1,2,3, fills To/Subject/Body, never touches a send control", async () => {
    const { browser, log } = fakeBrowser();
    const z = createZimbra({ connect: async () => browser, ensure: async () => {} });
    const steps = [];
    await z.prepareMessage({ url: "https://z", to: "a@b.co", subject: "Subj", body: "Body" }, n => steps.push(n));
    expect(steps).toEqual([1, 2, 3]);
    expect(log).toEqual(expect.arrayContaining([["fill", SELECTORS.to, "a@b.co"], ["fill", SELECTORS.subject, "Subj"], ["fill", SELECTORS.body, "Body"]]));
    expect(log.some(e => /send/i.test(JSON.stringify(e)))).toBe(false);
  });
  it("fills the TinyMCE iframe body when there is no visible plain-text body", async () => {
    const { browser, log } = fakeBrowser({ htmlBody: true });
    const z = createZimbra({ connect: async () => browser, ensure: async () => {} });
    await z.prepareMessage({ url: "https://z", to: "a@b.co", subject: "s", body: "Body" }, () => {});
    expect(log).toContainEqual(["fill", "frame:" + SELECTORS.bodyInFrame, "Body"]);
    expect(log.some(e => e[0] === "fill" && e[1] === SELECTORS.body)).toBe(false);
  });
  it("throws COMPOSE when the compose fields cannot be filled", async () => {
    const { browser } = fakeBrowser();
    const b = { ...browser, contexts: () => [{ pages: () => [], newPage: async () => { const p = await browser.contexts()[0].newPage(); return { ...p, locator: s => ({ ...p.locator(s), fill: async () => { throw new Error("timeout"); } }) }; } }] };
    const z = createZimbra({ connect: async () => b, ensure: async () => {} });
    await expect(z.prepareMessage({ url: "https://z", to: "a", subject: "s", body: "b" }, () => {})).rejects.toMatchObject({ code: "COMPOSE" });
  });
  it("throws LOGIN when the login form is showing, before touching compose", async () => {
    const { browser, log } = fakeBrowser({ loggedIn: false });
    const z = createZimbra({ connect: async () => browser, ensure: async () => {} });
    await expect(z.prepareMessage({ url: "https://z", to: "a@b.co", subject: "s", body: "b" }, () => {})).rejects.toMatchObject({ code: "LOGIN" });
    expect(log.some(e => e[0] === "fill")).toBe(false);
  });
  it("checkSession reports login / connected / unreachable", async () => {
    expect(await createZimbra({ connect: async () => fakeBrowser({ loggedIn: false }).browser, ensure: async () => {} }).checkSession("https://z")).toBe("login");
    expect(await createZimbra({ connect: async () => fakeBrowser().browser, ensure: async () => {} }).checkSession("https://z")).toBe("connected");
    await expect(createZimbra({ connect: async () => { throw new Error("ECONNREFUSED"); }, ensure: async () => {} }).checkSession("https://z")).rejects.toMatchObject({ code: "UNREACHABLE" });
  });
  it("propagates ensure() errors (no Chrome)", async () => {
    const z = createZimbra({ connect: async () => fakeBrowser().browser, ensure: async () => { throw new ZimbraError("NO_CHROME", "x"); } });
    await expect(z.checkSession("https://z")).rejects.toMatchObject({ code: "NO_CHROME" });
  });
});
