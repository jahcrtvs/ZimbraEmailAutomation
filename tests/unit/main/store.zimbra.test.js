import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore, DEFAULTS, ZIMBRA_URL } from "../../../src/main/store.js";

let dir, store;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-storezm-")); store = createStore(dir); });
const writeSettings = obj => fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify(obj));

describe("settings.zimbra", () => {
  it("defaults to a placeholder address", () => {
    expect(ZIMBRA_URL).toBe("https://mail.example.com");
    expect(DEFAULTS().settings.zimbra.url).toBe(ZIMBRA_URL);
    expect(store.read("settings").zimbra.url).toBe(ZIMBRA_URL);
  });
  it("keeps an address the user typed in", () => {
    writeSettings({ zimbra: { url: "https://webmail.example.org" } });
    expect(store.read("settings").zimbra.url).toBe("https://webmail.example.org");
  });
  it("still migrates old AI settings in the same file", () => {
    writeSettings({ zimbra: { url: "https://webmail.example.org" }, ai: { provider: "gemini", model: "pro" } });
    const s = store.read("settings");
    expect(s.zimbra.url).toBe("https://webmail.example.org");
    expect(s.ai.fallback.provider).toBe("gemini");
  });
});
