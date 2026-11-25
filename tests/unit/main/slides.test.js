import { describe, it, expect } from "vitest";
import { readDeck, MAX_FILE_BYTES, MAX_SLIDES } from "../../../src/main/slides.js";
import { buildPptx, buildPdf, zip } from "./deckFiles.js";

const rejects = async (promise, code) => {
  const e = await promise.then(() => null, err => err);
  expect(e, "expected readDeck to fail").not.toBeNull();
  expect(e.code).toBe(code);
  return e;
};

describe("readDeck: .pptx", () => {
  it("reads the title and the lines of each slide", async () => {
    const buf = buildPptx({ slides: [{ title: "Spring Security", lines: ["Authentication", "Roles and permissions"] }, { title: "Next steps", lines: ["Practice JWT"] }] });
    const deck = await readDeck(buf, ".pptx");
    expect(deck.slides).toEqual([
      { title: "Spring Security", lines: ["Authentication", "Roles and permissions"] },
      { title: "Next steps", lines: ["Practice JWT"] }
    ]);
  });
  it("uses the document title, else the first slide title, as the deck title", async () => {
    const slides = [{ title: "Intro to JPA", lines: ["Entities"] }];
    expect((await readDeck(buildPptx({ title: "JPA Workshop", slides }), "pptx")).title).toBe("JPA Workshop");
    expect((await readDeck(buildPptx({ slides }), "pptx")).title).toBe("Intro to JPA");
  });
  it("follows the order the slides are shown in, not the file numbers", async () => {
    const buf = buildPptx({ slides: [{ title: "A" }, { title: "B" }, { title: "C" }], order: [3, 1, 2] });
    expect((await readDeck(buf, ".pptx")).slides.map(s => s.title)).toEqual(["C", "A", "B"]);
  });
  it("keeps the subtitle of a title slide and ignores footers and slide numbers", async () => {
    const buf = buildPptx({ slides: [{ title: "Hibernate", subtitle: "Day 3", lines: ["Mapping"], footer: "Company confidential", number: "4" }] });
    expect((await readDeck(buf, ".pptx")).slides[0]).toEqual({ title: "Hibernate", lines: ["Day 3", "Mapping"] });
  });
  it("decodes entities and trims empty lines", async () => {
    const buf = buildPptx({ slides: [{ title: "Q&A <live>", lines: ["  Tom & Jerry  ", "   "] }] });
    expect((await readDeck(buf, ".pptx")).slides[0]).toEqual({ title: "Q&A <live>", lines: ["Tom & Jerry"] });
  });
  it("reads files stored without compression", async () => {
    const buf = buildPptx({ slides: [{ title: "Stored", lines: ["x"] }], method: 0 });
    expect((await readDeck(buf, ".pptx")).slides[0].title).toBe("Stored");
  });
  it("skips slides that have no text and gives a slide without a title an empty title", async () => {
    const buf = buildPptx({ slides: [{ lines: ["Only a body"] }, {}, { title: "Last" }] });
    expect((await readDeck(buf, ".pptx")).slides).toEqual([{ title: "", lines: ["Only a body"] }, { title: "Last", lines: [] }]);
  });
  it("reads at most MAX_SLIDES slides", async () => {
    const buf = buildPptx({ slides: Array.from({ length: MAX_SLIDES + 5 }, (_, i) => ({ title: "S" + i })) });
    expect((await readDeck(buf, ".pptx")).slides).toHaveLength(MAX_SLIDES);
  });
  it("says there is no text when no slide has any", async () => {
    await rejects(readDeck(buildPptx({ slides: [{}, {}] }), ".pptx"), "NO_TEXT");
  });
});

describe("readDeck: .pdf", () => {
  it("reads one slide per page, the first line being the title", async () => {
    const buf = buildPdf({ pages: [["Spring Security", "Authentication"], ["Roles", "Permissions", "Method security"]] });
    const deck = await readDeck(buf, ".pdf");
    expect(deck.slides).toEqual([
      { title: "Spring Security", lines: ["Authentication"] },
      { title: "Roles", lines: ["Permissions", "Method security"] }
    ]);
  });
  it("uses the PDF title, else the first page title, as the deck title", async () => {
    const pages = [["First page title", "x"]];
    expect((await readDeck(buildPdf({ pages, title: "Security Workshop" }), ".pdf")).title).toBe("Security Workshop");
    expect((await readDeck(buildPdf({ pages }), ".pdf")).title).toBe("First page title");
  });
  it("skips pages without text", async () => {
    const buf = buildPdf({ pages: [["One"], [], ["Three"]] });
    expect((await readDeck(buf, ".pdf")).slides.map(s => s.title)).toEqual(["One", "Three"]);
  });
  it("tells the user a PDF with no text may be a scan", async () => {
    const e = await rejects(readDeck(buildPdf({ pages: [[], []] }), ".pdf"), "NO_TEXT");
    expect(e.message).toMatch(/scanned/i);
  });
  it("reads at most MAX_SLIDES pages", async () => {
    const buf = buildPdf({ pages: Array.from({ length: MAX_SLIDES + 3 }, (_, i) => ["Page " + i]) });
    expect((await readDeck(buf, ".pdf")).slides).toHaveLength(MAX_SLIDES);
  }, 30000);
});

describe("readDeck: files it cannot read", () => {
  it("explains that an old .ppt must be saved as .pptx or PDF", async () => {
    const e = await rejects(readDeck(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), ".ppt"), "UNSUPPORTED");
    expect(e.message).toMatch(/\.pptx or PDF/);
  });
  it("rejects any other extension", async () => {
    await rejects(readDeck(Buffer.from("hello"), ".docx"), "UNSUPPORTED");
    await rejects(readDeck(Buffer.from("hello"), ""), "UNSUPPORTED");
  });
  it("accepts the extension in any case, with or without the dot", async () => {
    const buf = buildPptx({ slides: [{ title: "T" }] });
    expect((await readDeck(buf, ".PPTX")).slides).toHaveLength(1);
    expect((await readDeck(buf, "pptx")).slides).toHaveLength(1);
  });
  it("rejects a file over MAX_FILE_BYTES before reading it", async () => {
    await rejects(readDeck(Buffer.alloc(MAX_FILE_BYTES + 1), ".pdf"), "TOO_BIG");
  });
  it("rejects a .pptx that is not a zip, or has no slides inside", async () => {
    await rejects(readDeck(Buffer.from("this is not a zip file at all"), ".pptx"), "UNREADABLE");
    await rejects(readDeck(zip({ "readme.txt": "hi" }), ".pptx"), "UNREADABLE");
  });
  it("rejects a zip entry that inflates to an unreasonable size", async () => {
    const buf = zip({ "ppt/slides/slide1.xml": Buffer.alloc(40 * 1024 * 1024, 0x20) });
    await rejects(readDeck(buf, ".pptx"), "UNREADABLE");
  });
  it("rejects a .pdf that is not a PDF", async () => {
    await rejects(readDeck(Buffer.from("this is not a pdf"), ".pdf"), "UNREADABLE");
  });
});
