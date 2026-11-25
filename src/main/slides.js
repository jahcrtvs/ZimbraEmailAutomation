import { inflateRawSync } from "node:zlib";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_SLIDES = 200;
// A slide is a few KB of XML. A bigger entry is not a slide, and inflating it could exhaust memory.
const MAX_ENTRY_BYTES = 10 * 1024 * 1024;
// Footer, date, header and slide number are on every slide and say nothing about the topic.
const SKIP_PLACEHOLDERS = new Set(["sldNum", "ftr", "dt", "hdr"]);

// Named so readDeck can tell its own errors from ones raised by zlib, which also carry a code.
const fail = (code, message) => Object.assign(new Error(message), { name: "DeckError", code });
const unreadable = () => fail("UNREADABLE", "This file could not be read. It may be damaged.");
const clean = s => String(s).replace(/\s+/g, " ").trim();

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
  const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
});
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));

// Only the parts of the zip format a .pptx uses: the central directory, stored or deflated entries.
function openZip(buf) {
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw unreadable();
  const entries = new Map();
  let p = buf.readUInt32LE(end + 16);
  for (let i = buf.readUInt16LE(end + 10); i > 0; i--) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw unreadable();
    const nameLen = buf.readUInt16LE(p + 28);
    entries.set(buf.toString("utf8", p + 46, p + 46 + nameLen), { method: buf.readUInt16LE(p + 10), size: buf.readUInt32LE(p + 20), at: buf.readUInt32LE(p + 42) });
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  const text = name => {
    const e = entries.get(name);
    if (!e) return "";
    if (buf.readUInt32LE(e.at) !== 0x04034b50) throw unreadable();
    const start = e.at + 30 + buf.readUInt16LE(e.at + 26) + buf.readUInt16LE(e.at + 28);
    const data = buf.subarray(start, start + e.size);
    if (e.method === 0) return data.toString("utf8");
    if (e.method === 8) return inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES }).toString("utf8");
    throw unreadable();
  };
  return { names: [...entries.keys()], text };
}

// The order slides are shown in is in presentation.xml; the file numbers can differ after slides are moved.
function slideFiles(zip) {
  const target = new Map([...zip.text("ppt/_rels/presentation.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].map(m => attrs(m[0])).map(a => [a.Id, a.Target]));
  const shown = [...zip.text("ppt/presentation.xml").matchAll(/<p:sldId\b[^>]*>/g)]
    .map(m => target.get(attrs(m[0])["r:id"]))
    .filter(Boolean)
    .map(t => { const f = t.replace(/^\//, ""); return f.startsWith("ppt/") ? f : "ppt/" + f; })
    .filter(f => zip.names.includes(f));
  if (shown.length) return shown;
  const n = f => parseInt(f.match(/(\d+)\.xml$/)[1], 10);
  return zip.names.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => n(a) - n(b));
}

function slideText(xml) {
  let title = "";
  const lines = [];
  for (const [shape] of xml.matchAll(/<p:sp[ >][\s\S]*?<\/p:sp>/g)) {
    const ph = shape.match(/<p:ph\b[^>]*>/);
    const type = ph ? attrs(ph[0]).type : "";
    if (SKIP_PLACEHOLDERS.has(type)) continue;
    const paras = [...shape.matchAll(/<a:p(?:\s[^>]*)?>[\s\S]*?<\/a:p>/g)]
      .map(([p]) => clean(decode([...p.replace(/<a:br\s*\/?>/g, "<a:t> </a:t>").matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map(m => m[1]).join(""))))
      .filter(Boolean);
    if ((type === "title" || type === "ctrTitle") && !title) title = paras.join(" ");
    else lines.push(...paras);
  }
  return { title, lines };
}

function readPptx(buf) {
  const zip = openZip(buf);
  const files = slideFiles(zip);
  if (!files.length) throw unreadable();
  const slides = files.slice(0, MAX_SLIDES).map(f => slideText(zip.text(f))).filter(s => s.title || s.lines.length);
  const docTitle = clean(decode(zip.text("docProps/core.xml").match(/<dc:title>([\s\S]*?)<\/dc:title>/)?.[1] ?? ""));
  return { title: docTitle || slides[0]?.title || "", slides };
}

async function readPdf(buf) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // The data is copied because pdf.js takes over the array it is given.
  const task = getDocument({ data: new Uint8Array(buf), verbosity: 0, isEvalSupported: false });
  let doc;
  try { doc = await task.promise; }
  catch (e) {
    await task.destroy();
    if (e?.name === "PasswordException") throw fail("PROTECTED", "This PDF is password protected. Remove the password and try again.");
    throw unreadable();
  }
  try {
    const slides = [];
    for (let i = 1; i <= Math.min(doc.numPages, MAX_SLIDES); i++) {
      const { items } = await (await doc.getPage(i)).getTextContent();
      const lines = [];
      let cur = "";
      for (const it of items) { cur += it.str; if (it.hasEOL) { lines.push(cur); cur = ""; } }
      lines.push(cur);
      const [title = "", ...rest] = lines.map(clean).filter(Boolean);
      if (title) slides.push({ title, lines: rest });
    }
    const docTitle = clean((await doc.getMetadata().catch(() => null))?.info?.Title ?? "");
    return { title: docTitle || slides[0]?.title || "", slides };
  } finally {
    await task.destroy();
  }
}

// Reads the text of a presentation. ext is the file extension, with or without the dot.
export async function readDeck(buffer, ext) {
  const type = String(ext || "").toLowerCase().replace(/^\./, "");
  if (type === "ppt") throw fail("UNSUPPORTED", "Old .ppt files cannot be read. Save it as .pptx or PDF in PowerPoint first.");
  if (type !== "pptx" && type !== "pdf") throw fail("UNSUPPORTED", "Choose a .pptx or .pdf file.");
  if (buffer.length > MAX_FILE_BYTES) throw fail("TOO_BIG", `This file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  let deck;
  try { deck = type === "pptx" ? readPptx(buffer) : await readPdf(buffer); }
  catch (e) { throw e.name === "DeckError" ? e : unreadable(); }
  if (!deck.slides.length) throw fail("NO_TEXT", type === "pdf" ? "This PDF has no text to read. It may be a scanned image." : "This presentation has no text to read.");
  return deck;
}
