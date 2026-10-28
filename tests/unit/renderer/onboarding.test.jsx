// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useApp } from "../../../src/renderer/src/useApp.js";
import { DEFAULTS } from "../../../src/main/store.js";

const noop = () => () => {};
const fakeApi = disk => ({
  store: {
    load: async () => ({ ...DEFAULTS(), ...disk, hasKey: { gemini: false, groq: false } }),
    save: async (name, data) => { disk[name] = data; return true; }
  },
  schedule: { onChanged: noop },
  zimbra: { onStep: noop, check: async () => "connected" },
  onGenerateProgress: noop,
  update: { check: async () => ({ state: "ok" }) }
});
const open = async () => {
  const h = renderHook(() => useApp());
  await waitFor(() => expect(h.result.current.ready).toBe(true));
  return h;
};

afterEach(() => { delete window.api; });

describe("first-run tutorial", () => {
  it("opens on the first launch and is remembered once finished", async () => {
    const disk = {};
    window.api = fakeApi(disk);
    const first = await open();
    expect(first.result.current.s.tour).toBe(0);
    act(() => first.result.current.a.tourStep(2));
    expect(first.result.current.s.tour).toBe(2);
    await act(() => first.result.current.a.finishTour());
    expect(first.result.current.s.tour).toBeNull();
    await waitFor(() => expect(disk.settings.app.onboarded).toBe(true));
    first.unmount();

    const again = await open();
    expect(again.result.current.s.tour).toBeNull();
  });
  it("can be shown again, without changing what is saved", async () => {
    const disk = { settings: { ...DEFAULTS().settings, app: { startWithWindows: false, onboarded: true } } };
    window.api = fakeApi(disk);
    const h = await open();
    expect(h.result.current.s.tour).toBeNull();
    act(() => h.result.current.a.startTour());
    expect(h.result.current.s.tour).toBe(0);
    await act(() => h.result.current.a.finishTour());
    expect(h.result.current.s.tour).toBeNull();
    expect(disk.settings.app.onboarded).toBe(true);
  });
});
