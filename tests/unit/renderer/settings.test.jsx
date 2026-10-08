// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsScreen } from "../../../src/renderer/src/screens/Settings.jsx";
import { DEFAULTS } from "../../../src/main/store.js";

const state = (provider, hasKey) => {
  const settings = DEFAULTS().settings;
  settings.ai.provider = provider;
  return { settings, hasKey, today: new Date(), zimbra: false, testing: false, testingAI: false };
};
const a = { saveSettings() {}, testAI() {}, testZimbra() {}, openZimbra() {} };

describe("Settings AI provider card", () => {
  it("key placeholder reflects the selected provider's saved state", () => {
    const { unmount } = render(<SettingsScreen s={state("groq", { gemini: true, groq: false })} a={a} />);
    expect(screen.getByPlaceholderText("Paste your key")).toBeTruthy();
    unmount();
    render(<SettingsScreen s={state("gemini", { gemini: true, groq: false })} a={a} />);
    expect(screen.getByPlaceholderText("Saved")).toBeTruthy();
  });
  it("hides the Gemini model select for Groq", () => {
    render(<SettingsScreen s={state("groq", { gemini: false, groq: true })} a={a} />);
    expect(screen.getByPlaceholderText("Saved")).toBeTruthy();
    expect(screen.queryByText("Model")).toBeNull();
  });
});
