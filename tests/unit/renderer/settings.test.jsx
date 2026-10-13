// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsScreen } from "../../../src/renderer/src/screens/Settings.jsx";
import { DEFAULTS } from "../../../src/main/store.js";

const state = (fallback, hasKey, local = {}, extra = {}) => {
  const settings = DEFAULTS().settings;
  settings.ai.fallback.provider = fallback;
  Object.assign(settings.ai.local, local);
  return { settings, hasKey, today: new Date(), zimbra: false, testing: false, testingAI: false, checkingLocal: false, localStatus: null, audit: [], ...extra };
};
const a = { saveSettings() {}, testAI() {}, checkLocal() {}, testZimbra() {}, openZimbra() {} };
const none = { gemini: false, groq: false };

describe("Settings: local AI card", () => {
  it("shows the stored server address and model", () => {
    render(<SettingsScreen s={state("none", none)} a={a} />);
    expect(screen.getByDisplayValue("http://localhost:11434/v1")).toBeTruthy();
    expect(screen.getByDisplayValue("qwen2.5:3b-instruct")).toBeTruthy();
  });
  it("shows no warnings for the defaults", () => {
    render(<SettingsScreen s={state("none", none)} a={a} />);
    expect(screen.queryByText("This is a cloud model.")).toBeNull();
    expect(screen.queryByText("This address is not on this computer.")).toBeNull();
  });
  it("warns about Ollama cloud models, however they are named", () => {
    for (const model of ["gpt-oss:120b-cloud", "glm-5.3-flash:cloud"]) {
      const { unmount } = render(<SettingsScreen s={state("none", none, { model })} a={a} />);
      expect(screen.getByText("This is a cloud model.")).toBeTruthy();
      unmount();
    }
  });
  it("warns when the server is not on this computer", () => {
    render(<SettingsScreen s={state("none", none, { baseUrl: "http://192.168.1.5:11434/v1" })} a={a} />);
    expect(screen.getByText("This address is not on this computer.")).toBeTruthy();
  });
  it("tells the user the exact command when the model is missing", () => {
    const localStatus = { state: "no-model", detail: "x", command: "ollama pull qwen2.5:3b-instruct" };
    render(<SettingsScreen s={state("none", none, {}, { localStatus })} a={a} />);
    expect(screen.getByText("Model not installed.")).toBeTruthy();
    expect(screen.getByText("ollama pull qwen2.5:3b-instruct")).toBeTruthy();
  });
  it("explains a server that is not running", () => {
    const localStatus = { state: "no-server", detail: "Nothing is answering at http://localhost:11434/v1. Install Ollama from https://ollama.com/download and make sure it is running." };
    render(<SettingsScreen s={state("none", none, {}, { localStatus })} a={a} />);
    expect(screen.getByText("Local AI is not running.")).toBeTruthy();
    expect(screen.getByText(/Install Ollama/)).toBeTruthy();
  });
});

describe("Settings: cloud fallback card", () => {
  it("key placeholder reflects the chosen provider's saved state", () => {
    const { unmount } = render(<SettingsScreen s={state("groq", { gemini: true, groq: false })} a={a} />);
    expect(screen.getByPlaceholderText("Paste your key")).toBeTruthy();
    unmount();
    render(<SettingsScreen s={state("gemini", { gemini: true, groq: false })} a={a} />);
    expect(screen.getByPlaceholderText("Saved")).toBeTruthy();
  });
  it("shows the Gemini model and the free-tier warning only for Gemini", () => {
    const { unmount } = render(<SettingsScreen s={state("groq", { gemini: false, groq: true })} a={a} />);
    expect(screen.queryByText("Gemini model")).toBeNull();
    expect(screen.queryByText("Free Gemini use may be used by Google.")).toBeNull();
    unmount();
    render(<SettingsScreen s={state("gemini", { gemini: true, groq: false })} a={a} />);
    expect(screen.getByText("Gemini model")).toBeTruthy();
    expect(screen.getByText("Free Gemini use may be used by Google.")).toBeTruthy();
  });
  it("hides the key and privacy fields when there is no fallback", () => {
    render(<SettingsScreen s={state("none", { gemini: true, groq: true })} a={a} />);
    expect(screen.queryByPlaceholderText("Saved")).toBeNull();
    expect(screen.queryByPlaceholderText("Paste your key")).toBeNull();
    expect(screen.queryByText("Words to hide from cloud services")).toBeNull();
  });
  it("lists the most recent cloud sends without any content", () => {
    const audit = [{ at: "2026-10-13T01:02:03.000Z", provider: "groq", reason: "UNREACHABLE", chars: 120 }];
    render(<SettingsScreen s={state("groq", { gemini: false, groq: true }, {}, { audit })} a={a} />);
    expect(screen.getByText(/Groq · UNREACHABLE · 120 characters/)).toBeTruthy();
  });
});
