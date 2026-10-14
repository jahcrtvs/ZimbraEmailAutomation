# Smarter, Faster Local AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local AI write better-structured sentences in the user's own tone and generate a typical report (8-12 items) in under 60 seconds on a CPU-only machine.

**Architecture:** Keep the single local request per report. Replace the long rule prompt with a short instruction plus example pairs mined from sent history. Force the reply shape with a JSON schema whose array lengths equal the number of note items, so sentence N is always the rewording of item N. Check each sentence against its item and replace only the bad ones with the built-in rule. Stream sentences to the UI as they are written.

**Tech Stack:** Electron (main/preload/renderer), Vitest, Ollama's OpenAI-compatible `/v1` API (json_schema output, `keep_alive`, `max_tokens`, streaming).

**Spec:** `docs/superpowers/specs/2026-10-14-smarter-faster-local-ai-design.md`

## Global Constraints

- Local-first, no invented facts: a sentence may not add numbers, names or tools the item does not state.
- Cloud path (`CLOUD`, `call`, sanitising, consent) is unchanged. Example pairs and history are never sent to a cloud provider.
- Target: a typical report in under 60 s on the user's i5-1135G7 (4 cores, 16 GB, CPU only); at most 1 in 10 items falls back to the built-in rule.
- Sentence length asked for: 12 to 20 words.
- Local model stays `qwen2.5:3b-instruct` (`DEFAULT_LOCAL` in `src/shared/ai.js`). Bigger models and per-item calls are out of scope.
- Code style: ES modules, double quotes, 2-space indent, terse arrow functions; match the surrounding files. Tests use Vitest in `tests/unit/...`.
- Commit messages end with: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (use a second `-m`).
- The Bash tool may not work on this machine; run git and npm through PowerShell if it fails.

## Decisions made while planning (differ from the spec on purpose)

Verified against the user's Ollama 0.40.2 on 2026-10-14:

1. **No `num_ctx`.** `/v1` cannot set it. The default (4096) already holds a prompt with 6 examples, and it never changes between runs, so no reload happens.
2. **`keep_alive` is sent in the `/v1` request body** (`"30m"`). Ollama honoured it (`ollama ps` showed ~45 minutes left).
3. **Exact counts in the schema.** `minItems == maxItems` per section (verified: Ollama returned exactly 3 sentences for 3 items and `[]` for 0). This makes index alignment reliable, so the check works per item. If a reply still has the wrong count, that whole section uses the built-in rules. A *partial* reply (stream dropped) is aligned by prefix.
4. **Live sentences in the UI** need a small progress channel (`ai:progress` event, preload `onGenerateProgress`, `genLines` in `useApp`). The spec said "streaming"; this is the minimal wiring.
5. **When every sentence is rejected,** the result is reported as source `template` (the existing "AI was not used" banner), not `local`.

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/shared/report.js` | modify | `noteItems(notes)`: the raw item lines, aligned with `buildVars` output |
| `src/main/reply.js` | modify | `SECTION_KEYS`, `LOCAL_PROMPT`, `localPrompt(examples)`; cloud `PROMPT` unchanged |
| `src/main/check.js` | create | `inventsFacts`, `applyChecks` (per-item check + built-in fallback) |
| `src/main/examples.js` | create | `pairsFromHistory`, `pickExamples`, `BUILT_IN_EXAMPLES` |
| `src/main/jsonStream.js` | create | `createSentenceScanner`: pulls finished sentences out of partial JSON |
| `src/main/localai.js` | modify | schema, `max_tokens`, `keep_alive`, system message, streaming, partial results, `warmUp` |
| `src/main/generate.js` | modify | orchestration; `history`, `onProgress`; `warmUp` |
| `src/main/ipc.js`, `src/preload/index.js`, `src/main/index.js` | modify | pass history, forward progress, warm up at start |
| `src/renderer/src/useApp.js`, `src/renderer/src/screens/NewDigest.jsx` | modify | show live sentences; banner for partial fallbacks |
| `scripts/try-local.mjs`, `README.md`, `docs/local-ai-benchmark.md` | modify/create | benchmark and docs |

## Review Focus

1. Notes with blank lines, bullets (`-`, `•`, `*`), CRLF or repeated items: sentence N must still belong to item N (Task 1, Task 2).
2. A sent report the user hand-edited so its sentence count differs from the note count: that section must be skipped as an example source, never mismatched (Task 3).
3. The stream drops after some sentences: those sentences are kept and the rest use built-in rules; the user never sees an error if something was received (Task 6, Task 7).
4. History (the user's past work) must never appear in a cloud request (Task 7).
5. The server is an older Ollama that rejects `json_schema` (HTTP 400): the error message tells the user to update Ollama and the cloud fallback path still works (Task 6).

---

### Task 1: Baseline, `noteItems`, and spec revisions

**Files:**
- Modify: `src/shared/report.js` (add `noteItems` after `lines`, line 55)
- Create: `tests/unit/shared/noteitems.test.js`
- Create: `docs/local-ai-benchmark.md`
- Modify: `docs/superpowers/specs/2026-10-14-smarter-faster-local-ai-design.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `noteItems(notes) -> { tasks: string[], topics: string[], weekly_plans: string[], blockers: string[] }`. Each array has the same length and order as the matching array from `buildVars(...)`. `tasks` is the Today's Work lines followed by the Still Working On lines.

- [ ] **Step 1: Record the baseline before changing anything**

Make sure Ollama is running and `qwen2.5:3b-instruct` is installed, then run the existing script twice (the first run includes model load time):

Run: `node scripts/try-local.mjs`
Run: `node scripts/try-local.mjs`
Expected: each prints `=== qwen2.5:3b-instruct | source: local | N.N s` and a report. Note both times. Create `docs/local-ai-benchmark.md`:

```markdown
# Local AI benchmark

Machine: Intel i5-1135G7, 4 cores, 15.7 GB RAM, CPU only. Model: qwen2.5:3b-instruct. Notes: the built-in SAMPLE_NOTES (10 items).

| Run | Total time | First sentence | Items using built-in rule |
|---|---|---|---|
| Before, cold | <first run seconds> s | n/a | n/a |
| Before, warm | <second run seconds> s | n/a | n/a |
```

Replace the two `<...>` placeholders with the numbers you measured.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/shared/noteitems.test.js`:

```js
import { describe, it, expect } from "vitest";
import { noteItems, buildVars, SAMPLE_NOTES } from "../../../src/shared/report.js";
import { fromISODate } from "../../../src/shared/time.js";

const KEYS = ["tasks", "topics", "weekly_plans", "blockers"];
const vars = n => buildVars(n, { name: "A", role: "B" }, fromISODate("2026-10-08"), "long");

