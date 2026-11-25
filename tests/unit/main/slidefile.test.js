import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSlidePicker } from "../../../src/main/slidefile.js";
import { MAX_FILE_BYTES } from "../../../src/main/slides.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-slides-"));
const fileWith = (name, bytes) => { const p = path.join(dir, name); fs.writeFileSync(p, bytes); return p; };
const dialogFor = result => { const seen = []; return { seen, showOpenDialog: async (win, opts) => { seen.push({ win, opts }); return result; } }; };

describe("createSlidePicker", () => {
  it("opens a file dialog on the app window that offers presentations", async () => {
    const dialog = dialogFor({ canceled: true, filePaths: [] });
    await createSlidePicker({ dialog, getWindow: () => "WINDOW" })();
    expect(dialog.seen[0].win).toBe("WINDOW");
    expect(dialog.seen[0].opts.properties).toEqual(["openFile"]);
    expect(dialog.seen[0].opts.filters[0].extensions).toEqual(["pptx", "pdf", "ipynb", "ppt"]);
  });
  it("returns null when the user cancels", async () => {
    expect(await createSlidePicker({ dialog: dialogFor({ canceled: true, filePaths: [] }), getWindow: () => null })()).toBeNull();
    expect(await createSlidePicker({ dialog: dialogFor({ canceled: false, filePaths: [] }), getWindow: () => null })()).toBeNull();
  });
  it("returns the file name, without its folder, and the bytes", async () => {
    const p = fileWith("Spring Security.pptx", Buffer.from("hello"));
    const file = await createSlidePicker({ dialog: dialogFor({ canceled: false, filePaths: [p] }), getWindow: () => null })();
    expect(file.name).toBe("Spring Security.pptx");
    expect(file.data.toString()).toBe("hello");
  });
  it("refuses a file over the size limit without reading it", async () => {
    let read = false;
    const fsFake = { promises: { stat: async () => ({ size: MAX_FILE_BYTES + 1 }), readFile: async () => { read = true; return Buffer.alloc(0); } } };
    const pick = createSlidePicker({ dialog: dialogFor({ canceled: false, filePaths: ["C:\\big.pdf"] }), getWindow: () => null, fs: fsFake });
    await expect(pick()).rejects.toMatchObject({ code: "TOO_BIG" });
    expect(read).toBe(false);
  });
  it("fails with a plain message when the file cannot be read", async () => {
    const pick = createSlidePicker({ dialog: dialogFor({ canceled: false, filePaths: [path.join(dir, "missing.pptx")] }), getWindow: () => null });
    await expect(pick()).rejects.toMatchObject({ code: "UNREADABLE", message: "This file could not be opened." });
  });
  it("does not put the folder path in the error", async () => {
    const pick = createSlidePicker({ dialog: dialogFor({ canceled: false, filePaths: [path.join(dir, "missing.pptx")] }), getWindow: () => null });
    await expect(pick()).rejects.toThrow(expect.not.stringContaining(dir));
  });
});
