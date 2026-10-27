// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationsScreen } from "../../../src/renderer/src/screens/Notifications.jsx";
import { SettingsScreen } from "../../../src/renderer/src/screens/Settings.jsx";
import { DEFAULTS } from "../../../src/main/store.js";

const at = "2026-10-28T08:30:00.000Z";
const list = [
  { id: "1", kind: "alarm", title: "Time for your Daily Digest", body: "", at, read: false },
  { id: "2", kind: "error", title: "Could not save settings", body: "disk full", at, read: true },
  { id: "3", kind: "update", title: "Daily Digest 9.0.0 is available", body: "", at, read: true }
];
const a = { clearNotifications() {}, downloadUpdate() {}, newDigest() {} };

describe("Notifications screen", () => {
  it("shows an empty state", () => {
    render(<NotificationsScreen s={{ notifications: [] }} a={a} />);
    expect(screen.getByText("No notifications.")).toBeTruthy();
    expect(screen.queryByText("Clear all")).toBeNull();
  });
  it("lists every kind and filters by kind", () => {
    render(<NotificationsScreen s={{ notifications: list }} a={a} />);
    expect(screen.getByText("Could not save settings")).toBeTruthy();
    expect(screen.getByLabelText("Unread")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Errors" }));
    expect(screen.queryByText("Time for your Daily Digest")).toBeNull();
    expect(screen.getByText("Could not save settings")).toBeTruthy();
  });
});

describe("Settings: daily alarm", () => {
  const s = () => ({ settings: DEFAULTS().settings, hasKey: { gemini: false, groq: false }, today: new Date(), zimbra: false, localStatus: null, audit: [] });
  it("is off and hides the time until turned on, then saves both", () => {
    let saved;
    render(<SettingsScreen s={s()} a={{ saveSettings: x => { saved = x; } }} />);
    expect(screen.queryByText("Alarm time")).toBeNull();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Alarm time")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Save(?! and)/ }));
    expect(saved.settings.alarm).toEqual({ enabled: true, time: "4:30 PM" });
  });
});
