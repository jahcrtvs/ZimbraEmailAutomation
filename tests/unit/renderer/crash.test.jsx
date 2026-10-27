// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ErrorBoundary, reportError } from "../../../src/renderer/src/screens/CrashScreen.jsx";
import { App } from "../../../src/renderer/src/App.jsx";

const Broken = () => { throw new Error("render failed"); };
const noop = () => () => {};

afterEach(() => { delete window.api; vi.restoreAllMocks(); });

describe("error boundary", () => {
  it("shows a reload screen and logs the error instead of an empty window", async () => {
    // React re-throws the render error to the window in development; keep jsdom from printing it.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const quiet = e => e.preventDefault();
    window.addEventListener("error", quiet);
    const logged = [];
    window.api = { logError: async e => { logged.push(e); return true; } };
    render(<ErrorBoundary><Broken /></ErrorBoundary>);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("render failed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    await waitFor(() => expect(logged).toHaveLength(1));
    expect(logged[0]).toMatchObject({ where: "screen", message: "render failed" });
    window.removeEventListener("error", quiet);
  });
  it("shows the app when nothing fails", () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(screen.getByText("fine")).toBeTruthy();
  });
});

describe("reportError", () => {
  it("never throws, even without the bridge or when logging fails", async () => {
    expect(() => reportError("x", new Error("a"))).not.toThrow();
    window.api = { logError: async () => { throw new Error("no"); } };
    expect(() => reportError("x", "b")).not.toThrow();
    await new Promise(r => setTimeout(r, 0));
  });
});

describe("app start", () => {
  it("explains a failed load instead of staying empty", async () => {
    window.api = {
      store: { load: async () => { throw { code: "ERROR", message: "disk unreadable" }; }, save: async () => true },
      schedule: { onChanged: noop },
      zimbra: { onStep: noop, check: async () => "connected" },
      onGenerateProgress: noop
    };
    render(<App />);
    expect(await screen.findByText("Daily Digest could not load your data")).toBeTruthy();
    expect(screen.getByText("disk unreadable")).toBeTruthy();
  });
});
