import nodeFs from "node:fs";
import { basename } from "node:path";
import { checkSize } from "./slides.js";

const unopened = () => Object.assign(new Error("This file could not be opened."), { code: "UNREADABLE" });

// Opens the file dialog and reads the chosen presentation. The page never sees a path.
export function createSlidePicker({ dialog, getWindow, fs = nodeFs }) {
  return async () => {
    const r = await dialog.showOpenDialog(getWindow(), {
      title: "Choose a presentation",
      properties: ["openFile"],
      // .ppt is listed so the user gets the message that says why it cannot be read.
      filters: [{ name: "Presentations and notebooks", extensions: ["pptx", "pdf", "ipynb", "ppt"] }]
    });
    const file = r.canceled ? null : r.filePaths[0];
    if (!file) return null;
    const { size } = await fs.promises.stat(file).catch(() => { throw unopened(); });
    checkSize(size);
    return { name: basename(file), data: await fs.promises.readFile(file).catch(() => { throw unopened(); }) };
  };
}
