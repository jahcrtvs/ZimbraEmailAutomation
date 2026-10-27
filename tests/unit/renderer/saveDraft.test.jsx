// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useApp } from "../../../src/renderer/src/useApp.js";
import { DEFAULTS } from "../../../src/main/store.js";

const noop = () => () => {};
const blocks = [{ type: "section", title: "TASK TODAY", items: ["Worked on Hibernate."] }, { type: "text", text: "Regards," }];
const notes = { ...DEFAULTS().draft.notes, work: "worked on hibernate" };
// A fake main process whose saves are kept, so a second useApp() acts like the app opening again.
const fakeApi = (disk, { failDraft = false } = {}) => ({
  store: {
    load: async () => ({ ...DEFAULTS(), ...disk, hasKey: { gemini: false, groq: false } }),
    save: async (name, data) => { if (failDraft && name === "draft") throw { code: "ERROR", message: "disk full" }; disk[name] = data; return true; }
  },
  schedule: { onChanged: noop, upsert: async i => [i] },
  zimbra: { onStep: noop, check: async () => "connected" },
  onGenerateProgress: noop,
  generate: async () => ({ status: "ok", source: "local", note: null, blocks }),
  update: { check: async () => ({ state: "ok" }) }
});
const open = async () => {
  const h = renderHook(() => useApp());
  await waitFor(() => expect(h.result.current.ready).toBe(true));
  return h;
};
const generated = async () => {
  const h = await open();
  act(() => h.result.current.a.setNotes(notes));
  await act(() => h.result.current.a.generate());
  expect(h.result.current.s.stage).toBe("review");
  return h;
};

afterEach(() => { delete window.api; });

describe("Save as Draft", () => {
  it("saves the generated Report and reopens it after a restart", async () => {
    const disk = {};
    window.api = fakeApi(disk);
    const first = await generated();
    await act(() => first.result.current.a.saveDraft());
    expect(disk.draft.report.blocks).toEqual(blocks);
    expect(first.result.current.s.toast.message).toMatch(/Draft saved/);
    first.unmount();

    const again = await open();
    expect(again.result.current.s.stage).toBe("review");
    expect(again.result.current.s.blocks).toEqual(blocks);
    expect(again.result.current.s.digestStatus).toBe("ready");
  });
  it("keeps the saved Report when the notes autosave runs", async () => {
    const disk = {};
    window.api = fakeApi(disk);
    const h = await generated();
    await act(() => h.result.current.a.saveDraft());
    await act(() => new Promise(r => setTimeout(r, 700)));
    expect(disk.draft.report?.blocks).toEqual(blocks);
  });
  it("tells the user when the draft cannot be saved", async () => {
    window.api = fakeApi({}, { failDraft: true });
    const h = await generated();
    await act(() => h.result.current.a.saveDraft());
    expect(h.result.current.s.draftReport).toBeNull();
    expect(h.result.current.s.toast).toMatchObject({ tone: "danger", message: expect.stringMatching(/draft: disk full/) });
  });
  it("drops the saved Report when the notes are edited", async () => {
    const disk = {};
    window.api = fakeApi(disk);
    const h = await generated();
    await act(() => h.result.current.a.saveDraft());
    act(() => h.result.current.a.editNotes());
    await act(() => new Promise(r => setTimeout(r, 700)));
    expect(disk.draft.report).toBeNull();
  });
  it("drops the saved Report once the digest is scheduled", async () => {
    const disk = {};
    window.api = fakeApi(disk);
    const h = await generated();
    await act(() => h.result.current.a.saveDraft());
    await act(() => h.result.current.a.confirmSchedule({ date: new Date(2099, 0, 1), time: "5:00 PM", to: "m@c.com" }));
    expect(h.result.current.s.digestStatus).toBe("scheduled");
    await act(() => new Promise(r => setTimeout(r, 700)));
    expect(disk.draft.report).toBeNull();
  });
  it("opens the notes, not a Report, for a draft with no saved Report", async () => {
    window.api = fakeApi({ draft: { notes, date: "", report: null } });
    const h = await open();
    expect(h.result.current.s.stage).toBe("form");
    expect(h.result.current.s.digestStatus).toBe("draft");
  });
});
