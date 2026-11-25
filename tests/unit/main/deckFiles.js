import { deflateRawSync, crc32 } from "node:zlib";

// Builds small .pptx and .pdf files in memory, so no binary fixtures are stored in the repo.

export function zip(entries, { method = 8 } = {}) {
  const parts = [], central = [];
  let offset = 0;
  for (const [name, data] of Object.entries(entries)) {
    const raw = Buffer.from(data), packed = method === 8 ? deflateRawSync(raw) : raw, nm = Buffer.from(name), crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nm.length, 26);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(20, 6); head.writeUInt16LE(method, 10);
    head.writeUInt32LE(crc, 16); head.writeUInt32LE(packed.length, 20); head.writeUInt32LE(raw.length, 24); head.writeUInt16LE(nm.length, 28);
    head.writeUInt32LE(offset, 42);
    parts.push(local, nm, packed);
    central.push(head, nm);
    offset += 30 + nm.length + packed.length;
  }
  const dir = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, dir, end]);
}

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const para = t => `<a:p><a:r><a:t>${esc(t)}</a:t></a:r></a:p>`;
const shape = (ph, paras) => `<p:sp><p:nvSpPr><p:cNvPr id="1" name="s"/><p:cNvSpPr/><p:nvPr>${ph ? `<p:ph type="${ph}"/>` : ""}</p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/>${paras.map(para).join("")}</p:txBody></p:sp>`;

function slideXml({ title, subtitle, lines = [], footer, number, raw = "" }) {
  const shapes = [
    title !== undefined && shape(subtitle !== undefined ? "ctrTitle" : "title", [title]),
    subtitle !== undefined && shape("subTitle", [subtitle]),
    lines.length > 0 && shape("body", lines),
    footer !== undefined && shape("ftr", [footer]),
    number !== undefined && shape("sldNum", [number])
  ].filter(Boolean).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${shapes}${raw}</p:spTree></p:cSld></p:sld>`;
}

// slides: [{ title, subtitle, lines, footer, number, raw }]. order: slide file numbers, in the order they are shown (default 1..n).
export function buildPptx({ title, slides, order, method } = {}) {
  const n = slides.length, shown = order || slides.map((_, i) => i + 1);
  const files = {};
  slides.forEach((s, i) => { files[`ppt/slides/slide${i + 1}.xml`] = slideXml(s); });
  files["ppt/presentation.xml"] = `<p:presentation xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>${shown.map((f, i) => `<p:sldId id="${256 + i}" r:id="rId${f + 10}"/>`).join("")}</p:sldIdLst></p:presentation>`;
  files["ppt/_rels/presentation.xml.rels"] = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({ length: n }, (_, i) => `<Relationship Id="rId${i + 11}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`;
  if (title !== undefined) files["docProps/core.xml"] = `<cp:coreProperties xmlns:cp="x" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title></cp:coreProperties>`;
  return zip(files, { method });
}

// cells: [{ type: "markdown" | "code", source: string | string[], outputs }]. A notebook is plain JSON.
export function buildNotebook({ cells, bom = false }) {
  const json = JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: {}, cells: cells.map(c => ({ cell_type: c.type, metadata: {}, source: c.source, ...(c.type === "code" ? { outputs: c.outputs || [], execution_count: null } : {}) })) });
  return Buffer.from((bom ? "﻿" : "") + json);
}

// pages: an array of pages, each an array of text lines (an empty page has no text). info: optional document title.
export function buildPdf({ pages, title }) {
  const objs = [];
  const add = body => objs.push(body) && objs.length;
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  const fontId = 3 + pages.length * 2;
  pages.forEach((lines, i) => {
    const text = lines.map((t, row) => `BT /F1 18 Tf 50 ${700 - row * 40} Td (${t.replace(/[()\\]/g, "\\$&")}) Tj ET`).join("\n");
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ${lines.length ? `/Contents ${4 + i * 2} 0 R ` : ""}/Resources << /Font << /F1 ${fontId} 0 R >> >> >>`);
    add(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  });
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  if (title !== undefined) add(`<< /Title (${title}) >>`);
  let pdf = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R${title !== undefined ? ` /Info ${objs.length} 0 R` : ""} >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
