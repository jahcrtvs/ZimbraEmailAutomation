# Local AI with Cloud Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a local Ollama model the default writer of the digest sentences, with Groq or Gemini kept only as one consented, sanitised fallback.

**Architecture:** A new `localai.js` talks to Ollama's OpenAI-compatible endpoint. `generate.js` becomes an orchestrator: local first, then (if configured and allowed) a sanitised cloud call, then the built-in text rules. Sanitising and restore live in a pure shared module. The main process reads AI settings itself, so the renderer cannot change what is sent. The UI gets a status check, a consent dialog and a source banner.

**Tech Stack:** Electron main + React renderer, Vitest, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-local-ai-with-cloud-fallback-design.md`

## Global Constraints

- Windows 11, Node 22, PowerShell. The Bash tool is unreliable here; use PowerShell for every command in this plan.
- ESM source with `.js` import extensions. Renderer test files start with `// @vitest-environment jsdom`.
- Match the surrounding style: compact code, double quotes, semicolons, 2-space indent, no new comments unless the reason is non-obvious.
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (use a second `-m`).
- The app never presses Send in Zimbra. Nothing in this plan touches `src/main/zimbra*.js`.
- API keys stay in the main process (`safeStorage`) and are write-only from the renderer. Never write a key into a file, test or reply. Test keys are obvious fakes such as `"KEY"`.
- Tests use fakes only: no real Ollama, Groq, Gemini, Chrome or Zimbra. Every `fetchImpl` in a test is a fake.
- No new runtime or dev dependencies.
- Default local settings: base URL `http://localhost:11434/v1`, model `qwen2.5:3b-instruct`. Local timeout 120000 ms. Status check timeout 5000 ms.
- Sanitising limits: 8000 characters of notes; placeholders `[EMAIL_n] [URL_n] [IP_n] [PHONE_n] [TOKEN_n] [NAME_n]`.
- Cloud retry waits stay `[1000, 3000]` ms for 429, 500, 503 and network errors (cloud only).
- Do not touch the unfinished Zimbra selector work described in `HANDOFF.md`.

## Review Focus

The spec implies these inputs, which a user is likely to hit. Each has a test in the task that owns the code.

1. A small model wraps its JSON in prose or a code fence ("Here you go: {...}"). Must still parse. (Task 2)
2. The model changes a placeholder's case (`[email_1]`), drops one, or invents one. Restore must not crash or corrupt. (Tasks 1 and 4)
3. Notes contain dates, times and versions (`2026-10-09 10:30`, `3.2.1`). Sanitising must not mangle them. (Task 1)
4. An existing install has the old settings file (`ai: {provider, model}`). It must migrate without losing the Gemini choice. (Task 3)
5. Base URL typed with a trailing slash, pointing at another machine, or a model named `...-cloud` / `...:cloud`. Must work or warn, never silently send raw notes off the computer. (Tasks 1, 2 and 7)

## File Structure

| File | Responsibility |
|---|---|
| `src/shared/ai.js` (new) | defaults, provider names, `-cloud` and loopback checks, pull command |
| `src/shared/sanitize.js` (new) | secret blocking, placeholder substitution, restore (pure) |
| `src/main/reply.js` (new) | the prompt, notes text, tolerant JSON reply parser |
| `src/main/localai.js` (new) | Ollama chat call with failure codes, status check |
| `src/main/audit.js` (new) | append-only cloud send log in the store |
| `src/main/store.js` | new `settings.ai` shape, migration, `audit` collection |
| `src/main/generate.js` | orchestration: local, consent, cloud, plain template |
| `src/main/ipc.js`, `src/preload/index.js`, `src/main/index.js` | wiring |
| `src/renderer/src/useApp.js` | generate modes, consent state, local status |
| `src/renderer/src/screens/dialogs.jsx`, `NewDigest.jsx`, `Settings.jsx`, `App.jsx` | UI |
| `scripts/try-local.mjs` (new) | manual model comparison on real notes |
| `README.md`, `docs/verification-checklist.md`, `.gitignore` | docs |

---

### Task 1: Shared helpers and the sanitiser

**Files:**
- Create: `src/shared/ai.js`, `src/shared/sanitize.js`
- Test: `tests/unit/shared/ai.test.js`, `tests/unit/shared/sanitize.test.js`

**Interfaces:**
- Produces from `ai.js`: `DEFAULT_LOCAL = { baseUrl, model }`, `CLOUD_PROVIDERS = ["groq","gemini"]`, `PROVIDER_NAMES = { groq: "Groq", gemini: "Gemini" }`, `isCloudModel(name) -> boolean`, `isLoopbackUrl(url) -> boolean`, `pullCommand(model) -> string`.
- Produces from `sanitize.js`: `NOTE_KEYS`, `MAX_CLOUD_CHARS = 8000`, `sanitizeNotes(notes, { terms }) -> { blocked: string } | { blocked: null, notes, map }` where `map` is `[{ placeholder, original }]`, and `restore(text, map) -> string`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/shared/ai.test.js`:

```js
import { describe, it, expect } from "vitest";
import { DEFAULT_LOCAL, isCloudModel, isLoopbackUrl, pullCommand } from "../../../src/shared/ai.js";