describe("noteItems", () => {
  it("splits each field into trimmed non-empty lines and puts Still Working On after Today's Work", () => {
    const n = { work: "  fixed login \n\n- wrote tests\r\n", topics: "• hql", progress: "* still on ids", blockers: "", tomorrow: "tomorrow review" };
    expect(noteItems(n)).toEqual({ tasks: ["fixed login", "wrote tests", "still on ids"], topics: ["hql"], weekly_plans: ["tomorrow review"], blockers: [] });
  });
  it("has the same lengths as the built-in sentences, so item N matches sentence N", () => {
    const messy = { work: "a\n\n- b\r\n  \nc", topics: "\n• x\n", progress: "- y", blockers: "z\n\n", tomorrow: "- t1\nt2" };
    for (const n of [SAMPLE_NOTES, messy]) {
      const items = noteItems(n), v = vars(n);
      for (const k of KEYS) expect(items[k]).toHaveLength(v[k].length);
    }
  });
  it("treats missing fields as empty", () => {
    expect(noteItems({})).toEqual({ tasks: [], topics: [], weekly_plans: [], blockers: [] });
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/unit/shared/noteitems.test.js`
Expected: FAIL (`noteItems is not a function` or not exported).

- [ ] **Step 4: Implement**

In `src/shared/report.js`, add directly after the `lines` export (line 55):

```js
const itemLines = text => (text || "").split(/\r?\n/).map(l => l.trim().replace(/^[-•*]\s*/, "")).filter(Boolean);
// The raw items behind buildVars: item N here becomes sentence N there.
export const noteItems = n => ({
  tasks: [...itemLines(n.work), ...itemLines(n.progress)],
  topics: itemLines(n.topics),
  weekly_plans: itemLines(n.tomorrow),
  blockers: itemLines(n.blockers)
});
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/unit/shared/noteitems.test.js`
Expected: PASS 3/3.

- [ ] **Step 6: Revise the spec**

Append to `docs/superpowers/specs/2026-10-14-smarter-faster-local-ai-design.md`:

```markdown

## Revisions after probing Ollama 0.40.2 (2026-10-14)

- `num_ctx` is dropped: `/v1` cannot set it and the default of 4096 is stable between runs.
- `keep_alive` is sent in the `/v1` request body and Ollama honours it.
- The JSON schema fixes each array's length to the number of note items (`minItems == maxItems`), so sentence N is item N. A reply with the wrong count makes that whole section use the built-in rules; a stream that drops part-way is aligned by prefix.
- Live sentences in the UI use a new `ai:progress` event.
- If every sentence is rejected by the check, the result is reported as source `template`.
```

- [ ] **Step 7: Commit**

```bash
git add src/shared/report.js tests/unit/shared/noteitems.test.js docs/local-ai-benchmark.md docs/superpowers/specs/2026-10-14-smarter-faster-local-ai-design.md
git commit -m "feat: noteItems, local AI baseline and spec revisions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The invented-fact check

**Files:**
- Modify: `src/main/reply.js` (add `SECTION_KEYS`; use it in `parseReply`)
- Create: `src/main/check.js`
- Test: `tests/unit/main/check.test.js`

**Interfaces:**
- Consumes: `noteItems` shape from Task 1 (plain `{tasks, topics, weekly_plans, blockers}` arrays).
- Produces:
  - `SECTION_KEYS` from `reply.js`: `["tasks", "topics", "weekly_plans", "blockers"]`.
  - `inventsFacts(item: string, sentence: string) -> boolean` (true = reject).
  - `applyChecks({ items, parsed, builtIn, partial = false }) -> { parsed, fallbacks: number, total: number }`. `items`, `parsed`, `builtIn` are `{tasks, topics, weekly_plans, blockers}` string arrays; `builtIn` is the output of `buildVars` (it has extra keys; only the four are read).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/main/check.test.js`:

```js
import { describe, it, expect } from "vitest";
import { inventsFacts, applyChecks } from "../../../src/main/check.js";

describe("inventsFacts", () => {
  it("accepts a sentence that only rewords the item", () => {
    expect(inventsFacts("fixed duplicate result", "Fixed the duplicate query results in the repository.")).toBe(false);
  });
  it("rejects a number the item does not state, and accepts one it does", () => {
    expect(inventsFacts("fixed login bug", "Fixed the login bug within 3 hours.")).toBe(true);
    expect(inventsFacts("fixed 2 bugs", "Fixed 2 bugs in the login page.")).toBe(false);
  });
  it("rejects a name the item does not mention", () => {
    expect(inventsFacts("emailed boss", "Emailed Cruz about the issue.")).toBe(true);
    expect(inventsFacts("asked Cruz for review", "Asked Cruz to review the changes.")).toBe(false);
  });
  it("allows well-known technical terms and the item's own words in any case", () => {
    expect(inventsFacts("lesson in hibernate", "Studied the Hibernate lesson, covering how Java objects map to database tables using ORM.")).toBe(false);
    expect(inventsFacts("hql vs criteria", "Studied the difference between HQL and Criteria queries.")).toBe(false);
  });
  it("does not treat the first word or a lower-case word as a name", () => {
    expect(inventsFacts("wrote tests", "Wrote unit tests for the service methods.")).toBe(false);
  });
});

const items = { tasks: ["fixed login", "wrote tests"], topics: [], weekly_plans: [], blockers: [] };
const builtIn = { tasks: ["Fixed login.", "Wrote tests."], topics: [], weekly_plans: [], blockers: [], date: "x" };
const reply = tasks => ({ tasks, topics: [], weekly_plans: [], blockers: [] });

describe("applyChecks", () => {
  it("keeps good sentences", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page.", "Wrote the unit tests."]), builtIn });
    expect(r).toEqual({ parsed: reply(["Fixed the login page.", "Wrote the unit tests."]), fallbacks: 0, total: 2 });
  });
  it("replaces only the sentence that fails", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed login in 3 hours.", "Wrote the unit tests."]), builtIn });
    expect(r.parsed.tasks).toEqual(["Fixed login.", "Wrote the unit tests."]);
    expect(r.fallbacks).toBe(1);
  });
  it("uses the built-in rules for a whole section whose sentence count is wrong", () => {
    const r = applyChecks({ items, parsed: reply(["Only one."]), builtIn });
    expect(r.parsed.tasks).toEqual(["Fixed login.", "Wrote tests."]);
    expect(r.fallbacks).toBe(2);
  });
  it("replaces blank sentences", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page.", "   "]), builtIn });
    expect(r.parsed.tasks).toEqual(["Fixed the login page.", "Wrote tests."]);
  });
  it("aligns a partial reply by prefix and uses built-in rules for the rest", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page."]), builtIn, partial: true });
    expect(r.parsed.tasks).toEqual(["Fixed the login page.", "Wrote tests."]);
    expect(r.fallbacks).toBe(1);
  });
  it("does not trust a partial reply that has more sentences than items", () => {
    const r = applyChecks({ items, parsed: reply(["A.", "B.", "C."]), builtIn, partial: true });
    expect(r.parsed.tasks).toEqual(["Fixed login.", "Wrote tests."]);
  });
  it("returns empty sections as empty and counts only real items", () => {
    const r = applyChecks({ items, parsed: reply(["Fixed the login page.", "Wrote the unit tests."]), builtIn });
    expect(r.parsed.topics).toEqual([]);
    expect(r.total).toBe(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/main/check.test.js`
Expected: FAIL (cannot find module `check.js`).

- [ ] **Step 3: Add `SECTION_KEYS` to `reply.js`**

In `src/main/reply.js`, add above `export function parseReply` (before line 24):

```js
export const SECTION_KEYS = ["tasks", "topics", "weekly_plans", "blockers"];
```

and in `parseReply` replace `for (const k of ["tasks", "topics", "weekly_plans", "blockers"]) {` with `for (const k of SECTION_KEYS) {`.

- [ ] **Step 4: Implement `check.js`**

Create `src/main/check.js`:

```js
import { SECTION_KEYS } from "./reply.js";

// Capitalised words a sentence may use even when the item does not contain them.
const TECH_TERMS = new Set(["hibernate", "spring", "boot", "java", "sql", "hql", "jdbc", "api", "apis", "orm", "crud", "id", "ids", "rest", "json", "xml", "http", "https", "html", "css", "javascript", "postgresql", "mysql", "jpa", "mvc", "maven", "git", "github", "junit", "jsp", "jstl", "tomcat", "jakarta", "criteria", "url", "ui"]);

const wordsOf = s => (s.match(/[A-Za-z][A-Za-z0-9+#]*/g) || []).map(w => w.toLowerCase());

// True when the sentence adds a number or a capitalised name that the item does not state.
export function inventsFacts(item, sentence) {
  const known = new Set(wordsOf(item));
  if ((sentence.match(/\d+/g) || []).some(d => !item.includes(d))) return true;
  const caps = (sentence.match(/\b[A-Z][A-Za-z0-9+#]*/g) || []).slice(sentence.trim().match(/^[A-Z]/) ? 1 : 0);
  return caps.some(w => { const l = w.toLowerCase(); return !known.has(l) && !TECH_TERMS.has(l); });
}

// Keeps each good AI sentence; any other item gets its built-in rule sentence.
export function applyChecks({ items, parsed, builtIn, partial = false }) {
  const out = {};
  let fallbacks = 0, total = 0;
  for (const k of SECTION_KEYS) {
    const src = items[k] || [], got = parsed[k] || [], base = builtIn[k] || [];
    total += src.length;
    const aligned = got.length === src.length || (partial && got.length < src.length);
    out[k] = src.map((item, i) => {
      const s = aligned && typeof got[i] === "string" ? got[i].trim() : "";
      if (s && !inventsFacts(item, s)) return s;
      fallbacks++;
      return base[i];
    });
  }
  return { parsed: out, fallbacks, total };
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run tests/unit/main/check.test.js`
Expected: PASS 12/12. If the "first word" case fails, the `slice` that skips the first capitalised word is the place to fix: the first word of the sentence must never be flagged.

- [ ] **Step 6: Run the whole suite**

Run: `npx vitest run`
Expected: all pass (the `parseReply` edit must not change behaviour).

- [ ] **Step 7: Commit**

```bash
git add src/main/reply.js src/main/check.js tests/unit/main/check.test.js
git commit -m "feat: per-item check for invented facts with built-in rule fallback" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Example pairs from history

**Files:**
- Create: `src/main/examples.js`
- Test: `tests/unit/main/examples.test.js`

**Interfaces:**
- Consumes: `noteItems(notes)` (Task 1), `SECTION_KEYS` (Task 2). A history entry is `{ status: "sent", notes: {work, topics, progress, blockers, tomorrow}, blocks: [{type:"section", title, items:[...]}, {type:"text", text}] }`, newest first.
- Produces:
  - `type Example = { section: "tasks"|"topics"|"weekly_plans"|"blockers", item: string, sentence: string }`
  - `BUILT_IN_EXAMPLES: Example[]` (8 entries)
  - `pairsFromHistory(history) -> Example[]` (newest first)
  - `pickExamples({ history = [], items, limit = 6 }) -> Example[]` where `items` is `noteItems(...)` output; result is at most `limit`, ordered by section then rank.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/main/examples.test.js`:

```js
import { describe, it, expect } from "vitest";
import { pairsFromHistory, pickExamples, BUILT_IN_EXAMPLES } from "../../../src/main/examples.js";
import { noteItems, SAMPLE_NOTES } from "../../../src/shared/report.js";

const notes = o => ({ work: "", topics: "", progress: "", blockers: "", tomorrow: "", ...o });
const sec = (title, items) => ({ type: "section", title, items });
const entry = (n, blocks, status = "sent") => ({ status, notes: notes(n), blocks });
const none = { tasks: [], topics: [], weekly_plans: [], blockers: [] };

describe("pairsFromHistory", () => {
  it("pairs the n-th item with the n-th sentence of its section", () => {
    const h = [entry({ work: "fixed login\nwrote tests", topics: "hql" }, [sec("TASK TODAY", ["Fixed the login page.", "Wrote unit tests."]), sec("TOPICS", ["Studied HQL."]), { type: "text", text: "Regards," }])];
    expect(pairsFromHistory(h)).toEqual([
      { section: "tasks", item: "fixed login", sentence: "Fixed the login page." },
      { section: "tasks", item: "wrote tests", sentence: "Wrote unit tests." },
      { section: "topics", item: "hql", sentence: "Studied HQL." }
    ]);
  });
  it("skips a section whose sentence count differs from its item count (edited report)", () => {
    const h = [entry({ work: "a\nb", topics: "hql" }, [sec("TASK TODAY", ["Only one."]), sec("TOPICS", ["Studied HQL."])])];
    expect(pairsFromHistory(h).map(p => p.section)).toEqual(["topics"]);
  });
  it("ignores unsent entries, unknown section titles and blank sentences", () => {
    const h = [entry({ work: "a" }, [sec("TASK TODAY", ["Did a."])], "draft"), entry({ work: "a" }, [sec("WORK DONE", ["Did a."])]), entry({ work: "a" }, [sec("TASK TODAY", [" "])])];
    expect(pairsFromHistory(h)).toEqual([]);
  });
  it("copes with entries that have no notes or blocks", () => {
    expect(pairsFromHistory([{ status: "sent" }, null, {}])).toEqual([]);
  });
  it("removes exact duplicates", () => {
    const e = entry({ work: "a" }, [sec("TASK TODAY", ["Did a."])]);
    expect(pairsFromHistory([e, e])).toHaveLength(1);
  });
});

describe("pickExamples", () => {
  it("tops up with built-in examples when there is no history, covering every section that has items", () => {
    const got = pickExamples({ history: [], items: noteItems(SAMPLE_NOTES) });
    expect(got).toHaveLength(6);
    for (const s of ["tasks", "topics", "weekly_plans"]) expect(got.some(e => e.section === s)).toBe(true);
    for (const e of got) expect(BUILT_IN_EXAMPLES).toContainEqual(e);
  });
  it("prefers a similar example from the user's own history", () => {
    const h = [entry({ work: "criteria api projections" }, [sec("TASK TODAY", ["Worked on Criteria API projections in the office project."])])];
    const got = pickExamples({ history: h, items: { ...none, tasks: ["criteria query"] }, limit: 2 });
    expect(got.map(e => e.item)).toContain("criteria api projections");
  });
  it("never returns more than the limit", () => {
    expect(pickExamples({ history: [], items: noteItems(SAMPLE_NOTES), limit: 3 })).toHaveLength(3);
  });
  it("orders the result by section", () => {
    const order = ["tasks", "topics", "weekly_plans", "blockers"];
    const got = pickExamples({ history: [], items: noteItems(SAMPLE_NOTES) }).map(e => order.indexOf(e.section));
    expect(got).toEqual([...got].sort((a, b) => a - b));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/main/examples.test.js`
Expected: FAIL (cannot find module `examples.js`).

- [ ] **Step 3: Implement**

Create `src/main/examples.js`:

```js
import { noteItems } from "../shared/report.js";
import { SECTION_KEYS } from "./reply.js";

// Report section titles (default template) -> the reply key that fills them.
const TITLES = { "TASK TODAY": "tasks", "PLANS FOR THE WEEK": "weekly_plans", "TOPICS": "topics", "BLOCKERS": "blockers" };

export const BUILT_IN_EXAMPLES = [
  { section: "tasks", item: "fixed duplicate result", sentence: "Fixed the duplicate results returned by the search query so that each record now appears once." },
  { section: "tasks", item: "worked on office repository", sentence: "Worked on the office repository, including the methods that save and retrieve records from the database." },
  { section: "tasks", item: "wrote unit tests", sentence: "Wrote unit tests for the service methods to confirm that they behave as expected." },
  { section: "topics", item: "lesson in hibernate", sentence: "Studied the Hibernate lesson, covering how Java objects are mapped to database tables using ORM." },
  { section: "topics", item: "hql vs criteria", sentence: "Reviewed the differences between HQL and the Criteria API when writing queries in Hibernate." },
  { section: "weekly_plans", item: "continue repository", sentence: "Continue work on the repository and complete the remaining data access methods." },
  { section: "weekly_plans", item: "practice joins", sentence: "Practice writing SQL joins to retrieve related records from several database tables." },
  { section: "blockers", item: "cannot connect to database", sentence: "Unable to connect to the database from the application, so the connection settings are being reviewed." }
];

// Lines each sent report up with the notes it came from. A section is used only when its
// sentence count equals its item count; a hand-edited report is skipped, never mismatched.
export function pairsFromHistory(history) {
  const out = [], seen = new Set();
  for (const h of history || []) {
    if (!h || h.status !== "sent" || !h.notes || !Array.isArray(h.blocks)) continue;
    const items = noteItems(h.notes);
    for (const b of h.blocks) {
      const k = b?.type === "section" ? TITLES[b.title] : null;
      if (!k || !items[k].length || b.items.length !== items[k].length) continue;
      items[k].forEach((item, i) => {
        const sentence = String(b.items[i] || "").trim(), key = k + "|" + item + "|" + sentence;
        if (sentence && !seen.has(key)) { seen.add(key); out.push({ section: k, item, sentence }); }
      });
    }
  }
  return out;
}

const words = s => String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || [];

export function pickExamples({ history = [], items, limit = 6 }) {
  const mine = pairsFromHistory(history).map(c => ({ c, bonus: 0.5 }));
  const today = new Set(SECTION_KEYS.flatMap(k => items[k] || []).flatMap(words));
  const ranked = [...mine, ...BUILT_IN_EXAMPLES.map(c => ({ c, bonus: 0 }))]
    .map((r, i) => ({ ...r, i, score: new Set(words(r.c.item)).size && [...new Set(words(r.c.item))].filter(w => today.has(w)).length + r.bonus }))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const picked = [];
  for (const k of SECTION_KEYS) {
    if (!(items[k] || []).length) continue;
    const best = ranked.find(r => r.c.section === k && !picked.includes(r));
    if (best) picked.push(best);
  }
  for (const r of ranked) if (picked.length < limit && !picked.includes(r)) picked.push(r);
  return picked.slice(0, limit).sort((a, b) => SECTION_KEYS.indexOf(a.c.section) - SECTION_KEYS.indexOf(b.c.section) || a.i - b.i).map(r => r.c);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/main/examples.test.js`
Expected: PASS 9/9.

- [ ] **Step 5: Commit**

```bash
git add src/main/examples.js tests/unit/main/examples.test.js
git commit -m "feat: build example pairs from sent history with built-in top-up" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The short local prompt

**Files:**
- Modify: `src/main/reply.js` (add `LOCAL_PROMPT`, `localPrompt`; leave `PROMPT` and `notesText` as they are)
- Test: `tests/unit/main/reply.test.js` (create)

**Interfaces:**
- Consumes: `Example` shape from Task 3.
- Produces: `LOCAL_PROMPT: string`; `localPrompt(examples: Example[]) -> string` (the system message for the local model). The cloud `PROMPT` is unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/main/reply.test.js`:

```js
import { describe, it, expect } from "vitest";
import { PROMPT, LOCAL_PROMPT, localPrompt } from "../../../src/main/reply.js";

describe("local prompt", () => {
  it("is much shorter than the cloud prompt and asks for 12 to 20 words, one sentence per note", () => {
    expect(LOCAL_PROMPT.length).toBeLessThan(PROMPT.length * 0.8);
    expect(LOCAL_PROMPT).toContain("12 to 20 words");
    expect(LOCAL_PROMPT).toContain("exactly one sentence");
    expect(LOCAL_PROMPT).toContain('{"tasks":[],"topics":[],"weekly_plans":[],"blockers":[]}');
  });
  it("does not contain the notes marker, so the fixed text stays cacheable", () => {
    expect(LOCAL_PROMPT).not.toContain("Notes:");
  });
  it("lists the examples after the rules", () => {
    const p = localPrompt([{ section: "tasks", item: "fixed login", sentence: "Fixed the login page." }]);
    expect(p.startsWith(LOCAL_PROMPT)).toBe(true);
    expect(p).toContain("tasks: fixed login => Fixed the login page.");
  });
  it("is just the rules when there are no examples", () => {
    expect(localPrompt([])).toBe(LOCAL_PROMPT);
  });
  it("leaves the cloud prompt as it was", () => {
    expect(PROMPT).toContain("12 to 25 words");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/main/reply.test.js`
Expected: FAIL (`LOCAL_PROMPT` / `localPrompt` undefined).

- [ ] **Step 3: Implement**

In `src/main/reply.js`, add after the `PROMPT` constant (after line 19):

```js
export const LOCAL_PROMPT = `You rewrite a trainee developer's rough daily notes into formal status-report sentences for their manager.
Rules:
- Each note line becomes exactly one sentence of 12 to 20 words, in the same order, starting with a verb and ending with a period.
- Work done: past tense. Study topics: "Studied ..." or "Reviewed ...". Plans: "Continue ..." or "Complete ...". Still Working On: "Still working on: ..." or "Investigating ...".
- Fix the spelling of technical names (Hibernate, Spring Boot, HQL, API, SQL, JDBC, ORM, Java).
- Never add numbers, results, causes, people or tools the note does not mention. No em dashes, no exclamation marks, no words like "successfully" or "comprehensive".
Reply only with JSON: {"tasks":[],"topics":[],"weekly_plans":[],"blockers":[]}
tasks = Today's Work, then Still Working On. topics = Topics / Lessons. weekly_plans = Tomorrow. blockers = Blockers.
`;

// Examples show tone and structure only; the model must not copy their facts.
export const localPrompt = examples => examples.length
  ? LOCAL_PROMPT + "\nExamples of the style to copy (section: note => sentence):\n" + examples.map(e => `${e.section}: ${e.item} => ${e.sentence}`).join("\n") + "\n"
  : LOCAL_PROMPT;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/main/reply.test.js`
Expected: PASS 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/main/reply.js tests/unit/main/reply.test.js
git commit -m "feat: short example-driven prompt for the local model" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Pull finished sentences out of streaming JSON

**Files:**
- Create: `src/main/jsonStream.js`
- Test: `tests/unit/main/jsonStream.test.js`

**Interfaces:**
- Consumes: `SECTION_KEYS` (Task 2).
- Produces: `createSentenceScanner(onSentence?: (section: string, sentence: string, index: number) => void) -> { push(chunk: string): void, result(): { tasks: string[], topics: string[], weekly_plans: string[], blockers: string[] } }`. Only completed strings inside the four section arrays are reported. It never throws on malformed input.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/main/jsonStream.test.js`:

```js
import { describe, it, expect } from "vitest";
import { createSentenceScanner } from "../../../src/main/jsonStream.js";

const json = '{\n  "tasks": [\n    "Did A.",\n    "Did \\"B\\"."\n  ],\n  "topics": [],\n  "weekly_plans": ["Plan\\nline"],\n  "blockers": ["Caf\\u00e9 closed."]\n}';
const expected = [["tasks", "Did A.", 0], ["tasks", 'Did "B".', 1], ["weekly_plans", "Plan\nline", 0], ["blockers", "Café closed.", 0]];
const feed = (text, size) => {
  const got = [];
  const s = createSentenceScanner((section, sentence, index) => got.push([section, sentence, index]));
  for (let i = 0; i < text.length; i += size) s.push(text.slice(i, i + size));
  return { got, result: s.result() };
};

describe("createSentenceScanner", () => {
  it("reports each finished sentence once, however the text is chunked", () => {
    for (const size of [1, 2, 5, 1000]) expect(feed(json, size).got).toEqual(expected);
  });
  it("collects the sentences per section", () => {
    expect(feed(json, 7).result).toEqual({ tasks: ["Did A.", 'Did "B".'], topics: [], weekly_plans: ["Plan\nline"], blockers: ["Café closed."] });
  });
  it("does not report a sentence that is still being written", () => {
    const { got, result } = feed('{"tasks":["Done.","Unfini', 3);
    expect(got).toEqual([["tasks", "Done.", 0]]);
    expect(result.tasks).toEqual(["Done."]);
  });
  it("ignores keys and strings outside the four sections, and survives garbage", () => {
    const { got } = feed('{"extra":["x"],"tasks":["Y."]} }}} "unterminated', 4);
    expect(got).toEqual([["tasks", "Y.", 0]]);
  });
  it("works without a callback", () => {
    const s = createSentenceScanner();
    s.push('{"tasks":["Z."]}');
    expect(s.result().tasks).toEqual(["Z."]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/main/jsonStream.test.js`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement**

Create `src/main/jsonStream.js`:

```js
import { SECTION_KEYS } from "./reply.js";

const ESC = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" };

// Reads the model's JSON as it arrives and reports each finished string inside a section array.
export function createSentenceScanner(onSentence = () => {}) {
  const result = Object.fromEntries(SECTION_KEYS.map(k => [k, []]));
  let depth = 0, inStr = false, esc = false, uni = null, buf = "", key = null;
  const finish = s => {
    if (depth === 1) key = s;
    else if (depth === 2 && result[key]) { result[key].push(s); onSentence(key, s, result[key].length - 1); }
  };
  const step = c => {
    if (inStr) {
      if (uni !== null) { uni += c; if (uni.length === 4) { buf += String.fromCharCode(parseInt(uni, 16) || 63); uni = null; } }
      else if (esc) { esc = false; if (c === "u") uni = ""; else buf += ESC[c] ?? c; }
      else if (c === "\\") esc = true;
      else if (c === '"') { inStr = false; finish(buf); }
      else buf += c;
    } else if (c === '"') { inStr = true; buf = ""; }
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") { depth = Math.max(0, depth - 1); if (depth === 1) key = null; }
  };
  return { push(chunk) { for (const c of chunk) step(c); }, result: () => result };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/unit/main/jsonStream.test.js`
Expected: PASS 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/main/jsonStream.js tests/unit/main/jsonStream.test.js
git commit -m "feat: scanner that pulls finished sentences out of streaming JSON" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Structured, cached, streaming local calls

**Files:**
- Modify: `src/main/localai.js`
- Modify: `tests/unit/main/localai.test.js` (one existing assertion changes; new tests added)

**Interfaces:**
- Consumes: `SECTION_KEYS`, `parseReply` (reply.js); `createSentenceScanner` (Task 5); `isCloudModel`, `isLoopbackUrl`, `pullCommand` (shared/ai.js).
- Produces:
  - `runLocal({ fetchImpl = fetch, local, text, system, counts, onSentence }) -> Promise<{tasks, topics, weekly_plans, blockers, partial?: true}>`. `system` (optional) becomes a system message. `counts` (optional) is `{tasks: n, topics: n, weekly_plans: n, blockers: n}` and fixes each array's length in the schema and sizes `max_tokens`. `onSentence(section, sentence, index)` (optional) turns on streaming. When a stream breaks after at least one sentence, resolves with the sentences received plus `partial: true`. When it breaks with none, rejects with `code: "STREAM"`.
  - `warmUp({ fetchImpl = fetch, local }) -> Promise<void>`: never throws; does nothing for hosted (`-cloud`) models or non-loopback servers.
  - `KEEP_ALIVE = "30m"`.
  - `localStatus` is unchanged.

- [ ] **Step 1: Update the one existing assertion and write the new failing tests**

In `tests/unit/main/localai.test.js` change line 25 from
`expect(body.response_format).toEqual({ type: "json_object" });`
to
`expect(body.response_format.type).toBe("json_schema");`

Change the import on line 2 to `import { runLocal, localStatus, warmUp, KEEP_ALIVE } from "../../../src/main/localai.js";`

Insert before the existing `describe("localStatus", ...)` block:

```js
const enc = new TextEncoder();
// A streaming reply: strings become SSE deltas, an Error makes the connection fail at that point.
const sse = (...parts) => {
  const queue = parts.map(p => p instanceof Error ? p : enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`));
  let i = 0;
  return { ok: true, status: 200, statusText: "OK", body: { getReader: () => ({ read: async () => {
    if (i >= queue.length) return { done: true };
    const x = queue[i++]; if (x instanceof Error) throw x; return { done: false, value: x };
  } }) } };
};
const counts = { tasks: 2, topics: 0, weekly_plans: 0, blockers: 0 };

describe("runLocal request shape", () => {
  it("asks for a schema-valid reply with exactly one sentence per item, a token cap and keep_alive", async () => {
    const f = seq(chat({ tasks: ["A.", "B."], topics: [], weekly_plans: [], blockers: [] }));
    await runLocal({ fetchImpl: f, local, text: "t", counts });
    const body = JSON.parse(f.calls[0].init.body);
    expect(body.response_format.type).toBe("json_schema");
    const props = body.response_format.json_schema.schema.properties;
    expect(props.tasks).toEqual({ type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 });
    expect(props.topics).toMatchObject({ minItems: 0, maxItems: 0 });
    expect(body.max_tokens).toBe(80 + 45 * 2);
    expect(body.keep_alive).toBe(KEEP_ALIVE);
    expect(body.stream).toBeUndefined();
  });
  it("sends the instructions as a system message and the notes as the user message", async () => {
    const f = seq(chat(good));
    await runLocal({ fetchImpl: f, local, system: "RULES", text: "NOTES" });
    expect(JSON.parse(f.calls[0].init.body).messages).toEqual([{ role: "system", content: "RULES" }, { role: "user", content: "NOTES" }]);
  });
  it("tells the user to update Ollama when the server rejects the request", async () => {
    const f = seq(res("bad format", 400, "Bad Request"));
    await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "SERVER", message: expect.stringContaining("Update Ollama") });
    expect(f.calls).toHaveLength(1);
  });
});

describe("runLocal streaming", () => {
  it("reports each sentence as it is written and returns the full reply", async () => {
    const seen = [];
    const f = seq(sse('{"tasks":["Did', ' A."],"topics":[],', '"weekly_plans":[],"blockers":[]}'));
    const out = await runLocal({ fetchImpl: f, local, text: "t", onSentence: (...a) => seen.push(a) });
    expect(out).toEqual({ tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [] });
    expect(seen).toEqual([["tasks", "Did A.", 0]]);
    expect(JSON.parse(f.calls[0].init.body).stream).toBe(true);
  });
  it("keeps the sentences received when the connection drops, and marks the result partial", async () => {
    const f = seq(sse('{"tasks":["Did A.","Un', new Error("socket closed")));
    const out = await runLocal({ fetchImpl: f, local, text: "t", onSentence: () => {} });
    expect(out).toEqual({ tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [], partial: true });
    expect(f.calls).toHaveLength(1);
  });
  it("fails with STREAM when the connection drops before any sentence", async () => {
    const f = seq(sse('{"tasks":["Un', new Error("socket closed")));
    await expect(runLocal({ fetchImpl: f, local, text: "t", onSentence: () => {} })).rejects.toMatchObject({ code: "STREAM" });
  });
  it("asks again without streaming when the streamed reply is not usable", async () => {
    const f = seq(sse("nope"), chat(good));
    const out = await runLocal({ fetchImpl: f, local, text: "t", onSentence: () => {} });
    expect(out.tasks).toEqual(["Did A."]);
    expect(JSON.parse(f.calls[1].init.body).stream).toBeUndefined();
  });
});

describe("warmUp", () => {
  it("loads the model with a one-token request that keeps it loaded", async () => {
    const f = seq(chat("ok"));
    await warmUp({ fetchImpl: f, local });
    const body = JSON.parse(f.calls[0].init.body);
    expect(body).toMatchObject({ model: "qwen2.5:3b-instruct", max_tokens: 1, keep_alive: KEEP_ALIVE });
  });
  it("does nothing for hosted models or servers that are not on this computer", async () => {
    const f = seq(chat("ok"));
    await warmUp({ fetchImpl: f, local: { ...local, model: "gpt-oss:120b-cloud" } });
    await warmUp({ fetchImpl: f, local: { ...local, baseUrl: "http://192.168.1.5:11434/v1" } });
    expect(f.calls).toHaveLength(0);
  });
  it("never throws", async () => {
    await expect(warmUp({ fetchImpl: seq(new TypeError("fetch failed")), local })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run tests/unit/main/localai.test.js`
Expected: FAIL (`warmUp`/`KEEP_ALIVE` not exported; the changed assertion fails).

- [ ] **Step 3: Implement**

Replace the top of `src/main/localai.js` (lines 1-41, everything above `localStatus`) with:

```js
import { pullCommand, isCloudModel, isLoopbackUrl } from "../shared/ai.js";
import { parseReply, SECTION_KEYS } from "./reply.js";
import { createSentenceScanner } from "./jsonStream.js";

export const LOCAL_TIMEOUT_MS = 120000;
export const KEEP_ALIVE = "30m";
const STATUS_TIMEOUT_MS = 5000;

const fail = (code, message) => Object.assign(new Error(message), { code });
const base = u => String(u || "").trim().replace(/\/+$/, "");
const timedOut = e => e?.name === "TimeoutError" || e?.name === "AbortError";

// With counts, each array must hold exactly one sentence per note item, so sentence N is item N.
export function replySchema(counts) {
  const arr = k => counts ? { type: "array", items: { type: "string" }, minItems: counts[k], maxItems: counts[k] } : { type: "array", items: { type: "string" } };
  return { type: "object", properties: Object.fromEntries(SECTION_KEYS.map(k => [k, arr(k)])), required: SECTION_KEYS, additionalProperties: false };
}

async function readStream(res, onSentence) {
  const scanner = createSentenceScanner(onSentence);
  const reader = res.body.getReader(), dec = new TextDecoder();
  let pending = "", text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += dec.decode(value, { stream: true });
      let nl;
      while ((nl = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, nl).trim();
        pending = pending.slice(nl + 1);
        if (!line.startsWith("data:") || line.slice(5).trim() === "[DONE]") continue;
        let delta;
        try { delta = JSON.parse(line.slice(5)).choices?.[0]?.delta?.content; } catch { continue; }
        if (typeof delta === "string") { text += delta; scanner.push(delta); }
      }
    }
  } catch (e) {
    throw Object.assign(timedOut(e) ? fail("TIMEOUT", "The local model took too long to answer.") : fail("STREAM", "The connection to the local AI server dropped."), { partial: scanner.result() });
  }
  return text;
}

async function attempt(fetchImpl, local, { system, text, counts, onSentence }) {
  const total = counts ? SECTION_KEYS.reduce((n, k) => n + counts[k], 0) : 0;
  const body = {
    model: local.model,
    messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: text }],
    temperature: 0.2,
    max_tokens: counts ? 80 + 45 * total : 1024,
    keep_alive: KEEP_ALIVE,
    response_format: { type: "json_schema", json_schema: { name: "digest", strict: true, schema: replySchema(counts) } }
  };
  if (onSentence) body.stream = true;
  let res;
  try {
    res = await fetchImpl(base(local.baseUrl) + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS)
    });
  } catch (e) {
    if (timedOut(e)) throw fail("TIMEOUT", "The local model took too long to answer.");
    throw fail("UNREACHABLE", `Could not reach the local AI server at ${local.baseUrl}.`);
  }
  if (!res.ok) {
    const raw = await res.text();
    if (res.status === 404 && /not found|pull/i.test(raw)) throw fail("MODEL_MISSING", `The model "${local.model}" is not installed. Run: ${pullCommand(local.model)}`);
    if (res.status === 400) throw fail("SERVER", "The local AI server rejected the request (400). Update Ollama to the latest version.");
    throw fail("SERVER", `The local AI server answered ${res.status} ${res.statusText}.`);
  }
  if (onSentence) return readStream(res, onSentence);
  const raw = await res.text();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw fail("BAD_REPLY", "The local AI server sent something that is not JSON."); }
  const reply = parsed?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") throw fail("BAD_REPLY", "The local model returned an empty reply.");
  return reply;
}

const hasSentences = r => SECTION_KEYS.some(k => r[k].length);

export async function runLocal({ fetchImpl = fetch, local, text, system, counts, onSentence }) {
  for (let i = 0; i < 2; i++) {
    let reply;
    try { reply = await attempt(fetchImpl, local, { system, text, counts, onSentence: i === 0 ? onSentence : undefined }); }
    catch (e) {
      if (e.partial && hasSentences(e.partial)) return { ...e.partial, partial: true };
      throw e;
    }
    try { return parseReply(reply, "The local model"); } catch { /* ask once more, without streaming */ }
  }
  throw fail("BAD_REPLY", "The local model did not return a usable reply.");
}

// Loads the model into memory ahead of the first report. Best effort: never throws.
export async function warmUp({ fetchImpl = fetch, local }) {
  if (isCloudModel(local?.model) || !isLoopbackUrl(local?.baseUrl)) return;
  try {
    await fetchImpl(base(local.baseUrl) + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: local.model, messages: [{ role: "user", content: "ok" }], max_tokens: 1, keep_alive: KEEP_ALIVE }),
      signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS)
    });
  } catch { /* the first real report will load the model instead */ }
}
```

Leave `localStatus` below it exactly as it is.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/unit/main/localai.test.js`
Expected: PASS (all existing tests plus the 10 new ones). If the 500-error test fails, check the `!res.ok` branch still reads `raw` before the status checks.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: `generate.test.js` still passes at this point (generate has not changed yet and ignores the new options). If something else fails, fix it before committing.

- [ ] **Step 6: Commit**

```bash
git add src/main/localai.js tests/unit/main/localai.test.js
git commit -m "feat: schema-constrained, cached, streaming local calls with warm-up" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Wire it into `generate`

**Files:**
- Modify: `src/main/generate.js` (imports, `generate`, return object)
- Modify: `tests/unit/main/generate.test.js`

**Interfaces:**
- Consumes: `noteItems` (Task 1); `applyChecks` (Task 2); `pickExamples` (Task 3); `localPrompt`, `SECTION_KEYS` (Tasks 2 and 4); `runLocal`, `warmUp` (Task 6).
- Produces: `generate({ notes, template, profile, date, dateFormat, ai, mode, history = [], onProgress })`. `onProgress({ section, sentence })` is called for each sentence the local model finishes. When some sentences use the built-in rule the result keeps `source: "local"` with a non-null `note`. `createGenerator(...)` also returns `warmUp(local)`.

- [ ] **Step 1: Write the failing tests and fix the existing local-success tests**

In `tests/unit/main/generate.test.js`:

1. Add to the imports (line 3): `import { DEFAULT_TEMPLATE, SAMPLE_NOTES, noteItems } from "../../../src/shared/report.js";`
2. After the `NOTES` definition (line 16) add:

```js
const aligned = (notes, over = {}) => {
  const it = noteItems(notes);
  return { tasks: it.tasks.map(x => `Worked on ${x}.`), topics: it.topics.map(x => `Studied ${x}.`), weekly_plans: it.weekly_plans.map(x => `Continue ${x}.`), blockers: it.blockers.map(x => `Blocked by ${x}.`), ...over };
};
const two = { work: "fixed login\nwrote tests", topics: "", progress: "", blockers: "", tomorrow: "" };
const enc = new TextEncoder();
const sse = (...parts) => {
  const queue = parts.map(p => p instanceof Error ? p : enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`));
  let i = 0;
  return { ok: true, status: 200, statusText: "OK", body: { getReader: () => ({ read: async () => {
    if (i >= queue.length) return { done: true };
    const x = queue[i++]; if (x instanceof Error) throw x; return { done: false, value: x };
  } }) } };
};
```

3. In `route`, change the default `local = () => chat(good)` to `local = () => chat(aligned(NOTES))`.
4. In the first test of `describe("local first")`, change `expect(taskItems(r)).toEqual(["Did A."]);` to `expect(taskItems(r)).toEqual(aligned(NOTES).tasks);`.
4b. In the test "sends the raw notes to the local model", change `.messages[0].content` to `.messages[1].content` (the notes are now the user message; the system message holds the rules).
5. Add this block after the `describe("local first", ...)` block:

```js
describe("local quality", () => {
  const history = [{ status: "sent", notes: { work: "fixed login", topics: "", progress: "", blockers: "", tomorrow: "" }, blocks: [{ type: "section", title: "TASK TODAY", items: ["Fixed the login page."] }] }];
  const local = reply => () => chat(reply);

  it("puts examples from sent history in the system message and asks for one sentence per item", async () => {
    await gen({ local: local(aligned(two)) }).generate(payload({ notes: two, history }));
    const body = JSON.parse(calls[0].init.body);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("tasks: fixed login => Fixed the login page.");
    expect(body.messages[1].content.startsWith("Notes:\n")).toBe(true);
    expect(body.response_format.json_schema.schema.properties.tasks).toMatchObject({ minItems: 2, maxItems: 2 });
    expect(body.response_format.json_schema.schema.properties.topics).toMatchObject({ minItems: 0, maxItems: 0 });
  });
  it("replaces only a sentence that invents a number, and says so", async () => {
    const r = await gen({ local: local(aligned(two, { tasks: ["Fixed the login bug within 3 hours.", "Wrote the unit tests."] })) }).generate(payload({ notes: two }));
    expect(r.source).toBe("local");
    expect(taskItems(r)).toEqual(["Fixed login.", "Wrote the unit tests."]);
    expect(r.note).toMatch(/1 of 2 sentences use the built-in rules/);
  });
  it("uses the built-in rules and says the AI was not used when every sentence is rejected", async () => {
    const r = await gen({ local: local(aligned(two, { tasks: ["Fixed login in 3 hours.", "Wrote 5 tests."] })) }).generate(payload({ notes: two }));
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/could not be used/);
    expect(taskItems(r)).toEqual(["Fixed login.", "Wrote tests."]);
  });
  it("uses the built-in rules for a section when the model returns the wrong number of sentences", async () => {
    const r = await gen({ local: local(aligned(two, { tasks: ["Fixed the login page."] })) }).generate(payload({ notes: two }));
    expect(r.source).toBe("template");
    expect(taskItems(r)).toEqual(["Fixed login.", "Wrote tests."]);
  });
  it("streams sentences to onProgress and keeps what arrived if the connection drops", async () => {
    const seen = [];
    const r = await gen({ local: () => sse('{"tasks":["Fixed the login page.","Wro', new Error("socket closed")) }).generate(payload({ notes: two, onProgress: p => seen.push(p) }));
    expect(seen).toEqual([{ section: "tasks", sentence: "Fixed the login page." }]);
    expect(r.source).toBe("local");
    expect(taskItems(r)).toEqual(["Fixed the login page.", "Wrote tests."]);
    expect(r.note).toMatch(/1 of 2 sentences/);
  });
  it("reports progress for a complete streamed reply and sends stream: true", async () => {
    const seen = [];
    const full = JSON.stringify(aligned(two));
    const r = await gen({ local: () => sse(full.slice(0, 20), full.slice(20)) }).generate(payload({ notes: two, onProgress: p => seen.push(p.sentence) }));
    expect(seen).toEqual(aligned(two).tasks);
    expect(r.note).toBeNull();
    expect(JSON.parse(calls[0].init.body).stream).toBe(true);
  });
  it("never puts history or examples in a cloud request", async () => {
    const secret = [{ status: "sent", notes: { work: "fixed login", topics: "", progress: "", blockers: "", tomorrow: "" }, blocks: [{ type: "section", title: "TASK TODAY", items: ["SECRET SENTENCE about Project Orion."] }] }];
    await gen({}, { groq: "K" }).generate(payload({ mode: "cloud", notes: two, history: secret }));
    await gen({ local: down }, { groq: "K" }).generate(payload({ notes: two, history: secret, ai: aiSettings({ fallback: { provider: "groq", auto: true } }) }));
    for (const c of hits("groq.com")) expect(c.init.body).not.toMatch(/SECRET SENTENCE|Orion|=>/);
  });
  it("exposes warmUp for the stored local settings", async () => {
    const g = gen({ local: () => chat("ok") });
    await g.warmUp(aiSettings().local);
    expect(hits("localhost")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/unit/main/generate.test.js`
Expected: FAIL on the new "local quality" tests (no system message, `warmUp` missing, etc.); earlier tests should now pass or fail only where they depended on `Did A.`.

- [ ] **Step 3: Implement**

In `src/main/generate.js`:

Replace lines 1-6 (imports) with:

```js
import { buildVars, render, noteItems } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";
import { sanitizeNotes, restore } from "../shared/sanitize.js";
import { PROVIDER_NAMES } from "../shared/ai.js";
import { PROMPT, notesText, parseReply, localPrompt, SECTION_KEYS } from "./reply.js";
import { runLocal, localStatus, warmUp } from "./localai.js";
import { applyChecks } from "./check.js";
import { pickExamples } from "./examples.js";
```

Replace the `generate` signature (line 77) with:

```js
  async function generate({ notes, template, profile, date, dateFormat, ai, mode = "auto", history = [], onProgress }) {
```

Replace the local block (lines 84-87, the `if (mode === "auto") { ... }` including its `try`/`catch`) with:

```js
    if (mode === "auto") {
      try {
        const items = noteItems(notes);
        const counts = Object.fromEntries(SECTION_KEYS.map(k => [k, items[k].length]));
        const { partial, ...raw } = await runLocal({
          fetchImpl, local: ai.local, counts,
          system: localPrompt(pickExamples({ history, items })),
          text: "Notes:\n" + notesText(notes),
          onSentence: onProgress && ((section, sentence) => onProgress({ section, sentence }))
        });
        const { parsed, fallbacks, total } = applyChecks({ items, parsed: raw, builtIn: vars, partial: !!partial });
        if (total && fallbacks === total) return plain("The local AI's sentences could not be used, so the built-in text rules were used.");
        const note = fallbacks ? `${fallbacks} of ${total} sentences use the built-in rules because the local AI left them out or added details your notes did not mention.` : null;
        return { ...ok(parsed, "local"), note };
      } catch (e) { failure = { code: e.code || "UNKNOWN", message: e.message }; }
    }
```

In the returned object at the bottom, add after `localStatus`:

```js
    warmUp: local => warmUp({ fetchImpl, local }),
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run tests/unit/main/generate.test.js`
Expected: PASS (existing plus 8 new). A failure in "never puts history or examples in a cloud request" means history reached `PROMPT + text`; fix `generate`, not the test.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/main/generate.js tests/unit/main/generate.test.js
git commit -m "feat: generate locally with examples, per-item checks and live progress" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: IPC, preload and warm-up at start

**Files:**
- Modify: `src/main/ipc.js` (the `ai:generate` handler, lines 20-23)
- Modify: `src/preload/index.js` (add `onGenerateProgress`)
- Modify: `src/main/index.js` (warm up after `registerIpc`)
- Modify: `tests/unit/main/ipc.test.js`

**Interfaces:**
- Consumes: `generator.generate({ ..., history, onProgress })` and `generator.warmUp(local)` (Task 7); `send(channel, payload)`.
- Produces: IPC event `"ai:progress"` with payload `{ section, sentence }`; `window.api.onGenerateProgress(cb) -> unsubscribe`.

- [ ] **Step 1: Write the failing test**

In `tests/unit/main/ipc.test.js`, add inside the `describe("ipc", ...)` block, after the test "defaults the mode to auto and rejects unknown modes":

```js
  it("gives the generator the stored history, and forwards sentences as ai:progress events", async () => {
    let seen;
    deps.generator.generate = async p => { seen = p; p.onProgress({ section: "tasks", sentence: "Done." }); return { status: "ok" }; };
    registerIpc(deps);
    const history = [{ id: "1", status: "sent", notes: {}, blocks: [] }];
    deps.store.write("history", history);
    const r = await call("ai:generate", { notes: { work: "x" }, template: "t", profile: {}, date: "2026-10-14", dateFormat: "long", history: [{ evil: true }] });
    expect(r.ok).toBe(true);
    expect(seen.history).toEqual(history);
    expect(sent).toContainEqual(["ai:progress", { section: "tasks", sentence: "Done." }]);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/main/ipc.test.js`
Expected: FAIL (`seen.history` is undefined).

- [ ] **Step 3: Implement**

In `src/main/ipc.js` replace the `ai:generate` handler with:

```js
  h("ai:generate", ({ notes, template, profile, date, dateFormat, mode = "auto" }) => {
    if (!MODES.includes(mode)) throw new Error("Unknown mode.");
    // History is read here, never taken from the renderer, for the same reason as the AI settings.
    return generator.generate({ notes, template, profile, date, dateFormat, mode, ai: ai(), history: store.read("history"), onProgress: p => send("ai:progress", p) });
  });
```

In `src/preload/index.js`, add after `generate: p => call("ai:generate", p),`:

```js
  onGenerateProgress: on("ai:progress"),
```

In `src/main/index.js`, add directly after the `registerIpc(...)` line (line 47):

```js
    // Load the local model now so the first report does not wait for it. Best effort.
    generator.warmUp(store.read("settings").ai.local);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/unit/main/ipc.test.js`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc.js src/preload/index.js src/main/index.js tests/unit/main/ipc.test.js
git commit -m "feat: pass history to the generator, forward progress, warm up at start" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Live sentences and a note in the UI

**Files:**
- Modify: `src/renderer/src/useApp.js` (initial state, boot effect, `run`)
- Modify: `src/renderer/src/screens/NewDigest.jsx` (`LiveSentences`, `AiSourceBanner`, generating stage, banner condition)
- Modify: `tests/unit/renderer/ai-ui.test.jsx`

**Interfaces:**
- Consumes: `window.api.onGenerateProgress(cb)` (Task 8) where `cb({ section, sentence })`. It may be missing in test mocks, so the call is optional.
- Produces: `genLines: string[]` in `useApp` state; `LiveSentences({ lines })` exported from `NewDigest.jsx`; `AiSourceBanner` shows an info banner when `aiSource === "local"` and `aiNote` is set.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/renderer/ai-ui.test.jsx` change the import on line 6 to
`import { AiSourceBanner, LiveSentences } from "../../../src/renderer/src/screens/NewDigest.jsx";`
and add at the end of the file:

```jsx
describe("AiSourceBanner for a mostly-local digest", () => {
  it("explains which sentences used the built-in rules", () => {
    render(<AiSourceBanner s={{ aiSource: "local", aiNote: "1 of 2 sentences use the built-in rules because the local AI left them out." }} />);
    expect(screen.getByText("Some sentences use the built-in rules.")).toBeTruthy();
    expect(screen.getByText(/1 of 2 sentences/)).toBeTruthy();
  });
});

describe("LiveSentences", () => {
  it("lists the sentences written so far", () => {
    render(<LiveSentences lines={["Fixed the login page.", "Wrote the unit tests."]} />);
    expect(screen.getAllByRole("listitem").map(li => li.textContent)).toEqual(["Fixed the login page.", "Wrote the unit tests."]);
  });
  it("shows nothing before the first sentence", () => {
    const { container } = render(<LiveSentences lines={[]} />);
    expect(container.textContent).toBe("");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/renderer/ai-ui.test.jsx`
Expected: FAIL (`LiveSentences` is not exported; the banner renders nothing).

- [ ] **Step 3: Implement the screen**

In `src/renderer/src/screens/NewDigest.jsx`:

Add this component directly above `export function AiSourceBanner`:

```jsx
export function LiveSentences({lines}){
  if(!lines||!lines.length)return null;
  return <ul aria-label="Sentences written so far" style={{margin:"20px 0 0",padding:0,listStyle:"none",display:"flex",flexDirection:"column",gap:8,font:"var(--text-meta)",color:"var(--fg-2)"}}>{lines.map((t,i)=><li key={i}>{t}</li>)}</ul>;
}
```

In `AiSourceBanner`, add before the final `return null;`:

```jsx
  if(s.aiSource==="local"&&s.aiNote)return <Banner tone="info" title="Some sentences use the built-in rules.">{s.aiNote}</Banner>;
```

In `NewDigestScreen`, change the generating line (line 97) to:

```jsx
          {stage==="generating"&&<div style={{padding:"48px 8px"}}><Steps title="Generating report…" steps={["Reading your notes","Applying the template","Preparing the report"]} step={s.genStep}/><LiveSentences lines={s.genLines}/></div>}
```

and change the banner condition (line 99) from `showDoc&&s.aiSource&&s.aiSource!=="local"&&` to `showDoc&&s.aiSource&&(s.aiSource!=="local"||s.aiNote)&&`.

- [ ] **Step 4: Implement the state**

In `src/renderer/src/useApp.js`:

- In `initial()` add `genLines: []` to the last line of the object: change `aiSource: null, aiNote: null, cloudAsk: null, audit: [], localStatus: null, checkingLocal: false` to `aiSource: null, aiNote: null, cloudAsk: null, audit: [], localStatus: null, checkingLocal: false, genLines: []`.
- In the boot effect change `let off = () => {}, offStep = () => {};` to `let off = () => {}, offStep = () => {}, offProgress = () => {};`, add after `offStep = api().zimbra.onStep(...)`:

```js
    offProgress = api().onGenerateProgress?.(p => up(prev => prev.stage === "generating" ? { genLines: [...prev.genLines, p.sentence] } : {})) || (() => {});
```

  and change the cleanup to `return () => { off(); offStep(); offProgress(); clear(); };`.
- In `run`, change the `up({ page: "new", stage: "generating", ...})` line to include `genLines: []`: `up({ page: "new", stage: "generating", genStep: 0, modal: null, genError: null, cloudAsk: null, genLines: [] });`
- In `resetDigest`'s `up(p => ({ ... }))` object add `genLines: []` (after `cloudAsk: null`).

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/unit/renderer/ai-ui.test.jsx`
Expected: PASS (existing plus 3 new).

- [ ] **Step 6: Run the whole suite and a build**

Run: `npx vitest run`
Expected: all pass.
Run: `npm run build`
Expected: the build finishes without errors.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/useApp.js src/renderer/src/screens/NewDigest.jsx tests/unit/renderer/ai-ui.test.jsx
git commit -m "feat: show sentences as they are written and explain built-in fallbacks" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Benchmark, tune, and document

**Files:**
- Modify: `scripts/try-local.mjs`
- Modify: `README.md` (the local-AI paragraph around line 130, plus a requirement note)
- Modify: `docs/local-ai-benchmark.md`
- Possibly modify: `src/main/check.js` (`TECH_TERMS`), `src/main/reply.js` (`LOCAL_PROMPT` wording)

**Interfaces:**
- Consumes: `createGenerator(...).generate({ ..., history, onProgress })` (Task 7).
- Produces: `scripts/try-local.mjs` prints first-sentence time, total time, source and the note. Optional env var `TRY_HISTORY` = path to a history JSON file (the app's `history.json`, which the store writes to `<userData>/history.json`).

- [ ] **Step 1: Update the script**

Replace `scripts/try-local.mjs` with:

```js
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
```

- [ ] **Step 2: Measure after**

Run twice (cold, then warm):
Run: `node scripts/try-local.mjs`
Run: `node scripts/try-local.mjs`
Expected: `source: local`, a first-sentence time, a total time, and the report. Also run once with the user's real history if available:
Run: `$env:TRY_HISTORY = "$env:APPDATA\<app folder>\history.json"; node scripts/try-local.mjs` (find the actual folder name by looking under `%APPDATA%` for one containing `history.json`; skip this run if there is none).

- [ ] **Step 3: Tune only if the success criteria are missed**

Success criteria: warm total under 60 s, and at most 1 in 10 items using the built-in rule (the `note` line says how many). If the note reports more:
- Read which sentences were rejected (run the script, compare against `blocksToText` output). If a legitimate capitalised term was rejected, add it to `TECH_TERMS` in `src/main/check.js` and add one assertion for it to `tests/unit/main/check.test.js` (RED first, then GREEN).
- If the model keeps adding digits or names, tighten one rule line in `LOCAL_PROMPT`, then re-run `npx vitest run tests/unit/main/reply.test.js`.
If total time is over 60 s, lower the example count by passing a smaller `limit` default in `pickExamples` (for example 4) and re-measure. Record what you changed in the benchmark file.

- [ ] **Step 4: Record results**

Append to `docs/local-ai-benchmark.md` rows for the "after" runs (cold, warm, and with real history if run), filling in total time, first-sentence time, and the number of items that used the built-in rule. Under the table add one line stating whether both success criteria were met, and any tuning done in Step 3.

- [ ] **Step 5: Update the README**

In `README.md`, replace the sentence at line 130 ("The local model gets your notes with instructions ... it is asked once more.") with:

```markdown
- The local model gets your notes with a short set of rules and a few examples of how you usually write (taken from reports you have already sent, topped up with built-in examples). It must return exactly one sentence per item. Any sentence that adds a number, name or tool your item did not mention is replaced by the built-in rule for that item, and the report says how many were replaced. Sentences appear on screen as they are written. This needs a recent Ollama (structured output); if the app says the server rejected the request, update Ollama.
```

- [ ] **Step 6: Run everything**

Run: `npx vitest run`
Expected: all pass.
Run: `npm run build`
Expected: builds without errors.

- [ ] **Step 7: Commit**

```bash
git add scripts/try-local.mjs README.md docs/local-ai-benchmark.md src
git commit -m "docs: benchmark the smarter local AI and describe how it works" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
