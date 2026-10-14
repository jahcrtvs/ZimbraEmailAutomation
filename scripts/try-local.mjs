// Compare local models on your own notes. Not part of the test suite: it calls a real Ollama.
// Usage: node scripts/try-local.mjs [notes.json] [model ...]
//   notes.json: {"work":"...","topics":"...","progress":"...","blockers":"...","tomorrow":"..."}
//   Without a file the built-in example notes are used. Without models, the default model is used.
//   Set TRY_HISTORY to your history.json to use your own sent reports as examples.
import fs from "node:fs";
import { createGenerator } from "../src/main/generate.js";
import { DEFAULT_LOCAL } from "../src/shared/ai.js";
import { DEFAULT_TEMPLATE, SAMPLE_NOTES, blocksToText } from "../src/shared/report.js";

const [file, ...models] = process.argv.slice(2);
const notes = file ? { ...SAMPLE_NOTES, ...JSON.parse(fs.readFileSync(file, "utf8")) } : SAMPLE_NOTES;
const history = process.env.TRY_HISTORY ? JSON.parse(fs.readFileSync(process.env.TRY_HISTORY, "utf8")) : [];
const g = createGenerator({ getKey: () => null });

for (const model of models.length ? models : [DEFAULT_LOCAL.model]) {
  const t0 = Date.now();
  let first = null, n = 0;
  const r = await g.generate({
    notes, template: DEFAULT_TEMPLATE, profile: { name: "Test User", role: "Trainee" },
    date: new Date().toISOString().slice(0, 10), dateFormat: "long", mode: "auto", history,
    onProgress: () => { n++; first ??= Date.now() - t0; },
    ai: { local: { ...DEFAULT_LOCAL, model }, fallback: { provider: "none", auto: false }, geminiModel: "flash", privacyTerms: "" }
  });
  const s = ms => (ms / 1000).toFixed(1) + " s";
  console.log(`\n=== ${model} | source: ${r.source} | first sentence ${first == null ? "-" : s(first)} | total ${s(Date.now() - t0)} | streamed ${n}${r.note ? " | " + r.note : ""}\n${blocksToText(r.blocks)}`);
}
