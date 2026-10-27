import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore, DEFAULTS, ZIMBRA_URL } from "../../../src/main/store.js";

let dir, store;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-storezm-")); store = createStore(dir); });
const writeSettings = obj => fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify(obj));

describe("settings.zimbra", () => {
  it("defaults to the company Zimbra address", () => {
    expect(ZIMBRA_URL).toBe("https://mail1.77global.biz");
    expect(DEFAULTS().settings.zimbra.url).toBe(ZIMBRA_URL);
    expect(store.read("settings").zimbra.url).toBe(ZIMBRA_URL);
  });
  it("moves an install still on the old placeholder to the company address", () => {
    writeSettings({ zimbra: { url: "https://mail.company.local" }, profile: { name: "Sam", role: "Dev" } });
    expect(store.read("settings").zimbra.url).toBe(ZIMBRA_URL);
    expect(store.read("settings").profile.name).toBe("Sam");
  });
  it("keeps an address the user typed in", () => {
    writeSettings({ zimbra: { url: "https://webmail.example.org" } });
    expect(store.read("settings").zimbra.url).toBe("https://webmail.example.org");
  });
  it("still migrates old AI settings in the same file", () => {
    writeSettings({ zimbra: { url: "https://mail.company.local" }, ai: { provider: "gemini", model: "pro" } });
    const s = store.read("settings");
    expect(s.zimbra.url).toBe(ZIMBRA_URL);
    expect(s.ai.fallback.provider).toBe("gemini");
  });
});
