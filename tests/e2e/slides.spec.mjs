import { test, expect, _electron as electron } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPptx, buildPdf, buildNotebook } from "../unit/main/deckFiles.js";

// A fresh folder would show the first-run tutorial over the page, so it is marked as already seen.
// DD_SLIDES_FILE answers the file dialog. The AI is off in tests, so the built-in rules sort the slides.
const open = async (name, bytes) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-e2e-"));
  fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ app: { onboarded: true } }));
  const file = path.join(dir, name);
  fs.writeFileSync(file, bytes);
  const app = await electron.launch({ args: ["."], env: { ...process.env, DD_TEST: "1", DD_USER_DATA: dir, DD_SLIDES_FILE: file } });
  const w = await app.firstWindow();
  await w.getByRole("button", { name: "Import slides" }).click();
  await w.getByRole("button", { name: /Choose file/ }).click();
  return { app, w };
};

test("import a .pptx fills the notes, then it generates a digest", async () => {
  const deck = buildPptx({ slides: [{ title: "Spring Security", lines: ["Day 3"] }, { title: "Authentication", lines: ["Login form"] }, { title: "Roles and permissions", lines: ["Method security"] }] });
  const { app, w } = await open("Spring Security.pptx", deck);
  await expect(w.getByText("Spring Security.pptx")).toBeVisible();
  await expect(w.getByText("3 slides")).toBeVisible();
  await w.getByRole("radio", { name: /I presented it/ }).click();
  await w.getByRole("button", { name: "Add to notes" }).click();
  await expect(w.getByRole("alert").getByText("Slides added to your notes.")).toBeVisible();
  await expect(w.getByLabel("Today's Work")).toHaveValue("Presented on Spring Security");
  await expect(w.getByLabel("Topics / Lessons")).toHaveValue("Authentication\nRoles and permissions");
  await w.getByRole("button", { name: /Generate Digest/ }).click();
  await expect(w.getByText("Presented on Spring Security.")).toBeVisible({ timeout: 10000 });
  await app.close();
});

test("import a .pdf reads the text with pdf.js in the built app", async () => {
  const deck = buildPdf({ pages: [["Spring Security", "Day 3"], ["Authentication", "Login form"], ["Roles", "Method security"]] });
  const { app, w } = await open("deck.pdf", deck);
  await expect(w.getByText("3 slides")).toBeVisible();
  await w.getByRole("button", { name: "Add to notes" }).click();
  await expect(w.getByLabel("Today's Work")).toHaveValue("Attended the presentation on Spring Security");
  await expect(w.getByLabel("Topics / Lessons")).toHaveValue("Authentication\nRoles");
  await app.close();
});

test("import a .ipynb fills the notes from its markdown and never from its code", async () => {
  const nb = buildNotebook({ cells: [
    { type: "markdown", source: "# Spring Data JPA\nDay 3" },
    { type: "markdown", source: "## Repositories\n- Save methods" },
    { type: "code", source: "password = 'hunter2'", outputs: [{ output_type: "stream", name: "stdout", text: "hunter2\n" }] },
    { type: "markdown", source: "## Derived queries" }
  ] });
  const { app, w } = await open("Spring Data JPA.ipynb", nb);
  await expect(w.getByText("Spring Data JPA.ipynb")).toBeVisible();
  await expect(w.getByText("3 slides")).toBeVisible();
  await w.getByRole("button", { name: "Add to notes" }).click();
  await expect(w.getByLabel("Today's Work")).toHaveValue("Attended the presentation on Spring Data JPA");
  await expect(w.getByLabel("Topics / Lessons")).toHaveValue("Repositories\nDerived queries");
  for (const label of ["Today's Work", "Topics / Lessons", "Tomorrow"]) await expect(w.getByLabel(label)).not.toHaveValue(/hunter2/);
  await app.close();
});

test("an old .ppt file is refused with a message and adds nothing", async () => {
  const { app, w } = await open("old.ppt", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  await expect(w.getByText(/Old \.ppt files cannot be read/)).toBeVisible();
  await expect(w.getByRole("button", { name: "Add to notes" })).toBeDisabled();
  await w.getByRole("button", { name: "Cancel" }).click();
  await expect(w.getByLabel("Today's Work")).toHaveValue("");
  await app.close();
});