describe("ai helpers", () => {
  it("defaults to Ollama and a small instruct model", () => {
    expect(DEFAULT_LOCAL).toEqual({ baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" });
  });
  it("flags Ollama cloud models written either way", () => {
    expect(isCloudModel("gpt-oss:120b-cloud")).toBe(true);
    expect(isCloudModel(" glm-5.3-flash:cloud ")).toBe(true);
    expect(isCloudModel("qwen2.5:3b-instruct")).toBe(false);
    expect(isCloudModel("")).toBe(false);
  });
  it("recognises loopback addresses only", () => {
    for (const u of ["http://localhost:11434/v1", "http://127.0.0.1:11434", "http://[::1]:11434/v1"]) expect(isLoopbackUrl(u)).toBe(true);
    for (const u of ["http://192.168.1.5:11434/v1", "http://localhost.evil.example", "https://api.example.com", "not a url", ""]) expect(isLoopbackUrl(u)).toBe(false);
  });
  it("builds the pull command", () => {
    expect(pullCommand(" qwen2.5:3b-instruct ")).toBe("ollama pull qwen2.5:3b-instruct");
  });
});
```

`tests/unit/shared/sanitize.test.js`:

```js
import { describe, it, expect } from "vitest";
import { sanitizeNotes, restore, MAX_CLOUD_CHARS } from "../../../src/shared/sanitize.js";
import { SAMPLE_NOTES } from "../../../src/shared/report.js";

const notes = over => ({ work: "", topics: "", progress: "", blockers: "", tomorrow: "", ...over });

describe("sanitizeNotes", () => {
  it("replaces emails, links, IPs, phones and tokens, and restores them", () => {
    const token = "a1".repeat(20);
    const n = notes({ work: "emailed boss@corp.example about https://git.corp.example/repo/pull/4\nserver 10.1.2.3 down\ncalled 0917 123 4567", blockers: "key id " + token });
    const r = sanitizeNotes(n);
    expect(r.blocked).toBeNull();
    const all = Object.values(r.notes).join("\n");
    for (const raw of ["boss@corp.example", "git.corp.example", "10.1.2.3", "0917 123 4567", token]) expect(all).not.toContain(raw);
    for (const ph of ["[EMAIL_1]", "[URL_1]", "[IP_1]", "[PHONE_1]", "[TOKEN_1]"]) expect(all).toContain(ph);
    expect(restore(r.notes.work, r.map)).toBe(n.work);
    expect(restore(r.notes.blockers, r.map)).toBe(n.blockers);
  });
  it("gives the same text the same placeholder and different text a new one", () => {
    const r = sanitizeNotes(notes({ work: "boss@corp.example, boss@corp.example and other@corp.example" }));
    expect(r.notes.work).toBe("[EMAIL_1], [EMAIL_1] and [EMAIL_2]");
  });
  it("leaves dates, times and versions alone", () => {
    const n = notes({ work: "deployed on 2026-10-09 10:30 with Spring Boot 3.2.1 and Java 21" });
    expect(sanitizeNotes(n).notes.work).toBe(n.work);
  });
  it("leaves ordinary notes unchanged", () => {
    const r = sanitizeNotes(SAMPLE_NOTES);
    expect(r.blocked).toBeNull();
    expect(r.notes).toEqual(SAMPLE_NOTES);
    expect(r.map).toEqual([]);
  });
  it("hides the given words as whole words, ignoring case", () => {
    const r = sanitizeNotes(notes({ work: "Mark asked cruz to bookmark the page" }), { terms: ["Mark Justine Dela Cruz", "Mark", "Cruz", "ab"] });
    expect(r.notes.work).toBe("[NAME_1] asked [NAME_2] to bookmark the page");
    expect(restore(r.notes.work, r.map)).toBe("Mark asked cruz to bookmark the page");
  });
  it("blocks anything that looks like a secret", () => {
    const fakes = ["gsk_" + "a".repeat(30), "AIza" + "B".repeat(35), "sk-" + "c".repeat(24), "ghp_" + "d".repeat(30), "AKIA" + "E".repeat(16),
      "-----BEGIN RSA PRIVATE KEY-----", "Bearer " + "f".repeat(30), "password: hunter2", "api_key=abc123", "postgres://admin:hunter2@db.local/app"];
    for (const s of fakes) {
      const r = sanitizeNotes(notes({ work: "tried " + s + " today" }));
      expect(r.blocked, s).toMatch(/will not be sent/);
      expect(r.notes).toBeUndefined();
    }
  });
  it("does not treat the word password on its own as a secret", () => {
    expect(sanitizeNotes(notes({ work: "fixed the password reset flow" })).blocked).toBeNull();
  });
  it("blocks notes over the length cap and allows exactly the cap", () => {
    expect(MAX_CLOUD_CHARS).toBe(8000);
    expect(sanitizeNotes(notes({ work: "x".repeat(8000) })).blocked).toBeNull();
    expect(sanitizeNotes(notes({ work: "x".repeat(8001) })).blocked).toMatch(/longer than 8000/);
  });
});

describe("restore", () => {
  const map = [{ placeholder: "[EMAIL_1]", original: "boss@corp.example" }];
  it("matches placeholders case-insensitively and leaves unknown ones alone", () => {
    expect(restore("Emailed [email_1] and [EMAIL_9].", map)).toBe("Emailed boss@corp.example and [EMAIL_9].");
  });
  it("inserts originals literally, including $ sequences", () => {
    expect(restore("x [NAME_1] y", [{ placeholder: "[NAME_1]", original: "a$&b" }])).toBe("x a$&b y");
  });
  it("does nothing when a placeholder is missing from the text", () => {
    expect(restore("Nothing to restore.", map)).toBe("Nothing to restore.");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run tests/unit/shared/ai.test.js tests/unit/shared/sanitize.test.js`
Expected: FAIL, "Failed to resolve import" for both source files.

- [ ] **Step 3: Write `src/shared/ai.js`**

```js
export const DEFAULT_LOCAL = { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" };
export const CLOUD_PROVIDERS = ["groq", "gemini"];
export const PROVIDER_NAMES = { groq: "Groq", gemini: "Gemini" };

// Ollama's hosted models are named "...-cloud" or "...:cloud" and run on Ollama's servers.
export const isCloudModel = name => /[-:]cloud$/i.test(String(name || "").trim());

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
export function isLoopbackUrl(u) {
  try { return LOOPBACK.has(new URL(u).hostname.toLowerCase()); } catch { return false; }
}

export const pullCommand = model => `ollama pull ${String(model || "").trim()}`;
```

- [ ] **Step 4: Write `src/shared/sanitize.js`**

```js
export const NOTE_KEYS = ["work", "topics", "progress", "blockers", "tomorrow"];
export const MAX_CLOUD_CHARS = 8000;

const SECRETS = [
  [/\bgsk_[A-Za-z0-9]{20,}/, "a Groq API key"],
  [/\bAIza[0-9A-Za-z_-]{30,}/, "a Google API key"],
  [/\bsk-[A-Za-z0-9_-]{20,}/, "an API key"],
  [/\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/, "a GitHub token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{20,}/i, "a bearer token"],
  [/\b(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*\S+/i, "a password or secret"],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i, "a connection string with credentials"]
];

const RULES = [
  ["EMAIL", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["URL", /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi],
  ["IP", /\b\d{1,3}(?:\.\d{1,3}){3}\b/g],
  ["PHONE", /\+?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?\b|\b\d{9,}\b/g],
  ["TOKEN", /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}\b/g]
];

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function findSecret(text) {
  for (const [re, label] of SECRETS) if (re.test(text)) return label;
  return null;
}

export function sanitizeNotes(notes, { terms = [] } = {}) {
  const total = NOTE_KEYS.reduce((n, k) => n + String(notes?.[k] || "").length, 0);
  if (total > MAX_CLOUD_CHARS) return { blocked: `Your notes are longer than ${MAX_CLOUD_CHARS} characters, so they will not be sent to a cloud service.` };
  const secret = findSecret(NOTE_KEYS.map(k => notes?.[k] || "").join("\n"));
  if (secret) return { blocked: `Your notes appear to contain ${secret}, so they will not be sent to a cloud service.` };

  const map = [], byKey = new Map(), counts = {};
  const swap = (kind, original) => {
    const key = kind + "|" + original;
    if (!byKey.has(key)) {
      counts[kind] = (counts[kind] || 0) + 1;
      const placeholder = `[${kind}_${counts[kind]}]`;
      byKey.set(key, placeholder);
      map.push({ placeholder, original });
    }
    return byKey.get(key);
  };
  const termRes = [...new Set(terms.map(t => String(t).trim()).filter(t => t.length >= 3))]
    .sort((a, b) => b.length - a.length)
    .map(t => new RegExp(`(?<![A-Za-z0-9])${escapeRe(t)}(?![A-Za-z0-9])`, "gi"));

  const out = {};
  for (const k of NOTE_KEYS) {
    let text = String(notes?.[k] || "");
    for (const [kind, re] of RULES) text = text.replace(re, m => swap(kind, m));
    for (const re of termRes) text = text.replace(re, m => swap("NAME", m));
    out[k] = text;
  }
  return { blocked: null, notes: out, map };
}

export function restore(text, map) {
  let out = String(text);
  for (const m of map) out = out.replace(new RegExp(escapeRe(m.placeholder), "gi"), () => m.original);
  return out;
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run tests/unit/shared/ai.test.js tests/unit/shared/sanitize.test.js`
Expected: PASS (all tests in both files).

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS (nothing else changed).

- [ ] **Step 7: Commit**

```powershell
git add src/shared/ai.js src/shared/sanitize.js tests/unit/shared/ai.test.js tests/unit/shared/sanitize.test.js
git commit -m "feat: add AI helpers and cloud-bound note sanitiser" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Local model client (reply parser, Ollama call, status check)

**Files:**
- Create: `src/main/reply.js`, `src/main/localai.js`
- Test: `tests/unit/main/localai.test.js`

`reply.js` copies the prompt, notes text and parser out of `generate.js` (and makes the parser tolerant of prose around the JSON). `generate.js` keeps its own copies until Task 4 replaces it.

**Interfaces:**
- Consumes: `pullCommand` from `src/shared/ai.js`.
- Produces from `reply.js`: `PROMPT: string`, `notesText(notes) -> string`, `parseReply(text, name = "Gemini") -> { tasks, topics, weekly_plans, blockers }` (throws `Error` with message `"<name> returned an unexpected response: ..."`).
- Produces from `localai.js`: `runLocal({ fetchImpl = fetch, local, text }) -> Promise<{tasks,topics,weekly_plans,blockers}>`, rejecting with an `Error` that has `.code` in `UNREACHABLE | TIMEOUT | MODEL_MISSING | SERVER | BAD_REPLY`; `localStatus({ fetchImpl = fetch, local }) -> Promise<{ state: "ready"|"no-server"|"no-model", detail?: string, command?: string }>`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/main/localai.test.js`:

```js
import { describe, it, expect } from "vitest";
import { runLocal, localStatus } from "../../../src/main/localai.js";

const local = { baseUrl: "http://localhost:11434/v1/", model: "qwen2.5:3b-instruct" };
const res = (body, status = 200, statusText = "OK") => ({ ok: status < 400, status, statusText, text: async () => typeof body === "string" ? body : JSON.stringify(body) });
const chat = content => res({ choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] });
const good = { tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [] };
const seq = (...items) => {
  const calls = []; let i = 0;
  const f = async (url, init) => { calls.push({ url, init }); const x = items[Math.min(i++, items.length - 1)]; if (x instanceof Error) throw x; return x; };
  f.calls = calls; return f;
};

describe("runLocal", () => {
  it("posts to chat/completions without a key, asking for JSON, and trims the trailing slash", async () => {
    const f = seq(chat(good));
    const out = await runLocal({ fetchImpl: f, local, text: "PROMPT" });
    expect(out.tasks).toEqual(["Did A."]);
    const { url, init } = f.calls[0];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(Object.keys(init.headers).map(k => k.toLowerCase())).not.toContain("authorization");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("qwen2.5:3b-instruct");
    expect(body.temperature).toBe(0.2);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([{ role: "user", content: "PROMPT" }]);
  });
  it("accepts JSON in a code fence or surrounded by prose", async () => {
    const fenced = await runLocal({ fetchImpl: seq(chat('```json\n{"tasks":["X."],"topics":[],"weekly_plans":[],"blockers":[]}\n```')), local, text: "t" });
    expect(fenced.tasks).toEqual(["X."]);
    const prose = await runLocal({ fetchImpl: seq(chat('Here you go: {"tasks":["Y."],"topics":[],"weekly_plans":[],"blockers":[]} Hope that helps!')), local, text: "t" });
    expect(prose.tasks).toEqual(["Y."]);
  });
  it("asks once more when the reply is not usable, then succeeds", async () => {
    const f = seq(chat("nope"), chat(good));
    expect((await runLocal({ fetchImpl: f, local, text: "t" })).tasks).toEqual(["Did A."]);
    expect(f.calls).toHaveLength(2);
  });
  it("fails with BAD_REPLY after two unusable replies, including an empty result", async () => {
    for (const bad of ["not json", { tasks: [], topics: [], weekly_plans: [], blockers: [] }, { tasks: "text" }]) {
      const f = seq(chat(bad));
      await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "BAD_REPLY" });
      expect(f.calls).toHaveLength(2);
    }
  });
  it("classifies an unreachable server", async () => {
    const f = seq(new TypeError("fetch failed"));
    await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "UNREACHABLE", message: expect.stringContaining("http://localhost:11434/v1/") });
    expect(f.calls).toHaveLength(1);
  });
  it("classifies a timeout", async () => {
    const e = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    await expect(runLocal({ fetchImpl: seq(e), local, text: "t" })).rejects.toMatchObject({ code: "TIMEOUT" });
  });
  it("classifies a missing model and tells the user how to install it", async () => {
    const f = seq(res('model "qwen2.5:3b-instruct" not found, try pulling it first', 404, "Not Found"));
    await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "MODEL_MISSING", message: expect.stringContaining("ollama pull qwen2.5:3b-instruct") });
  });
  it("classifies other HTTP errors as SERVER without retrying", async () => {
    const f = seq(res("boom", 500, "Internal Server Error"));
    await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "SERVER", message: expect.stringContaining("500") });
    expect(f.calls).toHaveLength(1);
  });
});

describe("localStatus", () => {
  it("is ready when the model is listed, and asks /models", async () => {
    const f = seq(res({ data: [{ id: "qwen2.5:3b-instruct" }] }));
    expect(await localStatus({ fetchImpl: f, local })).toEqual({ state: "ready" });
    expect(f.calls[0].url).toBe("http://localhost:11434/v1/models");
  });
  it("matches an untagged model name to its :latest install", async () => {
    const f = seq(res({ data: [{ id: "llama3:latest" }] }));
    expect(await localStatus({ fetchImpl: f, local: { ...local, model: "llama3" } })).toEqual({ state: "ready" });
  });
  it("reports a missing model with the install command", async () => {
    const r = await localStatus({ fetchImpl: seq(res({ data: [{ id: "other:1b" }] })), local });
    expect(r.state).toBe("no-model");
    expect(r.command).toBe("ollama pull qwen2.5:3b-instruct");
  });
  it("reports a server that is not running", async () => {
    const r = await localStatus({ fetchImpl: seq(new TypeError("fetch failed")), local });
    expect(r.state).toBe("no-server");
    expect(r.detail).toContain("Install Ollama");
  });
  it("reports a server that answers with an error", async () => {
    const r = await localStatus({ fetchImpl: seq(res("x", 500, "Internal Server Error")), local });
    expect(r.state).toBe("no-server");
    expect(r.detail).toContain("500");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run tests/unit/main/localai.test.js`
Expected: FAIL, "Failed to resolve import ../../../src/main/localai.js".

- [ ] **Step 3: Write `src/main/reply.js`**

The prompt text is copied verbatim from `generate.js` lines 10-27. `parseReply` is the existing function plus the brace-extraction fallback.

```js
export const PROMPT = `You turn a trainee developer's rough daily notes (often just a few keywords) into the bullets of a formal status email to their manager.
Write in a professional, formal tone, the way a conscientious employee writes a report to a supervisor.
Rules:
- Expand each note, even a single keyword, into one complete, well-formed sentence of about 12 to 25 words, ending with a period. Start with the verb.
- Work done: past tense ("Completed ...", "Worked on ...", "Resolved ..."). Study topics: "Studied ..." or "Reviewed ...". Plans: future intent in the imperative ("Continue ...", "Complete ...", "Practice ...").
- Use the context the keyword clearly implies to make the sentence read naturally, for example the general purpose of a lesson or what a task is part of (e.g. "lesson in hibernate" -> "Studied the Hibernate lesson, covering how Java objects are mapped to database tables using ORM.").
- Fix grammar, spelling and capitalisation of technical names (Hibernate, Spring, Spring Boot, HQL, API, SQL, JDBC, ID, ORM, Java).
- Never invent specific facts: no numbers, results, test outcomes, bug causes, deadlines, people or tools that the notes do not mention or clearly imply. Keep the writer's meaning. Never merge unrelated items. Skip empty input.
- Keep any text in square brackets, such as [EMAIL_1] or [NAME_2], exactly as written.
- Keep it professional, not inflated: no "successfully", "comprehensive", "robust", "leveraged", "delved", "seamlessly", no em dashes, no exclamation marks, no marketing tone.
Return ONLY JSON with exactly these keys, each an array of strings:
{"tasks":[],"topics":[],"weekly_plans":[],"blockers":[]}
- tasks: from "Today's Work" plus anything under "Still Working On" (phrase those as "Still working on: ...", or "Investigating ..." / "Continued ...").
- topics: from "Topics / Lessons".
- weekly_plans: from "Tomorrow".
- blockers: from "Blockers".

Notes:
`;

const labels = { work: "Today's Work", topics: "Topics / Lessons", progress: "Still Working On", blockers: "Blockers", tomorrow: "Tomorrow" };
export const notesText = n => Object.keys(labels).map(k => `${labels[k]}:\n${(n[k] || "").trim() || "(none)"}`).join("\n\n");

export function parseReply(text, name = "Gemini") {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let obj;
  try { obj = JSON.parse(cleaned); }
  catch {
    const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
    try { obj = JSON.parse(a >= 0 && b > a ? cleaned.slice(a, b + 1) : ""); }
    catch { throw new Error(`${name} returned an unexpected response: not valid JSON`); }
  }
  const out = {};
  for (const k of ["tasks", "topics", "weekly_plans", "blockers"]) {
    const v = obj?.[k] ?? [];
    if (!Array.isArray(v) || v.some(x => typeof x !== "string")) throw new Error(`${name} returned an unexpected response: "${k}" must be a list of text`);
    out[k] = v.map(x => x.trim()).filter(Boolean);
  }
  if (!Object.values(out).some(a => a.length)) throw new Error(`${name} returned an unexpected response: no items`);
  return out;
}
```

The one new prompt line ("Keep any text in square brackets...") tells the model to leave placeholders alone; it is harmless on the local path.

- [ ] **Step 4: Write `src/main/localai.js`**

```js
import { pullCommand } from "../shared/ai.js";
import { parseReply } from "./reply.js";

export const LOCAL_TIMEOUT_MS = 120000;
const STATUS_TIMEOUT_MS = 5000;

const fail = (code, message) => Object.assign(new Error(message), { code });
const base = u => String(u || "").trim().replace(/\/+$/, "");

async function attempt(fetchImpl, local, text) {
  let res;
  try {
    res = await fetchImpl(base(local.baseUrl) + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: local.model, messages: [{ role: "user", content: text }], temperature: 0.2, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS)
    });
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") throw fail("TIMEOUT", "The local model took too long to answer.");
    throw fail("UNREACHABLE", `Could not reach the local AI server at ${local.baseUrl}.`);
  }
  const raw = await res.text();
  if (!res.ok) {
    if (res.status === 404 && /not found|pull/i.test(raw)) throw fail("MODEL_MISSING", `The model "${local.model}" is not installed. Run: ${pullCommand(local.model)}`);
    throw fail("SERVER", `The local AI server answered ${res.status} ${res.statusText}.`);
  }
  let body;
  try { body = JSON.parse(raw); } catch { throw fail("BAD_REPLY", "The local AI server sent something that is not JSON."); }
  const reply = body?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") throw fail("BAD_REPLY", "The local model returned an empty reply.");
  return reply;
}

export async function runLocal({ fetchImpl = fetch, local, text }) {
  for (let i = 0; i < 2; i++) {
    const reply = await attempt(fetchImpl, local, text);
    try { return parseReply(reply, "The local model"); } catch { /* ask once more */ }
  }
  throw fail("BAD_REPLY", "The local model did not return a usable reply.");
}

export async function localStatus({ fetchImpl = fetch, local }) {
  let res;
  try { res = await fetchImpl(base(local.baseUrl) + "/models", { signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) }); }
  catch { return { state: "no-server", detail: `Nothing is answering at ${local.baseUrl}. Install Ollama from https://ollama.com/download and make sure it is running.` }; }
  if (!res.ok) return { state: "no-server", detail: `The server at ${local.baseUrl} answered ${res.status}. Check the address in Settings.` };
  let ids = [];
  try { ids = (JSON.parse(await res.text()).data || []).map(m => m.id); } catch { /* treated as no models */ }
  const want = String(local.model || "").trim();
  if (ids.some(id => id === want || (!want.includes(":") && id === want + ":latest"))) return { state: "ready" };
  return { state: "no-model", detail: `The model "${want}" is not installed.`, command: pullCommand(want) };
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run tests/unit/main/localai.test.js`
Expected: PASS (all tests).

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/main/reply.js src/main/localai.js tests/unit/main/localai.test.js
git commit -m "feat: add Ollama client with failure codes and status check" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Settings shape, migration and audit log

**Files:**
- Modify: `src/main/store.js`
- Create: `src/main/audit.js`
- Modify: `tests/unit/main/ipc.test.js:29`
- Test: `tests/unit/main/store.ai.test.js`, `tests/unit/main/audit.test.js`

**Interfaces:**
- Consumes: `DEFAULT_LOCAL` from `src/shared/ai.js`.
- Produces: `DEFAULTS().settings.ai = { local: {baseUrl, model}, fallback: {provider: "groq", auto: false}, geminiModel: "flash", privacyTerms: "" }`; `DEFAULTS().audit = []`; `createAudit(store, now = () => new Date()) -> { record({provider, reason, chars}) }`; `AUDIT_LIMIT = 200`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/main/store.ai.test.js`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore, DEFAULTS } from "../../../src/main/store.js";

let dir, store;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-storeai-")); store = createStore(dir); });
const writeSettings = obj => fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify(obj));

