// Compare local models on your own notes. Not part of the test suite: it calls a real Ollama.
// Usage: node scripts/try-local.mjs [notes.json] [model ...]
//   notes.json: {"work":"...","topics":"...","progress":"...","blockers":"...","tomorrow":"..."}
//   Without a file the built-in example notes are used. Without models, the default model is used.
import fs from "node:fs";
import { createGenerator } from "../src/main/generate.js";
import { DEFAULT_LOCAL } from "../src/shared/ai.js";
import { DEFAULT_TEMPLATE, SAMPLE_NOTES, blocksToText } from "../src/shared/report.js";

const [file, ...models] = process.argv.slice(2);
const notes = file ? { ...SAMPLE_NOTES, ...JSON.parse(fs.readFileSync(file, "utf8")) } : SAMPLE_NOTES;
const g = createGenerator({ getKey: () => null });

for (const model of models.length ? models : [DEFAULT_LOCAL.model]) {
  const t0 = Date.now();
  const r = await g.generate({
    notes, template: DEFAULT_TEMPLATE, profile: { name: "Test User", role: "Trainee" },
    date: new Date().toISOString().slice(0, 10), dateFormat: "long", mode: "auto",
    ai: { local: { ...DEFAULT_LOCAL, model }, fallback: { provider: "none", auto: false }, geminiModel: "flash", privacyTerms: "" }
  });
  console.log(`\n=== ${model} | source: ${r.source} | ${((Date.now() - t0) / 1000).toFixed(1)} s${r.note ? " | " + r.note : ""}\n${blocksToText(r.blocks)}`);
}
