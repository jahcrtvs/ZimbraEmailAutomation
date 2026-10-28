import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { createZimbra, ZimbraError } from "../../../src/main/zimbra.js";
import { SELECTORS } from "../../../src/main/zimbra.selectors.js";

function fakeBrowser({ loggedIn = true, hasPage = false, htmlBody = false, toShows = null } = {}) {
  const log = [];
  const typed = () => log.filter(e => e[0] === "insert").map(e => e[1]).join(" ");
  const locator = sel => ({
    count: async () => (sel === SELECTORS.passwordField ? (loggedIn ? 0 : 1) : sel === SELECTORS.mailMarker ? (loggedIn ? 1 : 0) : sel === SELECTORS.body && htmlBody ? 0 : 1),
    click: async () => log.push(["click", sel]),
    fill: async v => log.push(["fill", sel, v]),
    focus: async () => log.push(["focus", sel]),
    evaluate: async () => (toShows ?? typed()),
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
    waitForTimeout: async () => {},
    keyboard: { insertText: async t => log.push(["insert", t]), press: async k => log.push(["press", k]) },
    locator, frameLocator: () => ({ locator })
  };
  const ctx = { pages: () => (hasPage ? [page] : []), newPage: async () => page };
  return { log, ctx };
}

describe("zimbra", () => {
  it("exposes exactly checkSession, prepareMessage, openPage", () => {
    const z = createZimbra({ getContext: async () => fakeBrowser().ctx });
    expect(Object.keys(z).sort()).toEqual(["checkSession", "openPage", "prepareMessage"]);
  });
  it("has no send selector and exactly one click in its source", () => {
    expect(Object.entries(SELECTORS).some(([k, v]) => /send/i.test(k) || /send/i.test(String(v)))).toBe(false);
    const src = fs.readFileSync("src/main/zimbra.js", "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect([...src.matchAll(/\.click\(/g)].length).toBe(1);
  });
  it("prepares a message: steps 1,2,3, fills To/Subject/Body, never touches a send control", async () => {
    const { ctx, log } = fakeBrowser();
    const z = createZimbra({ getContext: async () => ctx });
    const steps = [];
    await z.prepareMessage({ url: "https://z", to: "a@b.co", subject: "Subj", body: "Body" }, n => steps.push(n));
    expect(steps).toEqual([1, 2, 3]);
    expect(log).toEqual(expect.arrayContaining([["focus", SELECTORS.to], ["insert", "a@b.co"], ["press", ";"], ["fill", SELECTORS.subject, "Subj"], ["fill", SELECTORS.body, "Body"]]));
    expect(log.some(e => /send/i.test(JSON.stringify(e)))).toBe(false);
  });
  it("inserts each of several recipients, each committed with ';'", async () => {
    const { ctx, log } = fakeBrowser();
    const z = createZimbra({ getContext: async () => ctx });
    await z.prepareMessage({ url: "https://z", to: "a@x.com, b@y.org", subject: "s", body: "b" }, () => {});
    expect(log.filter(e => e[0] === "insert" || e[0] === "press")).toEqual([["insert", "a@x.com"], ["press", ";"], ["insert", "b@y.org"], ["press", ";"]]);
  });
  it("throws COMPOSE naming the recipient Zimbra mangled", async () => {
    const { ctx } = fakeBrowser({ toShows: "sam@exampl.com" });
    const z = createZimbra({ getContext: async () => ctx });
    await expect(z.prepareMessage({ url: "https://z", to: "sam@example.com", subject: "s", body: "b" }, () => {}))
      .rejects.toMatchObject({ code: "COMPOSE", message: expect.stringContaining("sam@example.com") });
  });
  it("fills the TinyMCE iframe body when there is no visible plain-text body", async () => {
    const { ctx, log } = fakeBrowser({ htmlBody: true });
    const z = createZimbra({ getContext: async () => ctx });
    await z.prepareMessage({ url: "https://z", to: "a@b.co", subject: "s", body: "Body" }, () => {});
    expect(log).toContainEqual(["fill", "frame:" + SELECTORS.bodyInFrame, "Body"]);
    expect(log.some(e => e[0] === "fill" && e[1] === SELECTORS.body)).toBe(false);
  });
  it("throws COMPOSE when the compose fields cannot be filled", async () => {
    const { ctx } = fakeBrowser();
    const b = { pages: () => [], newPage: async () => { const p = await ctx.newPage(); return { ...p, locator: s => ({ ...p.locator(s), fill: async () => { throw new Error("timeout"); } }) }; } };
    const z = createZimbra({ getContext: async () => b });
    await expect(z.prepareMessage({ url: "https://z", to: "a", subject: "s", body: "b" }, () => {})).rejects.toMatchObject({ code: "COMPOSE" });
  });
  it("throws LOGIN when the login form is showing, before touching compose", async () => {
    const { ctx, log } = fakeBrowser({ loggedIn: false });
    const z = createZimbra({ getContext: async () => ctx });
    await expect(z.prepareMessage({ url: "https://z", to: "a@b.co", subject: "s", body: "b" }, () => {})).rejects.toMatchObject({ code: "LOGIN" });
    expect(log.some(e => e[0] === "fill")).toBe(false);
  });
  it("checkSession reports login / connected / unreachable", async () => {
    expect(await createZimbra({ getContext: async () => fakeBrowser({ loggedIn: false }).ctx }).checkSession("https://z")).toBe("login");
    expect(await createZimbra({ getContext: async () => fakeBrowser().ctx }).checkSession("https://z")).toBe("connected");
    await expect(createZimbra({ getContext: async () => { throw new Error("ECONNREFUSED"); } }).checkSession("https://z")).rejects.toMatchObject({ code: "UNREACHABLE" });
  });
  it("propagates Chrome launch errors (no Chrome)", async () => {
    const z = createZimbra({ getContext: async () => { throw new ZimbraError("NO_CHROME", "x"); } });
    await expect(z.checkSession("https://z")).rejects.toMatchObject({ code: "NO_CHROME" });
  });
  it("opens Zimbra in the blank tab of a freshly started Chrome", async () => {
    const { ctx, log } = fakeBrowser();
    let opened = 0;
    const blank = { url: () => "about:blank", goto: async u => log.push(["blank-goto", u]), bringToFront: async () => {} };
    const z = createZimbra({ getContext: async () => ({ pages: () => [blank], newPage: async () => { opened++; return ctx.newPage(); } }) });
    await z.openPage("https://z");
    expect(log).toContainEqual(["blank-goto", "https://z"]);
    expect(opened).toBe(0);
  });
});
