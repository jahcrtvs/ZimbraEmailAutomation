// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useApp } from "../../../src/renderer/src/useApp.js";
import { SlidesModal, SlidesConsentDialog } from "../../../src/renderer/src/screens/dialogs.jsx";
import { NewDigestScreen } from "../../../src/renderer/src/screens/NewDigest.jsx";
import { DEFAULTS } from "../../../src/main/store.js";
import { EMPTY_NOTES } from "../../../src/shared/report.js";

const noop = () => () => {};
const FILE = { fileName: "Spring Security.pptx", slides: 12 };
const DRAFT = { work: ["Attended the presentation on Spring Security"], topics: ["Authentication", "Roles"], progress: [], blockers: [], tomorrow: ["Practice JWT"] };
const OK = (over = {}) => ({ status: "ok", source: "local", note: null, draft: DRAFT, ...over });
const ASK = { status: "needs-consent", provider: "groq", failure: { code: "UNREACHABLE", message: "Could not reach the local AI server." }, preview: { text: "Slide 1: Contact [EMAIL_1]", chars: 27 } };

const fakeApi = ({ pick = async () => FILE, sort = async () => OK() } = {}) => ({
  store: { load: async () => ({ ...DEFAULTS(), hasKey: { gemini: false, groq: false } }), save: async () => true },
  schedule: { onChanged: noop, upsert: async i => [i] },
  zimbra: { onStep: noop, check: async () => "connected" },
  onGenerateProgress: noop,
  generate: async () => ({ status: "ok", source: "local", note: null, blocks: [{ type: "section", title: "TASK TODAY", items: ["Did it."] }] }),
  update: { check: async () => ({ state: "ok" }) },
  slides: { pick: vi.fn(pick), sort: vi.fn(sort) }
});
const open = async () => {
  const h = renderHook(() => useApp());
  await waitFor(() => expect(h.result.current.ready).toBe(true));
  return h;
};
const S = h => h.result.current.s;
const A = h => h.result.current.a;
// Opens the dialog and picks the file, as the user would.
const picked = async h => { act(() => A(h).openSlides()); await act(() => A(h).pickSlides()); };

afterEach(() => { delete window.api; });

describe("import slides: choosing the file", () => {
  it("opens a dialog that starts on 'I attended it' with no file", async () => {
    window.api = fakeApi();
    const h = await open();
    act(() => A(h).openSlides());
    expect(S(h).modal).toEqual({ t: "slides" });
    expect(S(h).slidesDlg).toEqual({ role: "attended", file: null, busy: false, error: null });
  });
  it("shows the file name and slide count the main process returns, and nothing else", async () => {
    window.api = fakeApi();
    const h = await open();
    await picked(h);
    expect(S(h).slidesDlg.file).toEqual(FILE);
    expect(window.api.slides.pick).toHaveBeenCalledWith();
  });
  it("keeps the earlier file when the user cancels the file dialog", async () => {
    window.api = fakeApi();
    const h = await open();
    await picked(h);
    window.api.slides.pick.mockResolvedValueOnce(null);
    await act(() => A(h).pickSlides());
    expect(S(h).slidesDlg).toMatchObject({ file: FILE, busy: false, error: null });
  });
  it("shows why a file could not be read and forgets the earlier file", async () => {
    window.api = fakeApi();
    const h = await open();
    await picked(h);
    window.api.slides.pick.mockRejectedValueOnce({ code: "UNSUPPORTED", message: "Old .ppt files cannot be read. Save it as .pptx or PDF in PowerPoint first." });
    await act(() => A(h).pickSlides());
    expect(S(h).slidesDlg).toMatchObject({ file: null, busy: false, error: expect.stringMatching(/Save it as \.pptx or PDF/) });
  });
  it("changes the role", async () => {
    window.api = fakeApi();
    const h = await open();
    act(() => A(h).openSlides());
    act(() => A(h).setSlidesRole("presented"));
    expect(S(h).slidesDlg.role).toBe("presented");
  });
});

