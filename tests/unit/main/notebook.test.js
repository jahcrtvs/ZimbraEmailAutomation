import { describe, it, expect } from "vitest";
import { readDeck, MAX_FILE_BYTES, MAX_SLIDES } from "../../../src/main/slides.js";
import { buildNotebook } from "./deckFiles.js";

const md = source => ({ type: "markdown", source });
const code = (source, outputs) => ({ type: "code", source, outputs });
const read = (cells, opts) => readDeck(buildNotebook({ cells, ...opts }), ".ipynb");
const rejects = async (promise, code) => {
  const e = await promise.then(() => null, err => err);
  expect(e, "expected readDeck to fail").not.toBeNull();
  expect(e.code).toBe(code);
  return e;
};

describe("readDeck: .ipynb", () => {
  it("turns each heading into a slide title and the text under it into lines", async () => {
    const deck = await read([md("# Spring Data JPA\n\nIntro text\n\n## Repositories\n- Save methods\n- Find methods\n\n## Queries\nDerived queries")]);
    expect(deck.slides).toEqual([
      { title: "Spring Data JPA", lines: ["Intro text"] },
      { title: "Repositories", lines: ["Save methods", "Find methods"] },
      { title: "Queries", lines: ["Derived queries"] }
    ]);
  });
  it("takes the deck title from the first level 1 heading, and leaves it empty when there is none", async () => {
    expect((await read([md("## Part\ntext"), md("# Late title\nmore"), md("# Another")])).title).toBe("Late title");
    expect((await read([md("## Only a section\ntext")])).title).toBe("");
  });
  it("cleans markdown marks from titles and lines", async () => {
    const deck = await read([md("## **Bold** `title` ##\n1. Numbered item\n* Star item\n+ Plus item\n- [x] Done item\n> Quoted *line*\nSee [the docs](http://x.example/a_b) now\n![diagram](img.png)\n<b>Tagged</b> text\n   spaced    out   ")]);
    expect(deck.slides[0].title).toBe("Bold title");
    expect(deck.slides[0].lines).toEqual(["Numbered item", "Star item", "Plus item", "Done item", "Quoted line", "See the docs now", "Tagged text", "spaced out"]);
  });
  it("drops fenced code blocks inside markdown", async () => {
    const deck = await read([md("## Setup\nBefore\n```java\nSecret s = new Secret();\n```\nAfter\n~~~\nmore code\n~~~\nEnd")]);
    expect(deck.slides[0].lines).toEqual(["Before", "After", "End"]);
  });
  it("never reads code cells or their output", async () => {
    const deck = await read([md("## Run"), code("password = 'hunter2'\nprint(password)", [{ output_type: "stream", name: "stdout", text: "hunter2\n" }]), md("after the code")]);
    expect(JSON.stringify(deck)).not.toMatch(/hunter2|password/);
    expect(deck.slides).toEqual([{ title: "Run", lines: ["after the code"] }]);
  });
  it("reads source given as a string or as an array of lines", async () => {
    const deck = await read([md(["## Arrays\n", "first line\n", "second line"]), md("## Strings\nthird line")]);
    expect(deck.slides).toEqual([{ title: "Arrays", lines: ["first line", "second line"] }, { title: "Strings", lines: ["third line"] }]);
  });
  it("keeps text before the first heading as an untitled slide", async () => {
    const deck = await read([md("Intro with no heading"), md("## Then a heading")]);
    expect(deck.slides).toEqual([{ title: "", lines: ["Intro with no heading"] }, { title: "Then a heading", lines: [] }]);
  });
  it("drops a heading with no text in it", async () => {
    const deck = await read([md("##\n## Real"), md("   ")]);
    expect(deck.slides).toEqual([{ title: "Real", lines: [] }]);
  });
  it("keeps at most MAX_SLIDES slides", async () => {
    const deck = await read(Array.from({ length: MAX_SLIDES + 20 }, (_, i) => md(`## Part ${i + 1}`)));
    expect(deck.slides).toHaveLength(MAX_SLIDES);
  });
  it("reads a file that starts with a byte order mark", async () => {
    expect((await read([md("## With BOM")], { bom: true })).slides[0].title).toBe("With BOM");
  });
  it("accepts the extension in any case, with or without the dot", async () => {
    const buf = buildNotebook({ cells: [md("## T")] });
    expect((await readDeck(buf, ".IPYNB")).slides).toHaveLength(1);
    expect((await readDeck(buf, "ipynb")).slides).toHaveLength(1);
  });
});

describe("readDeck: .ipynb it cannot read", () => {
  it("says there is no text when the notebook has only code cells or empty markdown", async () => {
    const e = await rejects(read([code("print(1)"), md("")]), "NO_TEXT");
    expect(e.message).toMatch(/no markdown text/);
  });
  it("rejects JSON that is not a notebook, and text that is not JSON", async () => {
    await rejects(readDeck(Buffer.from("not json at all"), ".ipynb"), "UNREADABLE");
    await rejects(readDeck(Buffer.from('{"nbformat":4}'), ".ipynb"), "UNREADABLE");
    await rejects(readDeck(Buffer.from('{"cells":"x"}'), ".ipynb"), "UNREADABLE");
    await rejects(readDeck(Buffer.from("[1,2]"), ".ipynb"), "UNREADABLE");
  });
  it("ignores a cell that is not an object or has no usable source", async () => {
    const buf = Buffer.from(JSON.stringify({ cells: [null, 5, { cell_type: "markdown" }, { cell_type: "markdown", source: 7 }, { cell_type: "markdown", source: "## Fine" }] }));
    expect((await readDeck(buf, ".ipynb")).slides).toEqual([{ title: "Fine", lines: [] }]);
  });
  it("rejects a file over MAX_FILE_BYTES before reading it", async () => {
    await rejects(readDeck(Buffer.alloc(MAX_FILE_BYTES + 1), ".ipynb"), "TOO_BIG");
  });
  it("names the three accepted types when the extension is something else", async () => {
    const e = await rejects(readDeck(Buffer.from("hello"), ".docx"), "UNSUPPORTED");
    expect(e.message).toMatch(/\.pptx/);
    expect(e.message).toMatch(/\.ipynb/);
  });
});