describe("settings.ai", () => {
  it("defaults to a local Ollama model with an ask-first Groq fallback", () => {
    expect(DEFAULTS().settings.ai).toEqual({
      local: { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" },
      fallback: { provider: "groq", auto: false },
      geminiModel: "flash",
      privacyTerms: ""
    });
    expect(store.read("audit")).toEqual([]);
  });
  it("migrates an old Gemini setup: Gemini becomes the ask-first fallback and the model is kept", () => {
    writeSettings({ ai: { provider: "gemini", model: "pro" }, profile: { name: "Sam", role: "Dev" } });
    const ai = store.read("settings").ai;
    expect(ai.fallback).toEqual({ provider: "gemini", auto: false });
    expect(ai.geminiModel).toBe("pro");
    expect(ai.local.model).toBe("qwen2.5:3b-instruct");
    expect(Object.keys(ai).sort()).toEqual(["fallback", "geminiModel", "local", "privacyTerms"]);
    expect(store.read("settings").profile.name).toBe("Sam");
  });
  it("migrates an old Groq setup", () => {
    writeSettings({ ai: { provider: "groq", model: "flash" } });
    expect(store.read("settings").ai.fallback.provider).toBe("groq");
  });
  it("does not touch settings that already have the new shape", () => {
    writeSettings({ ai: { local: { baseUrl: "http://localhost:1234/v1", model: "m" }, fallback: { provider: "none", auto: true }, geminiModel: "pro", privacyTerms: "Acme" } });
    const ai = store.read("settings").ai;
    expect(ai.local).toEqual({ baseUrl: "http://localhost:1234/v1", model: "m" });
    expect(ai.fallback).toEqual({ provider: "none", auto: true });
    expect(ai.privacyTerms).toBe("Acme");
  });
  it("ignores junk values in the ai section", () => {
    writeSettings({ ai: { local: "oops", fallback: 5 } });
    expect(store.read("settings").ai).toEqual(DEFAULTS().settings.ai);
  });
});
```

`tests/unit/main/audit.test.js`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { createAudit, AUDIT_LIMIT } from "../../../src/main/audit.js";

let store;
beforeEach(() => { store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-audit-"))); });

describe("audit", () => {
  it("records time, provider, reason and size, and nothing else", () => {
    const audit = createAudit(store, () => new Date("2026-10-13T01:02:03.000Z"));
    audit.record({ provider: "groq", reason: "UNREACHABLE", chars: 120, text: "SECRET NOTES" });
    expect(store.read("audit")).toEqual([{ at: "2026-10-13T01:02:03.000Z", provider: "groq", reason: "UNREACHABLE", chars: 120 }]);
    expect(JSON.stringify(store.read("audit"))).not.toContain("SECRET");
  });
  it("keeps only the most recent entries", () => {
    const audit = createAudit(store);
    for (let i = 0; i < AUDIT_LIMIT + 5; i++) audit.record({ provider: "groq", reason: "r" + i, chars: i });
    const list = store.read("audit");
    expect(list).toHaveLength(AUDIT_LIMIT);
    expect(list[list.length - 1].reason).toBe("r" + (AUDIT_LIMIT + 4));
    expect(list[0].reason).toBe("r5");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run tests/unit/main/store.ai.test.js tests/unit/main/audit.test.js`
Expected: FAIL (defaults differ; `audit.js` missing).

- [ ] **Step 3: Update `src/main/store.js`**

Add the import below the existing `report.js` import (line 3):

```js
import { DEFAULT_LOCAL } from "../shared/ai.js";
```

Replace the `history: [],` line and the `ai:` line in `DEFAULTS`. The first edit adds `audit` after `schedule`:

old:
```js
  history: [],
  schedule: [],
```
new:
```js
  history: [],
  schedule: [],
  audit: [],
```

old:
```js
    ai: { provider: "gemini", model: "flash" },
```
new:
```js
    ai: { local: { ...DEFAULT_LOCAL }, fallback: { provider: "groq", auto: false }, geminiModel: "flash", privacyTerms: "" },
```

Add the migration function after `merge` (after line 28) and use it in `read`:

```js
// Settings written before local AI existed had ai: { provider, model }.
function migrateSettings(raw) {
  const ai = raw?.ai;
  if (!isObj(ai) || "local" in ai || "fallback" in ai) return raw;
  const next = { ...ai };
  if (["gemini", "groq"].includes(ai.provider)) next.fallback = { provider: ai.provider, auto: false };
  if (["flash", "pro"].includes(ai.model)) next.geminiModel = ai.model;
  return { ...raw, ai: next };
}
```

In `read`, replace:

old:
```js
    try { return merge(def, JSON.parse(raw)); }
```
new:
```js
    try { const parsed = JSON.parse(raw); return merge(def, name === "settings" ? migrateSettings(parsed) : parsed); }
```

- [ ] **Step 4: Write `src/main/audit.js`**

```js
export const AUDIT_LIMIT = 200;

export function createAudit(store, now = () => new Date()) {
  return {
    record({ provider, reason, chars }) {
      store.update("audit", list => [...list, { at: now().toISOString(), provider, reason, chars }].slice(-AUDIT_LIMIT));
    }
  };
}
```

- [ ] **Step 5: Fix the existing ipc test that lists the collections**

In `tests/unit/main/ipc.test.js` line 29, replace:

```js
    expect(Object.keys(r.value).sort()).toEqual(["draft", "hasKey", "history", "schedule", "settings", "template"]);
```
with:
```js
    expect(Object.keys(r.value).sort()).toEqual(["audit", "draft", "hasKey", "history", "schedule", "settings", "template"]);
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npx vitest run tests/unit/main/store.ai.test.js tests/unit/main/audit.test.js tests/unit/main/store.test.js tests/unit/main/ipc.test.js`
Expected: PASS.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS. (`settings.test.jsx` still passes: it sets `settings.ai.provider` on the object, which the unchanged Settings screen reads.)

- [ ] **Step 8: Commit**

```powershell
git add src/main/store.js src/main/audit.js tests/unit/main/store.ai.test.js tests/unit/main/audit.test.js tests/unit/main/ipc.test.js
git commit -m "feat: add local-AI settings shape, migration and cloud send log" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Generation orchestrator

**Files:**
- Modify (full replacement): `src/main/generate.js`
- Modify (full replacement): `tests/unit/main/generate.test.js`

**Interfaces:**
- Consumes: `runLocal`, `localStatus` (Task 2); `PROMPT`, `notesText`, `parseReply` (Task 2); `sanitizeNotes`, `restore` (Task 1); `PROVIDER_NAMES` (Task 1); `audit.record({provider, reason, chars})` (Task 3).
- Produces: `createGenerator({ getKey, fetchImpl = fetch, sleep, audit }) -> { generate, testConnection, localStatus }`.
  - `generate({ notes, template, profile, date, dateFormat, ai, mode = "auto" })` resolves to `{ status: "ok", source: "local"|"groq"|"gemini"|"template", note: string|null, blocks }` or `{ status: "needs-consent", provider, failure: {code, message}, preview: {text, chars} }`.
  - `testConnection(provider, geminiModel = "flash") -> Promise<true>`.
  - `localStatus(local) -> Promise<{state, detail?, command?}>`.
- Also exports `MODEL_IDS`, `GROQ_MODEL` (unchanged).

- [ ] **Step 1: Replace `tests/unit/main/generate.test.js`**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { createGenerator, GROQ_MODEL, MODEL_IDS } from "../../../src/main/generate.js";
import { DEFAULT_TEMPLATE, SAMPLE_NOTES } from "../../../src/shared/report.js";

const res = (body, status = 200, statusText = "OK") => ({ ok: status < 400, status, statusText, text: async () => typeof body === "string" ? body : JSON.stringify(body) });
const asText = c => typeof c === "string" ? c : JSON.stringify(c);
const chat = c => res({ choices: [{ message: { content: asText(c) } }] });
const geminiReply = c => res({ candidates: [{ content: { parts: [{ text: asText(c) }] } }] });
const good = { tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [] };
const down = () => new TypeError("fetch failed");

const aiSettings = (over = {}) => ({
  local: { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" },
  fallback: { provider: "groq", auto: false }, geminiModel: "flash", privacyTerms: "", ...over
});
const NOTES = { ...SAMPLE_NOTES, work: SAMPLE_NOTES.work + "\nemailed boss@corp.example about it\nasked Cruz for review" };
const payload = (over = {}) => ({ notes: NOTES, template: DEFAULT_TEMPLATE, profile: { name: "Mark Justine Dela Cruz", role: "CDP Trainee" }, date: "2026-10-08", dateFormat: "long", ai: aiSettings(), ...over });

let calls, entries;
beforeEach(() => { calls = []; entries = []; });
const audit = { record: e => entries.push(e) };
const route = ({ local = () => chat(good), groq = () => chat(good), gemini = () => geminiReply(good) } = {}) => async (url, init) => {
  calls.push({ url, init });
  const h = url.includes("localhost") ? local : url.includes("groq.com") ? groq : url.includes("googleapis") ? gemini : null;
  if (!h) throw new Error("unexpected url " + url);
  const x = h(url, init);
  if (x instanceof Error) throw x;
  return x;
};
const gen = (routes, keys = {}, extra = {}) => createGenerator({ getKey: p => keys[p] ?? null, fetchImpl: route(routes), sleep: async () => {}, audit, ...extra });
const hits = name => calls.filter(c => c.url.includes(name));
const taskItems = r => r.blocks.find(b => b.title === "TASK TODAY").items;

describe("local first", () => {
  it("uses the local model, never touches the cloud or asks for a key", async () => {
    const asked = [];
    const g = createGenerator({ getKey: p => { asked.push(p); return "KEY"; }, fetchImpl: route(), audit });
    const r = await g.generate(payload());
    expect(r).toMatchObject({ status: "ok", source: "local", note: null });
    expect(taskItems(r)).toEqual(["Did A."]);
    expect(r.blocks[r.blocks.length - 1]).toEqual({ type: "text", text: "CDP Trainee" });
    expect(calls.map(c => c.url)).toEqual(["http://localhost:11434/v1/chat/completions"]);
    expect(asked).toEqual([]);
    expect(entries).toEqual([]);
  });
  it("sends the raw notes to the local model", async () => {
    await gen().generate(payload());
    expect(JSON.parse(calls[0].init.body).messages[0].content).toContain("boss@corp.example");
  });
  it("uses the built-in rules, with the reason, when local fails and no cloud fallback is set up", async () => {
    const r = await gen({ local: down }).generate(payload());
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/Could not reach the local AI server/);
    expect(r.note).toMatch(/No cloud fallback/);
    expect(r.blocks[0].items[0]).toBe("Worked on Hibernate.");
    expect(hits("groq.com")).toHaveLength(0);
  });
  it("treats provider none as no fallback even when a key is saved", async () => {
    const r = await gen({ local: down }, { groq: "KEY" }).generate(payload({ ai: aiSettings({ fallback: { provider: "none", auto: true } }) }));
    expect(r.source).toBe("template");
    expect(hits("groq.com")).toHaveLength(0);
  });
});

describe("asking before the cloud", () => {
  it("returns needs-consent with a sanitised preview and sends nothing", async () => {
    const r = await gen({ local: down }, { groq: "KEY" }).generate(payload());
    expect(r.status).toBe("needs-consent");
    expect(r.provider).toBe("groq");
    expect(r.failure.code).toBe("UNREACHABLE");
    expect(r.preview.text).toContain("[EMAIL_1]");
    expect(r.preview.text).not.toContain("boss@corp.example");
    expect(r.preview.text).not.toContain("Cruz");
    expect(r.preview.chars).toBe(r.preview.text.length);
    expect(hits("groq.com")).toHaveLength(0);
    expect(entries).toEqual([]);
  });
  it("also asks after two unusable local replies", async () => {
    const r = await gen({ local: () => chat("not json") }, { groq: "KEY" }).generate(payload());
    expect(r).toMatchObject({ status: "needs-consent", failure: { code: "BAD_REPLY" } });
  });
  it("never asks about notes that cannot be sent", async () => {
    const notes = { ...NOTES, work: "tried password: hunter2" };
    const r = await gen({ local: down }, { groq: "KEY" }).generate(payload({ notes }));
    expect(r.status).toBe("ok");
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/will not be sent/);
    expect(hits("groq.com")).toHaveLength(0);
    expect(entries).toEqual([]);
  });
});

describe("sending to the cloud", () => {
  it("mode cloud skips local, sends sanitised notes, restores them, and logs the send without content", async () => {
    const groq = () => chat({ tasks: ["Emailed [EMAIL_1] about the issue."], topics: [], weekly_plans: [], blockers: [] });
    const r = await gen({ groq }, { groq: "GKEY" }).generate(payload({ mode: "cloud" }));
    expect(r).toMatchObject({ status: "ok", source: "groq", note: null });
    expect(taskItems(r)).toEqual(["Emailed boss@corp.example about the issue."]);
    expect(hits("localhost")).toHaveLength(0);
    const sent = hits("groq.com")[0];
    expect(sent.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(sent.init.headers.Authorization).toBe("Bearer GKEY");
    const body = JSON.parse(sent.init.body);
    expect(body.model).toBe(GROQ_MODEL);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content).toContain("[EMAIL_1]");
    expect(body.messages[0].content).not.toContain("boss@corp.example");
    expect(body.messages[0].content).not.toContain("Cruz");
    expect(entries).toEqual([{ provider: "groq", reason: "user-requested", chars: expect.any(Number) }]);
    expect(entries[0].chars).toBeGreaterThan(0);
  });
  it("hides the extra words from Settings too", async () => {
    await gen({}, { groq: "K" }).generate(payload({ mode: "cloud", ai: aiSettings({ privacyTerms: "hibernate, Acme" }) }));
    expect(JSON.parse(hits("groq.com")[0].init.body).messages[0].content).not.toMatch(/hibernate/i);
  });
  it("restores a placeholder the model re-cased and leaves one it invented", async () => {
    const groq = () => chat({ tasks: ["Emailed [email_1] and [EMAIL_9]."], topics: [], weekly_plans: [], blockers: [] });
    const r = await gen({ groq }, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(taskItems(r)).toEqual(["Emailed boss@corp.example and [EMAIL_9]."]);
  });
  it("copes when the model drops every placeholder", async () => {
    const r = await gen({}, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(taskItems(r)).toEqual(["Did A."]);
  });
  it("sends automatically when the user opted in, and logs why", async () => {
    const r = await gen({ local: down }, { groq: "K" }).generate(payload({ ai: aiSettings({ fallback: { provider: "groq", auto: true } }) }));
    expect(r.source).toBe("groq");
    expect(entries[0]).toMatchObject({ provider: "groq", reason: "UNREACHABLE" });
  });
  it("uses Gemini when it is the chosen fallback", async () => {
    const r = await gen({}, { gemini: "GEMKEY" }).generate(payload({ mode: "cloud", ai: aiSettings({ fallback: { provider: "gemini", auto: false } }) }));
    expect(r.source).toBe("gemini");
    const sent = hits("googleapis")[0];
    expect(sent.url).toContain(`${MODEL_IDS.flash}:generateContent`);
    expect(sent.init.headers["x-goog-api-key"]).toBe("GEMKEY");
    expect(JSON.parse(sent.init.body).contents[0].parts[0].text).not.toContain("boss@corp.example");
  });
  it("falls back to the built-in rules with a note when the cloud call fails", async () => {
    const r = await gen({ groq: () => res("bad key", 401, "Unauthorized") }, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/Groq failed: 401 Unauthorized: bad key/);
  });
  it("falls back when the cloud reply is unusable", async () => {
    const r = await gen({ groq: () => chat("not json") }, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(r.source).toBe("template");
    expect(r.note).toMatch(/Groq failed: Groq returned an unexpected response/);
  });
  it("retries transient cloud errors with 1000 then 3000 ms waits", async () => {
    const replies = [res("x", 503, "UNAVAILABLE"), res("x", 429, "Too Many"), chat(good)];
    let n = 0; const waits = [];
    const g = createGenerator({ getKey: () => "K", fetchImpl: route({ groq: () => replies[n++] }), sleep: async ms => { waits.push(ms); }, audit });
    const r = await g.generate(payload({ mode: "cloud" }));
    expect(r.source).toBe("groq");
    expect(waits).toEqual([1000, 3000]);
    expect(n).toBe(3);
  });
  it("does not retry other cloud errors", async () => {
    let n = 0;
    const r = await gen({ groq: () => { n++; return res("nope", 400, "Bad Request"); } }, { groq: "K" }).generate(payload({ mode: "cloud" }));
    expect(n).toBe(1);
    expect(r.source).toBe("template");
  });
  it("mode cloud without a saved key uses the built-in rules", async () => {
    const r = await gen({}, {}).generate(payload({ mode: "cloud" }));
    expect(r.source).toBe("template");
    expect(calls).toHaveLength(0);
  });
});

describe("declining", () => {
  it("mode template makes no network calls", async () => {
    const r = await gen({}, { groq: "K" }).generate(payload({ mode: "template" }));
    expect(r).toMatchObject({ status: "ok", source: "template" });
    expect(r.note).toMatch(/chose not to send/);
    expect(calls).toHaveLength(0);
  });
});

describe("connection checks", () => {
  it("testConnection needs that provider's key and then succeeds", async () => {
    await expect(gen({}, {}).testConnection("groq")).rejects.toThrow(/API key/i);
    await expect(gen({}, { groq: "K" }).testConnection("groq")).resolves.toBe(true);
    await expect(gen({}, { gemini: "K" }).testConnection("gemini", "pro")).resolves.toBe(true);
    expect(hits("googleapis")[0].url).toContain(MODEL_IDS.pro);
    await expect(gen({}, { groq: "K" }).testConnection("evil")).rejects.toThrow(/provider/i);
  });
  it("localStatus reports on the given local settings", async () => {
    const g = gen({ local: () => res({ data: [{ id: "qwen2.5:3b-instruct" }] }) });
    expect(await g.localStatus(aiSettings().local)).toEqual({ state: "ready" });
  });
});
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `npx vitest run tests/unit/main/generate.test.js`
Expected: FAIL (the old `generate.js` has a different API).

- [ ] **Step 3: Replace `src/main/generate.js`**

```js
import { buildVars, render } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";
import { sanitizeNotes, restore } from "../shared/sanitize.js";
import { PROVIDER_NAMES } from "../shared/ai.js";
import { PROMPT, notesText, parseReply } from "./reply.js";
import { runLocal, localStatus } from "./localai.js";

export const MODEL_IDS = { flash: "gemini-3.7-flash", pro: "gemini-pro-latest" };
// Unverified against Groq's current model list.
export const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const ENDPOINT = id => `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`;

const RETRY_STATUS = new Set([429, 500, 503]);
const RETRY_WAITS = [1000, 3000];
const realSleep = ms => new Promise(r => setTimeout(r, ms));

const CLOUD = {
  gemini: {
    request: (key, model, text) => ({
      url: ENDPOINT(MODEL_IDS[model] || MODEL_IDS.flash),
      headers: { "x-goog-api-key": key },
      body: { contents: [{ parts: [{ text }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }
    }),
    reply: body => body?.candidates?.[0]?.content?.parts?.[0]?.text
  },
  groq: {
    request: (key, _model, text) => ({
      url: GROQ_ENDPOINT,
      headers: { Authorization: `Bearer ${key}` },
      body: { model: GROQ_MODEL, messages: [{ role: "user", content: text }], temperature: 0.2, response_format: { type: "json_object" } }
    }),
    reply: body => body?.choices?.[0]?.message?.content
  }
};

const termsFor = (profile, ai) => [
  profile?.name, ...String(profile?.name || "").split(/\s+/), ...String(ai.privacyTerms || "").split(/[,\n]/)
].filter(Boolean);

export function createGenerator({ getKey, fetchImpl = fetch, sleep = realSleep, audit = { record() {} } }) {
  async function attempt(provider, key, model, text) {
    const P = CLOUD[provider], name = PROVIDER_NAMES[provider];
    const req = P.request(key, model, text);
    let res;
    try {
      res = await fetchImpl(req.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...req.headers },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(30000)
      });
    } catch (e) { throw Object.assign(new Error(String(e.message || e)), { transient: true }); }
    const raw = await res.text();
    if (!res.ok) throw Object.assign(new Error(`${res.status} ${res.statusText}: ${raw.slice(0, 200)}`), { transient: RETRY_STATUS.has(res.status) });
    let body;
    try { body = JSON.parse(raw); } catch { throw new Error(`${name} returned an unexpected response: not valid JSON`); }
    const reply = P.reply(body);
    if (typeof reply !== "string") throw new Error(`${name} returned an unexpected response: empty`);
    return reply;
  }

  async function call(provider, model, text) {
    const key = getKey(provider);
    if (!key) throw new Error("No API key saved.");
    for (let i = 0; ; i++) {
      try { return await attempt(provider, key, model, text); }
      catch (e) {
        if (!e.transient || i >= RETRY_WAITS.length) throw e;
        await sleep(RETRY_WAITS[i]);
      }
    }
  }

  const cloudFor = ai => { const p = ai.fallback?.provider; return CLOUD[p] && getKey(p) ? p : null; };

  async function generate({ notes, template, profile, date, dateFormat, ai, mode = "auto" }) {
    const vars = buildVars(notes, profile, fromISODate(date), dateFormat);
    const ok = (parsed, source) => ({ status: "ok", source, note: null, blocks: render(template, { ...vars, ...parsed, tomorrow: parsed.weekly_plans }) });
    const plain = note => ({ status: "ok", source: "template", note, blocks: render(template, vars) });
    if (mode === "template") return plain("You chose not to send your notes to a cloud service.");

    let failure = null;
    if (mode === "auto") {
      try { return ok(await runLocal({ fetchImpl, local: ai.local, text: PROMPT + notesText(notes) }), "local"); }
      catch (e) { failure = { code: e.code || "UNKNOWN", message: e.message }; }
    }
    const why = failure ? failure.message + " " : "";
    const provider = cloudFor(ai);
    if (!provider) return plain(why + "No cloud fallback is set up, so the built-in text rules were used.");

    const s = sanitizeNotes(notes, { terms: termsFor(profile, ai) });
    if (s.blocked) return plain(why + s.blocked + " The built-in text rules were used.");
    const text = notesText(s.notes);
    if (mode === "auto" && !ai.fallback.auto) return { status: "needs-consent", provider, failure, preview: { text, chars: text.length } };

    const name = PROVIDER_NAMES[provider];
    try {
      audit.record({ provider, reason: failure ? failure.code : "user-requested", chars: text.length });
      const parsed = parseReply(await call(provider, ai.geminiModel, PROMPT + text), name);
      for (const k of Object.keys(parsed)) parsed[k] = parsed[k].map(x => restore(x, s.map));
      return ok(parsed, provider);
    } catch (e) {
      return plain(`${name} failed: ${e.message} The built-in text rules were used.`);
    }
  }

  return {
    generate,
    localStatus: local => localStatus({ fetchImpl, local }),
    async testConnection(provider, geminiModel = "flash") {
      if (!CLOUD[provider]) throw new Error("Unknown provider.");
      if (!getKey(provider)) throw new Error("No API key saved.");
      await call(provider, geminiModel, 'Reply with the single word "ok" in a JSON object.');
      return true;
    }
  };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run tests/unit/main/generate.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS. (`ipc.test.js` mocks the generator, so it is unaffected.)

- [ ] **Step 6: Commit**

```powershell
git add src/main/generate.js tests/unit/main/generate.test.js
git commit -m "feat: generate locally first, with consented sanitised cloud fallback" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: IPC, preload and main-process wiring

**Files:**
- Modify (full replacement): `src/main/ipc.js`
- Modify: `src/preload/index.js:22-24`
- Modify: `src/main/index.js`
- Modify: `tests/unit/main/ipc.test.js`

**Interfaces:**
- Consumes: `generator.generate/localStatus/testConnection` (Task 4), `createAudit` (Task 3).
- Produces (IPC channels): `ai:generate` (payload `{notes, template, profile, date, dateFormat, mode}`; the stored AI settings are added by the main process), `ai:status` (no args), `ai:test` (`provider`), `ai:setKey` (`key, provider`).
- Produces (`window.api`): `generate(p)`, `localStatus()`, `testAI(provider)`, `setApiKey(key, provider)`.

- [ ] **Step 1: Update the tests in `tests/unit/main/ipc.test.js`**

Replace the generator mock on line 16:

old:
```js
    generator: { generate: async () => [{ type: "text", text: "x" }], testConnection: async () => true },
```
new:
```js
    generator: { generate: async () => ({ status: "ok", source: "local", note: null, blocks: [] }), testConnection: async () => true, localStatus: async () => ({ state: "ready" }) },
```

Replace the test "tests the connection for the selected provider" (lines 66-72) with these four tests:

```js
  it("tests the connection for the selected provider with the stored Gemini model", async () => {
    const seen = [];
    deps.generator.testConnection = async (p, m) => { seen.push([p, m]); return true; };
    registerIpc(deps);
    await call("ai:test", "groq");
    expect(seen).toEqual([["groq", "flash"]]);
    expect((await call("ai:test", "evil")).ok).toBe(false);
    expect(seen).toHaveLength(1);
  });
  it("generates with the stored AI settings and ignores any the caller sends", async () => {
    let seen;
    deps.generator.generate = async p => { seen = p; return { status: "ok" }; };
    registerIpc(deps);
    const r = await call("ai:generate", { notes: { work: "x" }, template: "t", profile: {}, date: "2026-10-13", dateFormat: "long", mode: "cloud", ai: { evil: true } });
    expect(r.ok).toBe(true);
    expect(seen.ai).toEqual(deps.store.read("settings").ai);
    expect(seen.mode).toBe("cloud");
  });
  it("defaults the mode to auto and rejects unknown modes", async () => {
    let seen;
    deps.generator.generate = async p => { seen = p; return { status: "ok" }; };
    registerIpc(deps);
    await call("ai:generate", { notes: {}, template: "t", profile: {}, date: "2026-10-13", dateFormat: "long" });
    expect(seen.mode).toBe("auto");
    expect((await call("ai:generate", { notes: {}, mode: "bogus" })).ok).toBe(false);
  });
  it("reports local status for the stored local settings", async () => {
    let seen;
    deps.generator.localStatus = async l => { seen = l; return { state: "ready" }; };
    registerIpc(deps);
    expect(await call("ai:status")).toEqual({ ok: true, value: { state: "ready" } });
    expect(seen).toEqual(deps.store.read("settings").ai.local);
  });
```

- [ ] **Step 2: Run the ipc tests and confirm the new ones fail**

Run: `npx vitest run tests/unit/main/ipc.test.js`
Expected: FAIL on the four tests above (old `ai:test` signature, no `ai:status`, `ai:generate` passes the raw payload).

- [ ] **Step 3: Replace `src/main/ipc.js`**

```js
const AI_PROVIDERS = ["gemini", "groq"];
const MODES = ["auto", "cloud", "template"];
const SAVEABLE =["history", "template", "settings", "draft"];

const wrap = fn => async (_e, ...args) => {
  try { return { ok: true, value: await fn(...args) }; }
  catch (e) { return { ok: false, error: { code: e.code || "ERROR", message: String(e.message || e) } }; }
};
const httpUrl = u => { let p; try { p = new URL(u); } catch { throw new Error("Invalid URL."); } if (!/^https?:$/.test(p.protocol)) throw new Error("Only http(s) URLs are allowed."); return u; };

export function registerIpc({ ipcMain, store, secrets, generator, scheduler, zimbra, send }) {
  const h = (ch, fn) => ipcMain.handle(ch, wrap(fn));
  const checkProvider = p => { if (!AI_PROVIDERS.includes(p)) throw new Error("Unknown provider."); return p; };
  // The renderer never supplies AI settings: what gets sent, and where, is decided from the stored settings.
  const ai = () => store.read("settings").ai;
  h("store:load", () => ({ ...store.readAll(), hasKey: { gemini: secrets.hasKey("gemini"), groq: secrets.hasKey("groq") } }));
  h("store:save", (name, data) => { if (!SAVEABLE.includes(name)) throw new Error("Cannot save " + name); store.write(name, data); return true; });
  h("schedule:upsert", item => scheduler.upsert(item));
  h("schedule:setStatus", (id, status) => scheduler.setStatus(id, status));
  h("ai:generate", ({ notes, template, profile, date, dateFormat, mode = "auto" }) => {
    if (!MODES.includes(mode)) throw new Error("Unknown mode.");
    return generator.generate({ notes, template, profile, date, dateFormat, mode, ai: ai() });
  });
  h("ai:status", () => generator.localStatus(ai().local));
  h("ai:test", p => generator.testConnection(checkProvider(p), ai().geminiModel));
  h("ai:setKey", (key, p = "gemini") => { secrets.setKey(key, checkProvider(p)); return true; });
  h("zimbra:check", url => zimbra.checkSession(httpUrl(url)));
  h("zimbra:open", async url => { await zimbra.openPage(httpUrl(url)); return true; });
  h("zimbra:prepare", async ({ url, to, subject, body }) => {
    await zimbra.prepareMessage({ url: httpUrl(url), to, subject, body }, n => send("prepare:step", n));
    return true;
  });
}
```

- [ ] **Step 4: Update `src/preload/index.js`**

Replace lines 22-24:

old:
```js
  generate: p => call("ai:generate", p),
  testAI: (model, provider) => call("ai:test", model, provider),
  setApiKey: (key, provider) => call("ai:setKey", key, provider),
```
new:
```js
  generate: p => call("ai:generate", p),
  localStatus: () => call("ai:status"),
  testAI: provider => call("ai:test", provider),
  setApiKey: (key, provider) => call("ai:setKey", key, provider),
```

- [ ] **Step 5: Wire the audit log and the test-mode network guard in `src/main/index.js`**

Add the import after the `createGenerator` import (line 6):

```js
import { createAudit } from "./audit.js";
```

Replace line 27:

old:
```js
    const generator = createGenerator({ getKey: p => secrets.getKey(p) });
```
new:
```js
    const generator = createGenerator({
      getKey: p => secrets.getKey(p),
      audit: createAudit(store),
      // Tests must never reach a developer's running Ollama or any cloud service.
      fetchImpl: process.env.DD_TEST ? async () => { throw new Error("network disabled in tests"); } : undefined
    });
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npx vitest run tests/unit/main/ipc.test.js`
Expected: PASS.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/main/ipc.js src/preload/index.js src/main/index.js tests/unit/main/ipc.test.js
git commit -m "feat: wire local AI through IPC using stored settings only" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Renderer flow: modes, consent dialog, source banner

**Files:**
- Modify: `src/renderer/src/useApp.js`
- Modify: `src/renderer/src/screens/dialogs.jsx` (add `CloudConsentDialog`)
- Modify: `src/renderer/src/screens/NewDigest.jsx` (add `AiSourceBanner`, use it)
- Modify: `src/renderer/src/App.jsx`
- Test: `tests/unit/renderer/ai-ui.test.jsx`

**Interfaces:**
- Consumes: `window.api.generate(p) -> {status,...}`, `window.api.localStatus()`, `window.api.testAI(provider)` (Task 5); `PROVIDER_NAMES` (Task 1).
- Produces (state, on `s`): `aiSource: null|"local"|"groq"|"gemini"|"template"`, `aiNote: string|null`, `cloudAsk: null | {provider, failure, preview}`, `audit: []`, `localStatus: null | {state, detail?, command?}`, `checkingLocal: boolean`.
- Produces (actions, on `a`): `generate()`, `run(mode)`, `cloudSend()`, `cloudDecline()`, `checkLocal()`, `testAI(provider)`.
- Produces (components): `CloudConsentDialog({s,a})` in `dialogs.jsx`; `AiSourceBanner({s})` exported from `NewDigest.jsx`.

- [ ] **Step 1: Write the failing UI tests**

`tests/unit/renderer/ai-ui.test.jsx`:

```jsx
// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CloudConsentDialog } from "../../../src/renderer/src/screens/dialogs.jsx";
import { AiSourceBanner } from "../../../src/renderer/src/screens/NewDigest.jsx";

const ask = { provider: "groq", failure: { code: "UNREACHABLE", message: "Could not reach the local AI server at http://localhost:11434/v1." }, preview: { text: "Today's Work:\nemailed [EMAIL_1]", chars: 31 } };

describe("CloudConsentDialog", () => {
  it("shows why local failed, who would get the text, and exactly what would be sent", () => {
    render(<CloudConsentDialog s={{ cloudAsk: ask }} a={{}} />);
    expect(screen.getByText(/Could not reach the local AI server/)).toBeTruthy();
    expect(screen.getByText(/Send your notes to Groq/)).toBeTruthy();
    expect(screen.getByLabelText("Text that would be sent").textContent).toContain("emailed [EMAIL_1]");
  });
  it("sends only when the user chooses to, and declines to the plain template otherwise", () => {
    const a = { cloudSend: vi.fn(), cloudDecline: vi.fn() };
    render(<CloudConsentDialog s={{ cloudAsk: ask }} a={a} />);
    fireEvent.click(screen.getByText("Use plain template"));
    expect(a.cloudDecline).toHaveBeenCalledTimes(1);
    expect(a.cloudSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Send to Groq"));
    expect(a.cloudSend).toHaveBeenCalledTimes(1);
  });
});

describe("AiSourceBanner", () => {
  it("labels a cloud digest", () => {
    render(<AiSourceBanner s={{ aiSource: "groq", aiNote: null }} />);
    expect(screen.getByText("Generated by Groq (cloud).")).toBeTruthy();
  });
  it("explains why the AI was not used", () => {
    render(<AiSourceBanner s={{ aiSource: "template", aiNote: "Could not reach the local AI server. No cloud fallback is set up." }} />);
    expect(screen.getByText("AI was not used for this digest.")).toBeTruthy();
    expect(screen.getByText(/No cloud fallback is set up/)).toBeTruthy();
  });
  it("shows nothing for a local digest or before anything is generated", () => {
    for (const s of [{ aiSource: "local", aiNote: null }, { aiSource: null, aiNote: null }]) {
      const { container, unmount } = render(<AiSourceBanner s={s} />);
      expect(container.textContent).toBe("");
      unmount();
    }
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run tests/unit/renderer/ai-ui.test.jsx`
Expected: FAIL (`CloudConsentDialog` and `AiSourceBanner` are not exported).

- [ ] **Step 3: Add `CloudConsentDialog` to `src/renderer/src/screens/dialogs.jsx`**

Add the import under the existing `@shared/report.js` import (line 5):

```js
import { PROVIDER_NAMES } from "@shared/ai.js";
```

Append at the end of the file:

```jsx
export function CloudConsentDialog({s,a}){
  const {ConfirmDialog}=D();const c=s.cloudAsk,name=PROVIDER_NAMES[c.provider];
  return <ConfirmDialog tone="warning" icon="triangle-alert" title="The local AI didn't work." description={<>{c.failure?.message} Send your notes to {name} instead? Only the text below is sent. Emails, links, phone numbers and names are replaced with placeholders first.</>} confirmLabel={"Send to "+name} cancelLabel="Use plain template" onConfirm={a.cloudSend} onCancel={a.cloudDecline}>
    <pre aria-label="Text that would be sent" style={{margin:"12px 0 0",maxHeight:200,overflow:"auto",padding:12,borderRadius:"var(--radius-md)",background:"var(--surface-sunken)",border:"1px solid var(--border-subtle)",font:"400 12px/1.5 var(--font-mono)",color:"var(--fg-2)",whiteSpace:"pre-wrap"}}>{c.preview.text}</pre>
  </ConfirmDialog>;
}
```

- [ ] **Step 4: Add `AiSourceBanner` to `src/renderer/src/screens/NewDigest.jsx`**

Add the import under the `@shared/report.js` import (line 5):

```js
import { PROVIDER_NAMES } from "@shared/ai.js";
```

Add the component above `export function NewDigestScreen` (before line 74):

```jsx
export function AiSourceBanner({s}){
  const {Banner}=D();
  if(s.aiSource==="template")return <Banner tone="warning" title="AI was not used for this digest.">{s.aiNote}</Banner>;
  if(s.aiSource==="groq"||s.aiSource==="gemini")return <Banner tone="info" title={"Generated by "+PROVIDER_NAMES[s.aiSource]+" (cloud)."}>Your notes were sent to a cloud service with emails, links, phone numbers and names replaced by placeholders.</Banner>;
  return null;
}
```

In `NewDigestScreen`, replace the line that renders the document (line 92):

old:
```jsx
          {showDoc&&<DigestDocument blocks={s.blocks} subject={subject} to={s.schedule.to} editing={stage==="editing"} draft={s.draft} setDraft={a.setDraft}/>}
```
new:
```jsx
          {showDoc&&s.aiSource&&s.aiSource!=="local"&&<div style={{marginBottom:12}}><AiSourceBanner s={s}/></div>}
          {showDoc&&<DigestDocument blocks={s.blocks} subject={subject} to={s.schedule.to} editing={stage==="editing"} draft={s.draft} setDraft={a.setDraft}/>}
```

- [ ] **Step 5: Route the dialog in `src/renderer/src/App.jsx`**

Add `CloudConsentDialog` to the import on line 10:

```js
import { ScheduleModal, SendModal, PrepareModal, LoginModal, ZimbraErrorDialog, ZimbraStatusModal, ConfirmCancel, ConfirmRegen, MissedDialog, ViewModal, CloudConsentDialog } from "./screens/dialogs.jsx";
```

Add below the `mt === "view"` line (line 38):

```jsx
      {mt === "cloud" && s.cloudAsk && <CloudConsentDialog s={s} a={a} />}
```

- [ ] **Step 6: Update `src/renderer/src/useApp.js`**

(a) Initial state, line 14. Append the new keys at the end of the object:

old:
```js
  settings: null, hasKey: { gemini: false, groq: false }, genStep: 0, prepStep: 0, testing: false, testingAI: false, curId: null, genError: null, modalDetails: null, modalCode: null
```
new:
```js
  settings: null, hasKey: { gemini: false, groq: false }, genStep: 0, prepStep: 0, testing: false, testingAI: false, curId: null, genError: null, modalDetails: null, modalCode: null,
  aiSource: null, aiNote: null, cloudAsk: null, audit: [], localStatus: null, checkingLocal: false
```

(b) Boot, line 53. Add `audit`:

old:
```js
      setS(p => ({ ...p, settings, hasKey: d.hasKey, template: d.template.body, today, date: saved,
```
new:
```js
      setS(p => ({ ...p, settings, hasKey: d.hasKey, audit: d.audit, template: d.template.body, today, date: saved,
```

(c) `resetDigest`, line 90. Clear the AI state:

old:
```js
curId: null, date: now, today: now, modal: null, genError: null }));
```
new:
```js
curId: null, date: now, today: now, modal: null, genError: null, aiSource: null, aiNote: null, cloudAsk: null }));
```

(d) Replace the whole `async generate() { ... },` method (lines 94-112) with these four members:

```js
    generate: () => a.run("auto"),
    cloudSend: () => a.run("cloud"),
    cloudDecline: () => a.run("template"),
    async run(mode) {
      const c = ref.current;
      if (!hasNotes(c.notes)) return;
      clear();
      const id = ++genId.current;
      up({ page: "new", stage: "generating", genStep: 0, modal: null, genError: null, cloudAsk: null });
      later(() => up({ genStep: 1 }), 600);
      later(() => up({ genStep: 2 }), 1200);
      try {
        const r = await api().generate({ notes: c.notes, template: c.template, profile: c.settings.profile, date: toISODate(c.date), dateFormat: c.settings.email.dateFormat, mode });
        if (id !== genId.current) return;
        clear();
        if (r.status === "needs-consent") { up({ modal: { t: "cloud" }, cloudAsk: r }); return; }
        up({ stage: "review", blocks: r.blocks, aiSource: r.source, aiNote: r.note, digestStatus: "ready", savedAt: null, genAt: formatTime(new Date()) });
        if (r.source === "groq" || r.source === "gemini") api().store.load().then(d => up({ audit: d.audit }), () => {});
      } catch (e) {
        if (id !== genId.current) return;
        clear();
        up({ stage: "error", genError: { details: e.message } });
      }
    },
```

(e) `saveSettings`, lines 172-177. Only store a key when a fallback provider is chosen:

old:
```js
      if (apiKey && apiKey.trim()) { const prov = settings.ai.provider; await api().setApiKey(apiKey, prov); up(p => ({ hasKey: { ...p.hasKey, [prov]: true } })); }
```
new:
```js
      const prov = settings.ai.fallback.provider;
      if (apiKey && apiKey.trim() && prov !== "none") { await api().setApiKey(apiKey, prov); up(p => ({ hasKey: { ...p.hasKey, [prov]: true } })); }
```

(f) Replace `testAI` (lines 178-183) and add `checkLocal`:

old:
```js
    async testAI() {
      up({ testingAI: true });
      try { await api().testAI(ref.current.settings.ai.model, ref.current.settings.ai.provider); toast("Connection OK."); }
      catch (e) { toast("Unable to connect: " + e.message, "danger"); }
      up({ testingAI: false });
    }
```
new:
```js
    async testAI(provider) {
      up({ testingAI: true });
      try { await api().testAI(provider); toast("Connection OK."); }
      catch (e) { toast("Unable to connect: " + e.message, "danger"); }
      up({ testingAI: false });
    },
    async checkLocal() {
      up({ checkingLocal: true });
      try { up({ localStatus: await api().localStatus(), checkingLocal: false }); }
      catch (e) { up({ localStatus: { state: "no-server", detail: e.message }, checkingLocal: false }); }
    }
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `npx vitest run tests/unit/renderer/ai-ui.test.jsx`
Expected: PASS.

- [ ] **Step 8: Run the whole suite**

Run: `npm test`
Expected: PASS. (`settings.test.jsx` still passes: Settings is unchanged until Task 7 and its test passes its own `a`.)

- [ ] **Step 9: Commit**

```powershell
git add src/renderer/src/useApp.js src/renderer/src/screens/dialogs.jsx src/renderer/src/screens/NewDigest.jsx src/renderer/src/App.jsx tests/unit/renderer/ai-ui.test.jsx
git commit -m "feat: add cloud consent dialog and AI source banner" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Settings screen

**Files:**
- Modify (full replacement): `src/renderer/src/screens/Settings.jsx`
- Modify (full replacement): `tests/unit/renderer/settings.test.jsx`

**Interfaces:**
- Consumes: `s.settings.ai` (Task 3 shape), `s.localStatus`, `s.checkingLocal`, `s.audit`, `s.hasKey`, `s.testingAI`; `a.saveSettings({settings, apiKey})` (returns a promise), `a.checkLocal()`, `a.testAI(provider)` (Task 6); `DEFAULT_LOCAL`, `isCloudModel`, `isLoopbackUrl`, `pullCommand` (Task 1).
- Produces: a Settings screen that saves `settings.ai = { local: {baseUrl, model}, fallback: {provider, auto}, geminiModel, privacyTerms }`.

- [ ] **Step 1: Replace `tests/unit/renderer/settings.test.jsx`**

```jsx
// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsScreen } from "../../../src/renderer/src/screens/Settings.jsx";
import { DEFAULTS } from "../../../src/main/store.js";

const state = (fallback, hasKey, local = {}, extra = {}) => {
  const settings = DEFAULTS().settings;
  settings.ai.fallback.provider = fallback;
  Object.assign(settings.ai.local, local);
  return { settings, hasKey, today: new Date(), zimbra: false, testing: false, testingAI: false, checkingLocal: false, localStatus: null, audit: [], ...extra };
};
const a = { saveSettings() {}, testAI() {}, checkLocal() {}, testZimbra() {}, openZimbra() {} };
const none = { gemini: false, groq: false };

describe("Settings: local AI card", () => {
  it("shows the stored server address and model", () => {
    render(<SettingsScreen s={state("none", none)} a={a} />);
    expect(screen.getByDisplayValue("http://localhost:11434/v1")).toBeTruthy();
    expect(screen.getByDisplayValue("qwen2.5:3b-instruct")).toBeTruthy();
  });
  it("shows no warnings for the defaults", () => {
    render(<SettingsScreen s={state("none", none)} a={a} />);
    expect(screen.queryByText("This is a cloud model.")).toBeNull();
    expect(screen.queryByText("This address is not on this computer.")).toBeNull();
  });
  it("warns about Ollama cloud models, however they are named", () => {
    for (const model of ["gpt-oss:120b-cloud", "glm-5.3-flash:cloud"]) {
      const { unmount } = render(<SettingsScreen s={state("none", none, { model })} a={a} />);
      expect(screen.getByText("This is a cloud model.")).toBeTruthy();
      unmount();
    }
  });
  it("warns when the server is not on this computer", () => {
    render(<SettingsScreen s={state("none", none, { baseUrl: "http://192.168.1.5:11434/v1" })} a={a} />);
    expect(screen.getByText("This address is not on this computer.")).toBeTruthy();
  });
  it("tells the user the exact command when the model is missing", () => {
    const localStatus = { state: "no-model", detail: "x", command: "ollama pull qwen2.5:3b-instruct" };
    render(<SettingsScreen s={state("none", none, {}, { localStatus })} a={a} />);
    expect(screen.getByText("Model not installed.")).toBeTruthy();
    expect(screen.getByText("ollama pull qwen2.5:3b-instruct")).toBeTruthy();
  });
  it("explains a server that is not running", () => {
    const localStatus = { state: "no-server", detail: "Nothing is answering at http://localhost:11434/v1. Install Ollama from https://ollama.com/download and make sure it is running." };
    render(<SettingsScreen s={state("none", none, {}, { localStatus })} a={a} />);
    expect(screen.getByText("Local AI is not running.")).toBeTruthy();
    expect(screen.getByText(/Install Ollama/)).toBeTruthy();
  });
});

describe("Settings: cloud fallback card", () => {
  it("key placeholder reflects the chosen provider's saved state", () => {
    const { unmount } = render(<SettingsScreen s={state("groq", { gemini: true, groq: false })} a={a} />);
    expect(screen.getByPlaceholderText("Paste your key")).toBeTruthy();
    unmount();
    render(<SettingsScreen s={state("gemini", { gemini: true, groq: false })} a={a} />);
    expect(screen.getByPlaceholderText("Saved")).toBeTruthy();
  });
  it("shows the Gemini model and the free-tier warning only for Gemini", () => {
    const { unmount } = render(<SettingsScreen s={state("groq", { gemini: false, groq: true })} a={a} />);
    expect(screen.queryByText("Gemini model")).toBeNull();
    expect(screen.queryByText("Free Gemini use may be used by Google.")).toBeNull();
    unmount();
    render(<SettingsScreen s={state("gemini", { gemini: true, groq: false })} a={a} />);
    expect(screen.getByText("Gemini model")).toBeTruthy();
    expect(screen.getByText("Free Gemini use may be used by Google.")).toBeTruthy();
  });
  it("hides the key and privacy fields when there is no fallback", () => {
    render(<SettingsScreen s={state("none", { gemini: true, groq: true })} a={a} />);
    expect(screen.queryByPlaceholderText("Saved")).toBeNull();
    expect(screen.queryByPlaceholderText("Paste your key")).toBeNull();
    expect(screen.queryByText("Words to hide from cloud services")).toBeNull();
  });
  it("lists the most recent cloud sends without any content", () => {
    const audit = [{ at: "2026-10-13T01:02:03.000Z", provider: "groq", reason: "UNREACHABLE", chars: 120 }];
    render(<SettingsScreen s={state("groq", { gemini: false, groq: true }, {}, { audit })} a={a} />);
    expect(screen.getByText(/Groq · UNREACHABLE · 120 characters/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run tests/unit/renderer/settings.test.jsx`
Expected: FAIL (the current Settings screen still reads `ai.provider`).

- [ ] **Step 3: Replace `src/renderer/src/screens/Settings.jsx`**

```jsx
import React from "react";
import * as DS from "../ds";
import { PageHeader } from "../Shell.jsx";
import { isValidRecipients, DATE_FORMATS, formatDate } from "@shared/time.js";
import { subjectFor } from "@shared/report.js";
import { DEFAULT_LOCAL, PROVIDER_NAMES, isCloudModel, isLoopbackUrl, pullCommand } from "@shared/ai.js";
const D = () => DS;
const validUrl = u => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };
export function SettingsScreen({s,a}){
  const {Card,Button,Input,Select,TimePicker,StatusBadge,Banner}=D();
  const ai=s.settings.ai;
  const [p,setP]=React.useState({
    name:s.settings.profile.name,role:s.settings.profile.role,
    to:s.settings.email.defaultRecipient,subject:s.settings.email.defaultSubject,dateFormat:s.settings.email.dateFormat,
    time:s.settings.general.defaultSendTime,url:s.settings.zimbra.url,
    lurl:ai.local.baseUrl,lmodel:ai.local.model,fb:ai.fallback.provider,fbAuto:ai.fallback.auto?"auto":"ask",gmodel:ai.geminiModel,terms:ai.privacyTerms,apiKey:""});
  const [tried,setTried]=React.useState(false);
  const badTo=!isValidRecipients(p.to),badUrl=!validUrl(p.url),badLocal=!validUrl(p.lurl)||!p.lmodel.trim();
  const save=()=>{
    if(badTo||badUrl||badLocal){setTried(true);return Promise.resolve(false);}
    setTried(false);
    const done=a.saveSettings({apiKey:p.apiKey,settings:{...s.settings,
      general:{...s.settings.general,defaultSendTime:p.time},
      profile:{name:p.name,role:p.role},
      email:{defaultRecipient:p.to,defaultSubject:p.subject,dateFormat:p.dateFormat},
      zimbra:{url:p.url},
      ai:{local:{baseUrl:p.lurl.trim(),model:p.lmodel.trim()},fallback:{provider:p.fb,auto:p.fbAuto==="auto"},geminiModel:p.gmodel,privacyTerms:p.terms}}});
    setP(x=>({...x,apiKey:""}));
    return Promise.resolve(done);
  };
  const check=async()=>{if(await save()===false)return;a.checkLocal();};
  React.useEffect(()=>{window.__ddSaveSettings=save;return()=>{delete window.__ddSaveSettings;};});
  const set=k=>v=>setP({...p,[k]:v});const row={display:"grid",gridTemplateColumns:"1fr 1fr",gap:14};
  const ls=s.localStatus,col={display:"flex",flexDirection:"column",gap:14};
  const recent=(s.audit||[]).slice(-5).reverse();
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <PageHeader title="Settings" right={<Button variant="primary" kbd="Ctrl+S" onClick={save}>Save</Button>}/>
    <div style={{flex:1,overflowY:"auto"}}><div style={{maxWidth:720,padding:28,display:"flex",flexDirection:"column",gap:14}}>
      <Card title="General"><div style={row}><TimePicker label="Default send time" value={p.time} onChange={set("time")}/></div></Card>
      <Card title="Profile" subtitle="Used in the report sign-off"><div style={row}><Input label="Name" value={p.name} onChange={set("name")}/><Input label="Role" value={p.role} onChange={set("role")}/></div></Card>
      <Card title="Email"><div style={row}><Input label="Default recipients" value={p.to} onChange={set("to")} helper="Separate multiple addresses with commas." error={tried&&badTo?"Enter valid email addresses, separated by commas.":undefined}/><Input label="Default subject" value={p.subject} onChange={set("subject")} helper={subjectFor(p.subject,s.today,p.dateFormat)}/><Select label="Date format" value={p.dateFormat} onChange={set("dateFormat")} options={Object.keys(DATE_FORMATS).map(k=>({value:k,label:formatDate(s.today,k)}))}/></div></Card>
      <Card title="Zimbra" actions={s.zimbra?<StatusBadge status="sent" label="Connected" size="sm"/>:<StatusBadge status="none" label="Disconnected" size="sm"/>}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}><Input label="Zimbra URL" value={p.url} onChange={set("url")} helper="Uses your existing browser session. Your password is never entered here." error={tried&&badUrl?"Enter a valid URL.":undefined}/>
        {!s.zimbra&&<Banner tone="warning" title="Zimbra login required.">Open Zimbra and sign in, then test the connection.</Banner>}
        <div style={{display:"flex",gap:8}}><Button variant="outline" iconRight="external-link" onClick={a.openZimbra}>Open Zimbra</Button><Button loading={s.testing} onClick={a.testZimbra}>Test Connection</Button></div></div>
        <p style={{margin:"14px 0 0",font:"var(--text-helper)",color:"var(--fg-3)"}}>Daily Digest prepares emails in Zimbra and never presses Send.</p>
      </Card>
      <Card title="Local AI" subtitle="Runs on this computer through Ollama. Your notes stay here." actions={ls?<StatusBadge status={ls.state==="ready"?"sent":"failed"} label={ls.state==="ready"?"Ready":ls.state==="no-model"?"Model missing":"Not running"} size="sm"/>:<StatusBadge status="none" label="Not checked" size="sm"/>}>
        <div style={col}>
          <div style={row}>
            <Input label="Server address" value={p.lurl} onChange={set("lurl")} helper={"Default "+DEFAULT_LOCAL.baseUrl} error={tried&&!validUrl(p.lurl)?"Enter a valid http(s) address.":undefined}/>
            <Input label="Model" value={p.lmodel} onChange={set("lmodel")} helper={"Default "+DEFAULT_LOCAL.model} error={tried&&!p.lmodel.trim()?"Enter a model name.":undefined}/>
          </div>
          {validUrl(p.lurl)&&!isLoopbackUrl(p.lurl)&&<Banner tone="warning" title="This address is not on this computer.">Your notes are sent to that server exactly as written.</Banner>}
          {isCloudModel(p.lmodel)&&<Banner tone="warning" title="This is a cloud model.">Ollama models whose name ends in -cloud or :cloud run on Ollama's servers, not on this computer.</Banner>}
          {ls&&ls.state==="no-server"&&<Banner tone="warning" title="Local AI is not running.">{ls.detail}</Banner>}
          {ls&&ls.state==="no-model"&&<Banner tone="warning" title="Model not installed.">Run this in a terminal, then check again: <code>{ls.command||pullCommand(p.lmodel)}</code></Banner>}
          <div><Button variant="outline" loading={s.checkingLocal} onClick={check}>Save and check</Button></div>
        </div>
      </Card>
      <Card title="Cloud fallback" subtitle="Used only when the local AI fails, and only as described below.">
        <div style={col}>
          <div style={row}>
            <Select label="Fallback provider" value={p.fb} onChange={v=>setP({...p,fb:v,apiKey:""})} options={[{value:"none",label:"None (local only)"},{value:"groq",label:PROVIDER_NAMES.groq},{value:"gemini",label:PROVIDER_NAMES.gemini}]}/>
            {p.fb!=="none"&&<Select label="When the local AI fails" value={p.fbAuto} onChange={set("fbAuto")} options={[{value:"ask",label:"Ask me each time"},{value:"auto",label:"Send automatically"}]}/>}
          </div>
          {p.fb==="gemini"&&<Select label="Gemini model" value={p.gmodel} onChange={set("gmodel")} options={[{value:"flash",label:"Flash"},{value:"pro",label:"Pro"}]}/>}
          {p.fb==="gemini"&&<Banner tone="warning" title="Free Gemini use may be used by Google.">Google can use content sent through the free Gemini API to improve its products. Use a paid project if your notes are sensitive.</Banner>}
          {p.fb!=="none"&&<>
            <Input label="API key" type="password" value={p.apiKey} onChange={v=>setP({...p,apiKey:v})} placeholder={s.hasKey[p.fb]?"Saved":"Paste your key"} helper="Stored encrypted on this computer."/>
            <Input label="Words to hide from cloud services" value={p.terms} onChange={set("terms")} helper="Comma separated, for example your manager's name or your company. Your own name is always hidden."/>
            <Banner tone="info" title="What is sent.">Only your notes. Emails, links, IP addresses, phone numbers, long tokens and the words above are replaced with placeholders first and put back afterwards. Notes that look like they contain a password or key are never sent.</Banner>
            <div><Button variant="outline" loading={s.testingAI} onClick={()=>a.testAI(p.fb)}>Test Connection</Button></div>
          </>}
          {recent.length>0&&<div>
            <div style={{font:"500 12px/1.2 var(--font-sans)",color:"var(--fg-2)",marginBottom:6}}>Recent cloud sends</div>
            {recent.map((e,i)=><div key={e.at+i} style={{font:"var(--text-helper)",color:"var(--fg-3)"}}>{new Date(e.at).toLocaleString()} · {PROVIDER_NAMES[e.provider]||e.provider} · {e.reason} · {e.chars} characters</div>)}
          </div>}
        </div>
      </Card>
      <div style={{font:"var(--text-helper)",color:"var(--fg-3)",textAlign:"center"}}>Daily Digest v{__APP_VERSION__}</div>
    </div></div>
  </div>;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run tests/unit/renderer/settings.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS (including `a11y.test.jsx` and `ds.test.jsx`).

- [ ] **Step 6: Build to catch import or JSX mistakes**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 7: Commit**

```powershell
git add src/renderer/src/screens/Settings.jsx tests/unit/renderer/settings.test.jsx
git commit -m "feat: add local AI and cloud fallback settings" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Docs, model comparison script and final verification

**Files:**
- Create: `scripts/try-local.mjs`
- Modify: `README.md`, `docs/verification-checklist.md`, `.gitignore`

- [ ] **Step 1: Write `scripts/try-local.mjs`**

This is a manual tool against a real Ollama. It is not part of `npm test`.

```js
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
```

- [ ] **Step 2: Add `HANDOFF.md` to `.gitignore`**

Append a line `HANDOFF.md` at the end of `.gitignore`:

```powershell
Add-Content -Path .gitignore -Value "HANDOFF.md"
```

- [ ] **Step 3: Update `README.md`**

Use the Edit tool for each replacement. Old text is exact.

(a) Features bullet (line 17):

old:
```
- **AI-written sentences** from keyword notes, using Gemini or Groq. Without an API key it falls back to simple built-in text rules.
```
new:
```
- **AI-written sentences** from keyword notes, written by a small model running on your own computer through Ollama. Your notes stay on your PC. If the local model fails you can optionally let Groq or Gemini take over, with your approval and with names, emails and links hidden first. With no AI at all it uses simple built-in text rules.
```

(b) Requirements (line 39):

old:
```
- Optional: a [Gemini](https://aistudio.google.com/) or [Groq](https://console.groq.com/) API key for the AI-written sentences.
```
new:
```
- [Ollama](https://ollama.com/download) with a small model for the AI-written sentences (see [Set up the local AI](#set-up-the-local-ai)). A PC with 8 GB of RAM can run the default model; 16 GB or a GPU is more comfortable.
- Optional: a [Groq](https://console.groq.com/) or [Gemini](https://aistudio.google.com/) API key, used only as a fallback when the local AI fails.
```

(c) Settings table row (line 51):

old:
```
| AI Provider | Provider (Gemini or Groq), model, and your API key |
```
new:
```
| Local AI | Server address and model (the defaults work with Ollama). Click **Save and check** |
| Cloud fallback | Optional. Provider (None, Groq or Gemini), ask-each-time or automatic, API key, words to hide |
```

(d) Insert a new section before `## Using it` (before line 55). Use this as `new_string` ending with the original heading:

```
## Set up the local AI

Daily Digest writes the sentences with a small AI model that runs on your own computer through [Ollama](https://ollama.com). Nothing is sent to the internet for this.

1. Install **Ollama for Windows** from <https://ollama.com/download>. After installing, it runs in the background (look for the llama icon in the system tray).
2. Open PowerShell and download the model once (about 2 GB):

   ```bash
   ollama pull qwen2.5:3b-instruct
   ```

   On a PC with 16 GB of RAM or a GPU you can use a larger model for better wording (about 4.7 GB):

   ```bash
   ollama pull qwen2.5:7b-instruct
   ```

   Then type that model name into **Settings > Local AI > Model**.
3. In **Settings > Local AI**, click **Save and check**. The badge should say **Ready**.
4. Generate a digest. On a laptop without a GPU expect it to take a few seconds up to about half a minute. The first digest after a long pause is slower because the model has to load into memory.

If the badge says **Not running** or **Model missing**, Settings shows what to do. See [Troubleshooting](#troubleshooting).

Do not pick a model whose name ends in `-cloud` or `:cloud`. Ollama runs those on its own servers, so your notes would leave your computer. Settings warns you if you do.

Other servers that speak the OpenAI chat API (LM Studio, llama.cpp) may work if you change the server address, but only Ollama is tested.

### Optional cloud fallback

If the local AI fails (for example Ollama is not running) you can let one cloud provider write the digest instead.

- Choose the provider in **Settings > Cloud fallback** and paste its API key. The key is encrypted on your computer.
- By default the app **asks you each time** and shows the exact text it would send. You can switch to **Send automatically**.
- Before anything is sent, emails, links, IP addresses, phone numbers, long tokens, your name and the words you list are replaced with placeholders, then put back in the result. Notes that look like they contain a password or key, or that are very long, are never sent.
- A digest written by a cloud service says so in a banner. Settings lists your last cloud sends (time, provider, reason, size, never the content).
- Free Gemini API usage may be used by Google to improve its products. Prefer Groq, or a paid Gemini project, if your notes are sensitive.

## Using it
```

(e) Replace the "How AI generation works" section (lines 89-95):

old:
```
- Each note is sent to the provider you chose in Settings, with instructions to write one formal sentence per item, fix the spelling of technical names, and never invent facts, numbers or results.
- Transient errors (rate limits, server errors) are retried automatically, up to 3 attempts.
- If the call fails, you see an error banner. Your notes are kept and **Try Again** re-runs the request.
- With no API key saved, the app uses its built-in text rules instead.
- Always read the report before sending. The model may add general context that a keyword implies, and that context can be wrong.
```
new:
```
- The local model gets your notes with instructions to write one formal sentence per item, fix the spelling of technical names, and never invent facts, numbers or results. If its answer is not usable it is asked once more.
- If the local model fails, you see why (not running, model missing, too slow, unusable answer). Then, depending on your Cloud fallback settings, the app asks before sending sanitised notes to the cloud, sends them automatically, or builds the digest with its built-in text rules. Your notes are never lost.
- Cloud calls retry rate-limit and server errors up to 3 times. If the cloud also fails, the built-in text rules are used.
- Always read the report before sending. A small model may add general context that a keyword implies, and that context can be wrong.
```

(f) Replace the two privacy bullets (lines 100-101):

old:
```
- **API keys** are encrypted with Windows (Electron `safeStorage`) and stay in the main process. The settings screen can write a key but can never read it back.
- Only the text of your notes is sent to the AI provider you select. Your Zimbra content is never sent anywhere.
```
new:
```
- **API keys** (only needed for the optional cloud fallback) are encrypted with Windows (Electron `safeStorage`) and stay in the main process. The settings screen can write a key but can never read it back.
- With the local AI, your notes go only to the Ollama server on your own computer. The main process, not the screen, decides what is sent and where, from your saved settings.
- Only the sanitised text of your notes can ever go to a cloud provider, and only after you approve it (or turn on automatic sending). Your Zimbra content is never sent anywhere.
```

(g) Add rows to the Troubleshooting table, after the "Scheduled digest did not run" row (line 114):

old:
```
| Scheduled digest did not run | The app must be running at the due time. Missed items are offered on next launch. |
```
new:
```
| Scheduled digest did not run | The app must be running at the due time. Missed items are offered on next launch. |
| "Local AI is not running." | Install Ollama from <https://ollama.com/download> and start it, then **Save and check** in Settings. If Ollama is on another port or machine, change the server address. |
| "Model not installed." | Run the command Settings shows, for example `ollama pull qwen2.5:3b-instruct`, then check again. |
| "The local model took too long to answer." | The first run after a pause loads the model and can be slow. Try again, or pick a smaller model. |
| "AI was not used for this digest." | The banner says why. The digest was built with the built-in text rules. Fix the cause and click **Regenerate**. |
| The cloud dialog never appears | You have no fallback provider or key saved, so the app goes straight to the built-in rules. |
```

(h) Known limits (line 179):

old:
```
- The Groq model name and its JSON mode have not been checked against Groq's current model list.
```
new:
```
- The Groq model name and its JSON mode have not been checked against Groq's current model list.
- Small local models can phrase things oddly or add context a keyword only hints at. Read the report before sending.
- To compare models on your own notes, run `node scripts/try-local.mjs notes.json qwen2.5:3b-instruct qwen2.5:7b-instruct` (needs Ollama running).
```

- [ ] **Step 4: Append manual checks to `docs/verification-checklist.md`**

Read the file, then add this section at the end:

```
## Local AI and cloud fallback (v1.2)

Manual checks against a real Ollama (not covered by unit tests):

- [ ] Ollama running with `qwen2.5:3b-instruct` pulled: Settings > Local AI > Save and check shows **Ready**
- [ ] Generate: report appears, no banner above it
- [ ] Quit Ollama, Settings > Save and check shows **Not running** with install guidance
- [ ] Quit Ollama, no fallback provider: Generate gives a digest with the warning banner "AI was not used for this digest."
- [ ] Quit Ollama, Groq key saved, ask-each-time: dialog shows the reason and the sanitised text; **Use plain template** produces the warning banner; **Send to Groq** produces "Generated by Groq (cloud)."
- [ ] Notes containing an email, a link, your name and a phone number: none appear in the dialog preview, all are restored in the report
- [ ] Notes containing `password: x`: dialog never appears, banner says the notes will not be sent
- [ ] Settings > Cloud fallback > Recent cloud sends lists the send with no content
- [ ] Model name set to `gpt-oss:120b-cloud`: warning shown
- [ ] Server address set to another machine: warning shown
- [ ] Open the app with an old settings file: Gemini or Groq appears as the fallback provider, set to ask each time
```

- [ ] **Step 5: Run the whole suite and the build**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 6: Run the end-to-end smoke test**

Run: `npm run e2e`
Expected: PASS. In test mode (`DD_TEST`) the main process's `fetch` always rejects, so generation falls back to the built-in rules and never contacts Ollama. If a spec asserts on exact page text that now includes the "AI was not used" banner, adjust that assertion in `tests/e2e/smoke.spec.mjs` (the banner is expected behaviour).

- [ ] **Step 7: Commit**

```powershell
git add scripts/try-local.mjs README.md docs/verification-checklist.md .gitignore tests/e2e/smoke.spec.mjs
git commit -m "docs: document local AI setup and add model comparison script" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

(Drop `tests/e2e/smoke.spec.mjs` from `git add` if it was not changed.)

- [ ] **Step 8: Live check with the real Ollama (manual, needs the user)**

Run: `ollama pull qwen2.5:3b-instruct`
Run: `node scripts/try-local.mjs`
Expected: a printed digest with `source: local` and one formal sentence per example note. If Node reports a module-type error, run `node --experimental-default-type=module scripts/try-local.mjs`.

Ask the user for two or three real daily notes (personal details removed), save them as `notes.json`, then run:

```powershell
node scripts/try-local.mjs notes.json qwen2.5:3b-instruct qwen2.5:7b-instruct
```

Compare the two outputs for invented facts and for time taken. Keep `qwen2.5:3b-instruct` as the default unless the 7B output is clearly better and the extra seconds are acceptable; if the default changes, update `DEFAULT_LOCAL.model` in `src/shared/ai.js`, the expectations in `tests/unit/shared/ai.test.js` and `tests/unit/main/store.ai.test.js`, and the README.

Then walk through the new section of `docs/verification-checklist.md` in the running app (`npm run dev`) and tick the boxes.

---

## Self-review

**Spec coverage.** Runtime and defaults: Tasks 1, 3. Failure codes and 120 s timeout: Task 2. Single fallback provider, no chain: Task 4 (`cloudFor`). Ask-each-time, opt-in automatic, persistent label: Tasks 4 and 6. Sanitising (block list, placeholders, name terms, restore, 8000 cap): Task 1. Audit log without content: Tasks 3 and 4, shown in Task 7. Plain-template fallback with reason: Task 4, banner in Task 6. Status check and onboarding text: Tasks 2, 7, 8. `-cloud` and non-loopback warnings: Tasks 1 and 7. Migration of old settings: Task 3. Main process decides AI settings: Task 5. Test-mode network guard: Task 5. README, `.gitignore` for `HANDOFF.md`, model comparison: Task 8.

**Placeholders.** None: every code step has the code, every edit has old and new text.

**Type consistency.** `generate` result shape (`status`, `source`, `note`, `blocks`; `provider`, `failure`, `preview`) is defined in Task 4 and read in Task 6 (`r.status`, `r.source`, `r.note`, `r.blocks`, `cloudAsk = r`). `testConnection(provider, geminiModel)` is called that way in Task 5. `localStatus(local)` takes the stored `ai.local` in Task 5. `audit.record({provider, reason, chars})` matches Task 3. `settings.ai` shape is identical in Tasks 3, 4, 5, 7.

**Known risks.** Ollama's `/v1` JSON mode (`response_format`) and `/v1/models` are relied on; Task 8 step 8 checks them against a real Ollama. The phone and token patterns can over- or under-match on unusual notes; the preview dialog makes the result visible before anything is sent.