describe("import slides: adding to the notes", () => {
  it("sends only the role and the mode, adds the draft to the notes and closes the dialog", async () => {
    window.api = fakeApi();
    const h = await open();
    await picked(h);
    act(() => A(h).setSlidesRole("studied"));
    await act(() => A(h).addSlides());
    expect(window.api.slides.sort).toHaveBeenCalledWith({ role: "studied", mode: "auto" });
    expect(S(h).notes).toEqual({ work: "Attended the presentation on Spring Security", topics: "Authentication\nRoles", progress: "", blockers: "", tomorrow: "Practice JWT" });
    expect(S(h).modal).toBeNull();
    expect(S(h).digestStatus).toBe("draft");
    expect(S(h).toast.message).toMatch(/Slides added/);
  });
  it("adds below what is typed and skips an item already in that field", async () => {
    window.api = fakeApi();
    const h = await open();
    act(() => A(h).setNotes({ ...EMPTY_NOTES, work: "fixed login bug", topics: "Authentication\nhql" }));
    await picked(h);
    await act(() => A(h).addSlides());
    expect(S(h).notes.work).toBe("fixed login bug\nAttended the presentation on Spring Security");
    expect(S(h).notes.topics).toBe("Authentication\nhql\nRoles");
  });
  it("says how the slides were sorted, then clears that message when the digest is generated", async () => {
    window.api = fakeApi();
    const h = await open();
    await picked(h);
    await act(() => A(h).addSlides());
    expect(S(h).slidesNote).toMatch(/Sorted by the local AI/);
    expect(S(h).slidesNote).toMatch(/Review the lines/);
    await act(() => A(h).generate());
    expect(S(h).slidesNote).toBeNull();
  });
  it("says the built-in rules were used, and why", async () => {
    window.api = fakeApi({ sort: async () => OK({ source: "template", note: "Could not reach the local AI server. No cloud fallback is set up, so the built-in text rules were used." }) });
    const h = await open();
    await picked(h);
    await act(() => A(h).addSlides());
    expect(S(h).slidesNote).toMatch(/Could not reach the local AI server/);
    expect(S(h).slidesNote).not.toMatch(/Sorted by the local AI/);
  });
  it("keeps the dialog open with the message when sorting fails, and leaves the notes alone", async () => {
    window.api = fakeApi({ sort: async () => { throw { code: "NO_FILE", message: "Choose a presentation first." }; } });
    const h = await open();
    act(() => A(h).setNotes({ ...EMPTY_NOTES, work: "typed" }));
    await picked(h);
    await act(() => A(h).addSlides());
    expect(S(h).modal).toEqual({ t: "slides" });
    expect(S(h).slidesDlg).toMatchObject({ busy: false, error: "Choose a presentation first." });
    expect(S(h).notes.work).toBe("typed");
  });
  it("clears the message when a new digest is started", async () => {
    window.api = fakeApi();
    const h = await open();
    await picked(h);
    await act(() => A(h).addSlides());
    act(() => A(h).resetDigest());
    expect(S(h).slidesNote).toBeNull();
  });
});

describe("import slides: asking before the cloud", () => {
  it("shows the consent dialog with the text that would be sent, and adds nothing yet", async () => {
    window.api = fakeApi({ sort: async () => ASK });
    const h = await open();
    await picked(h);
    await act(() => A(h).addSlides());
    expect(S(h).modal).toEqual({ t: "slidesCloud" });
    expect(S(h).slidesAsk).toEqual(ASK);
    expect(S(h).notes).toEqual(EMPTY_NOTES);
  });
  it("sends in cloud mode when the user agrees, and says the cloud sorted it", async () => {
    window.api = fakeApi({ sort: async p => p.mode === "cloud" ? OK({ source: "groq" }) : ASK });
    const h = await open();
    await picked(h);
    await act(() => A(h).addSlides());
    await act(() => A(h).slidesCloudSend());
    expect(window.api.slides.sort).toHaveBeenLastCalledWith({ role: "attended", mode: "cloud" });
    expect(S(h).modal).toBeNull();
    expect(S(h).notes.topics).toBe("Authentication\nRoles");
    expect(S(h).slidesNote).toMatch(/Groq \(cloud\)/);
    expect(S(h).slidesAsk).toBeNull();
  });
  it("uses the built-in rules when the user declines, and keeps why the local AI failed", async () => {
    window.api = fakeApi({ sort: async p => p.mode === "template" ? OK({ source: "template", note: "You chose not to send the slides to a cloud service." }) : ASK });
    const h = await open();
    await picked(h);
    await act(() => A(h).addSlides());
    await act(() => A(h).slidesCloudDecline());
    expect(window.api.slides.sort).toHaveBeenLastCalledWith({ role: "attended", mode: "template" });
    expect(S(h).slidesNote).toMatch(/Could not reach the local AI server\. You chose not to send/);
  });
});

