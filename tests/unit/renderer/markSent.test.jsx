// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useApp } from "../../../src/renderer/src/useApp.js";
import { DEFAULTS } from "../../../src/main/store.js";

const noop = () => () => {};
const fakeApi = save => ({
  store: { load: async () => ({ ...DEFAULTS(), hasKey: { gemini: false, groq: false } }), save },
  schedule: { onChanged: noop },
  zimbra: { onStep: noop, check: async () => "connected" },
  onGenerateProgress: noop,
  update: { check: async () => ({ state: "ok" }) }
});

afterEach(() => { delete window.api; });

describe("I've Sent It", () => {
  it("does not show Sent when the History save fails", async () => {
    window.api = fakeApi(async name => { if (name === "history") throw { code: "ERROR", message: "disk full" }; return true; });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.a.markSent());
    expect(result.current.s.digestStatus).not.toBe("sent");
    expect(result.current.s.history).toHaveLength(0);
    expect(result.current.s.toast).toMatchObject({ tone: "danger", message: expect.stringMatching(/History: disk full/) });
  });
  it("shows Sent once it is saved to History", async () => {
    const saved = [];
    window.api = fakeApi(async (name, data) => { saved.push([name, data]); return true; });
    const { result } = renderHook(() => useApp());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.a.markSent());
    expect(result.current.s.digestStatus).toBe("sent");
    expect(saved.filter(([n]) => n === "history")).toHaveLength(1);
  });
});
