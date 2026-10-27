// Writes the rendered page into dist/index.html so the content is there before (and without) JavaScript.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(site, "dist", "index.html");
const ssr = path.join(site, "dist-ssr");
const { render } = await import(pathToFileURL(path.join(ssr, "entry-server.js")).href);

const html = fs.readFileSync(file, "utf8").replace('<div id="root"></div>', `<div id="root">${render()}</div>`);
fs.writeFileSync(file, html);
fs.rmSync(ssr, { recursive: true, force: true });
console.log("prerendered", path.relative(site, file));
