import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore, DEFAULTS } from "../../../src/main/store.js";

let dir, store;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-storeai-")); store = createStore(dir); });
const writeSettings = obj => fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify(obj));

describe("settings.ai", () => {
  it("defaults to a local Ollama model with an ask-first Groq fallback", () => {
    expect(DEFAULTS().settings.ai).toEqual({
      local: { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" },
      fallback: { provider: "groq", auto: false },
      geminiModel: "flash",
      privacyTerms: ""
    });
    expect(store.read("audit")).toEqual([]);
  });
  it("migrates an old Gemini setup: Gemini becomes the ask-first fallback and the model is kept", () => {
    writeSettings({ ai: { provider: "gemini", model: "pro" }, profile: { name: "Sam", role: "Dev" } });
    const ai = store.read("settings").ai;
    expect(ai.fallback).toEqual({ provider: "gemini", auto: false });
    expect(ai.geminiModel).toBe("pro");
    expect(ai.local.model).toBe("qwen2.5:3b-instruct");
    expect(Object.keys(ai).sort()).toEqual(["fallback", "geminiModel", "local", "privacyTerms"]);
    expect(store.read("settings").profile.name).toBe("Sam");
  });
  it("migrates an old Groq setup", () => {
    writeSettings({ ai: { provider: "groq", model: "flash" } });
    expect(store.read("settings").ai.fallback.provider).toBe("groq");
  });
  it("does not touch settings that already have the new shape", () => {
    writeSettings({ ai: { local: { baseUrl: "http://localhost:1234/v1", model: "m" }, fallback: { provider: "none", auto: true }, geminiModel: "pro", privacyTerms: "Acme" } });
    const ai = store.read("settings").ai;
    expect(ai.local).toEqual({ baseUrl: "http://localhost:1234/v1", model: "m" });
    expect(ai.fallback).toEqual({ provider: "none", auto: true });
    expect(ai.privacyTerms).toBe("Acme");
  });
  it("ignores junk values in the ai section", () => {
    writeSettings({ ai: { local: "oops", fallback: 5 } });
    expect(store.read("settings").ai).toEqual(DEFAULTS().settings.ai);
  });
});