describe("SlidesModal", () => {
  const dlg = (over = {}) => ({ role: "attended", file: null, busy: false, error: null, ...over });
  const a = () => ({ closeModal: vi.fn(), pickSlides: vi.fn(), addSlides: vi.fn(), setSlidesRole: vi.fn() });

  it("offers the three roles and marks the chosen one", () => {
    render(<SlidesModal s={{ slidesDlg: dlg({ role: "presented" }) }} a={a()} />);
    expect(screen.getByRole("radio", { name: /I attended it/ }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("radio", { name: /I presented it/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /I studied it/ }).getAttribute("aria-checked")).toBe("false");
  });
  it("sets the role and picks a file on click", () => {
    const act_ = a();
    render(<SlidesModal s={{ slidesDlg: dlg() }} a={act_} />);
    fireEvent.click(screen.getByRole("radio", { name: /I studied it/ }));
    expect(act_.setSlidesRole).toHaveBeenCalledWith("studied");
    fireEvent.click(screen.getByRole("button", { name: /Choose file/ }));
    expect(act_.pickSlides).toHaveBeenCalledTimes(1);
  });
  it("cannot add before a file is chosen, and adds after", () => {
    const act_ = a();
    const { rerender } = render(<SlidesModal s={{ slidesDlg: dlg() }} a={act_} />);
    expect(screen.getByRole("button", { name: "Add to notes" }).disabled).toBe(true);
    rerender(<SlidesModal s={{ slidesDlg: dlg({ file: FILE }) }} a={act_} />);
    expect(screen.getByText("Spring Security.pptx")).toBeTruthy();
    expect(screen.getByText(/12 slides/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add to notes" }));
    expect(act_.addSlides).toHaveBeenCalledTimes(1);
  });
  it("says 1 slide for a single slide", () => {
    render(<SlidesModal s={{ slidesDlg: dlg({ file: { fileName: "x.pdf", slides: 1 } }) }} a={a()} />);
    expect(screen.getByText(/\b1 slide\b(?!s)/)).toBeTruthy();
  });
  it("shows an error message", () => {
    render(<SlidesModal s={{ slidesDlg: dlg({ error: "This PDF has no text to read. It may be a scanned image." }) }} a={a()} />);
    expect(screen.getByText(/may be a scanned image/)).toBeTruthy();
  });
  it("does not let the user add or pick again while it is working", () => {
    render(<SlidesModal s={{ slidesDlg: dlg({ file: FILE, busy: true }) }} a={a()} />);
    expect(screen.getByRole("button", { name: /Choose another file/ }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Add to notes/ }).disabled).toBe(true);
  });
  it("closes on Cancel", () => {
    const act_ = a();
    render(<SlidesModal s={{ slidesDlg: dlg() }} a={act_} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(act_.closeModal).toHaveBeenCalledTimes(1);
  });
});

describe("SlidesConsentDialog", () => {
  it("shows why the local AI failed, who would get the text, and exactly what would be sent", () => {
    render(<SlidesConsentDialog s={{ slidesAsk: ASK }} a={{}} />);
    expect(screen.getByText(/Could not reach the local AI server/)).toBeTruthy();
    expect(screen.getByText(/Send the slide text to Groq/)).toBeTruthy();
    expect(screen.getByLabelText("Text that would be sent").textContent).toContain("Contact [EMAIL_1]");
  });
  it("sends only when the user chooses to, and declines to the built-in rules otherwise", () => {
    const a = { slidesCloudSend: vi.fn(), slidesCloudDecline: vi.fn() };
    render(<SlidesConsentDialog s={{ slidesAsk: ASK }} a={a} />);
    fireEvent.click(screen.getByText("Use built-in rules"));
    expect(a.slidesCloudDecline).toHaveBeenCalledTimes(1);
    expect(a.slidesCloudSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Send to Groq"));
    expect(a.slidesCloudSend).toHaveBeenCalledTimes(1);
  });
});

describe("New Digest screen", () => {
  const screenFor = async slidesNote => {
    window.api = fakeApi();
    const h = await open();
    const s = { ...S(h), slidesNote }, a = { ...A(h), openSlides: vi.fn() };
    render(<NewDigestScreen s={s} a={a} />);
    return a;
  };
  it("has an Import slides button that opens the dialog", async () => {
    const a = await screenFor(null);
    fireEvent.click(screen.getByRole("button", { name: /Import slides/ }));
    expect(a.openSlides).toHaveBeenCalledTimes(1);
  });
  it("shows how the slides were sorted above the notes", async () => {
    await screenFor("Sorted by the local AI. Review the lines, then press Generate Digest.");
    expect(screen.getByText("Slides added to your notes.")).toBeTruthy();
    expect(screen.getByText(/Sorted by the local AI/)).toBeTruthy();
  });
  it("shows no message before slides are imported", async () => {
    await screenFor(null);
    expect(screen.queryByText("Slides added to your notes.")).toBeNull();
  });
});
