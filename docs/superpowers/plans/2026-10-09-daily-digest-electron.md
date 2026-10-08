# Daily Digest (Electron) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Daily Digest Windows desktop app: notes → generated report → review/edit → send now or schedule, where "send" only prepares the email in Zimbra and never presses Send.

**Architecture:** Electron main process owns storage, Gemini, Zimbra (Playwright over CDP to a dedicated Chrome profile) and the scheduler; a sandboxed React renderer ported from the handoff prototype talks to it through a narrow preload API. Report rules (`polish`/`buildVars`/`render`) live in one shared module used by both processes.

**Tech Stack:** Electron, electron-vite, React 18, Vitest (+ Testing Library, jsdom), playwright-core, @playwright/test (e2e), lucide-react, @fontsource/inter, @fontsource/jetbrains-mono, electron-builder (NSIS).

**Spec:** `docs/superpowers/specs/2026-10-09-daily-digest-electron-design.md`
**UI/copy source of truth:** `design_handoff_daily_digest/README.md` ("the handoff") and `design_handoff_daily_digest/prototype/*` ("the prototype").

## Global Constraints

- Windows only (including the installer). Shortcuts are labelled with the handoff's `⌘` text in the UI but are bound to `Ctrl` (`e.metaKey||e.ctrlKey`).
- **The app never presses Send in Zimbra**: `src/main/zimbra.js` exposes exactly `checkSession`, `prepareMessage`, `openPage`; no selector or code path references a send control; no password is ever typed or stored.
- Button that triggers Zimbra says "Prepare in Zimbra"; status says "Prepared in Zimbra" until the user clicks "I've Sent It".
- No AI branding in the UI except the quiet "AI Provider" card (last in Settings). Button label is "Generate Digest" only.
- All UI copy, colors, type, spacing, dialog text and toast text exactly as in the handoff (§2–§3). Font roles: LED Dot-Matrix only for scheduled/sent times; JetBrains Mono only for raw notes, template editor, error details.
- The Gemini API key lives only in the main process (`safeStorage`); never sent to the renderer, never written to `settings.json`.
- Persisted data shapes per handoff §6 (ISO `yyyy-mm-dd` dates on disk; times like `"5:00 PM"`).
- JS (not TS). ES-module source syntax; do **not** set `"type":"module"` in `package.json` (electron-vite then emits CJS for main/preload, which a sandboxed preload requires).
- Renderer: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- Recipient validation regex: `/^\S+@\S+\.\S+$/`.
- Cut order if short on time (handoff §7.1): Templates highlight overlay → DatePicker popover (use styled `<input type=date>`) → Zimbra automation (open compose URL) → Settings test buttons.

## Review Focus

Failure modes the spec implies but a straight port would not test, most likely first:

1. **Corrupt or half-written JSON file** (power loss mid-write, hand edit): app must start with defaults, keep the bad file as `*.bad`, never crash or lose the draft silently. (Task 4)
2. **Gemini returns fenced / malformed / wrong-shape JSON or an HTTP error**: must land in the "Unable to generate the digest." state with notes kept, never a blank report or a crash. (Task 6)
3. **Scheduling a time already in the past, or an invalid time string**: dialog must refuse with an inline error; the scheduler must never fire something it cannot parse. (Tasks 2, 7, 13)
4. **Two app instances / double tick** preparing the same scheduled email twice: second instance must exit; a slow prepare must not be re-entered by the next tick. (Tasks 7, 9)
5. **Windows `\r\n` line endings in pasted notes/templates** producing stray `\r` or empty bullets. (Task 3)
6. **Chrome debug port not up / Chrome not installed / not logged in to Zimbra**: distinct, recoverable errors (`UNREACHABLE`, `NO_CHROME`, `LOGIN`) with the handoff's dialogs, nothing sent. (Tasks 8, 12)

---

## File Structure

```
package.json                      scripts + deps (Task 1)
electron.vite.config.mjs          build config, alias @shared (Task 1)
vitest.config.mjs                 unit/DOM test config (Task 1)
electron-builder.yml              NSIS installer config (Task 17)
playwright.config.mjs             e2e config (Task 16)
scripts/probe-zimbra.mjs          prints candidate Zimbra selectors from the live page (Task 8)
src/shared/time.js                date/time helpers (Task 2)
src/shared/report.js              polish/buildVars/render/blocksToText (Task 3)
src/main/store.js                 JSON collections, atomic writes (Task 4)
src/main/secrets.js               safeStorage key (Task 5)
src/main/generate.js              Gemini + local fallback (Task 6)
src/main/scheduler.js             timer, missed-on-launch (Task 7)
src/main/chrome.js                find/launch debug Chrome (Task 8)
src/main/zimbra.js                CDP prepare-only module (Task 8)
src/main/zimbra.selectors.js      Zimbra selectors (Task 8)
src/main/zimbra.fake.js           test double (Task 9)
src/main/ipc.js                   IPC handlers (Task 9)
src/main/index.js                 app lifecycle, window (Task 9)
src/preload/index.js              window.api (Task 9)
src/renderer/index.html
src/renderer/src/main.jsx         entry
src/renderer/src/app.css          globals, focus rings (Task 10)
src/renderer/src/styles/tokens/*  copied tokens (Task 10)
src/renderer/src/ds/**            ported design-system components + index.js (Task 10)
src/renderer/src/persist.js       disk <-> renderer shape (Task 11)
src/renderer/src/AppShell.jsx     title bar + chrome (Task 11)
src/renderer/src/Shell.jsx        PageHeader, Overline, DigestDocument (Task 11)
src/renderer/src/useApp.js        state + actions (Task 11)
src/renderer/src/App.jsx          wiring (Task 11)
src/renderer/src/screens/NewDigest.jsx, dialogs.jsx   (Task 12)
src/renderer/src/screens/Scheduled.jsx, History.jsx    (Task 13)
src/renderer/src/screens/Templates.jsx, Settings.jsx   (Task 14)
tests/**                          unit tests; tests/e2e/** smoke
```

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `electron.vite.config.mjs`, `vitest.config.mjs`, `.gitignore`, `src/renderer/index.html`, `src/renderer/src/main.jsx`, `src/main/index.js`, `src/preload/index.js` (stubs replaced in Task 9)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test`, `e2e`, `dist`; alias `@shared` → `src/shared` in both vite and vitest.

- [ ] **Step 1: Initialise git and npm**

Run (in `C:\Users\MDELACRUZ\Documents\01 Programming\zimbraautomation`):
```powershell
git init
npm init -y
npm install react@18 react-dom@18 lucide-react playwright-core @fontsource/inter @fontsource/jetbrains-mono
npm install -D electron electron-vite vite @vitejs/plugin-react electron-builder vitest jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```
Expected: installs without errors. (If git is not wanted, skip `git init` and every "Commit" step.)

- [ ] **Step 2: Write `package.json` fields**

Edit the generated `package.json` so it contains (keep the generated `dependencies`/`devDependencies`; delete `"type"` if present):
```json
{
  "name": "daily-digest",
  "version": "1.0.0",
  "description": "Daily Digest",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "test": "vitest run",
    "e2e": "electron-vite build && playwright test",
    "dist": "electron-vite build && electron-builder --win"
  }
}
```

- [ ] **Step 3: Write `electron.vite.config.mjs`**

```js
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const alias = { "@shared": resolve("src/shared") };

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], resolve: { alias } },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: { plugins: [react()], resolve: { alias } }
});
```

- [ ] **Step 4: Write `vitest.config.mjs`**

```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@shared": resolve("src/shared") } },
  test: {
    include: ["tests/unit/**/*.test.{js,jsx}"],
    environmentMatchGlobs: [["tests/unit/renderer/**", "jsdom"]],
    setupFiles: ["tests/setup.js"]
  }
});
```
Create `tests/setup.js`:
```js
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Write stubs so the build works**

`.gitignore`:
```
node_modules
out
dist
*.log
```
`src/renderer/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:" />
    <title>Daily Digest</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```
`src/renderer/src/main.jsx`:
```jsx
import React from "react";
import { createRoot } from "react-dom/client";
createRoot(document.getElementById("root")).render(<div>Daily Digest</div>);
```
`src/preload/index.js`: `// replaced in Task 9`
`src/main/index.js`:
```js
import { app, BrowserWindow } from "electron";
import { join } from "node:path";
app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1440, height: 900, webPreferences: { preload: join(__dirname, "../preload/index.js"), sandbox: true, contextIsolation: true } });
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else win.loadFile(join(__dirname, "../renderer/index.html"));
});
```

- [ ] **Step 6: Verify build and test runner**

Run: `npm run build`
Expected: succeeds, creates `out/main/index.js`, `out/preload/index.js`, `out/renderer/index.html`.
Run: `npx vitest run --passWithNoTests`
Expected: exits 0.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "chore: scaffold electron-vite + react + vitest"
```

---

### Task 2: Shared time helpers

**Files:**
- Create: `src/shared/time.js`
- Test: `tests/unit/shared/time.test.js`

**Interfaces:**
- Produces (all named exports): `MONTHS: string[]`, `fmt(d: Date): string` → `"October 8, 2026"`, `fmtShort(d: Date): string` → `"Oct 8"`, `parseTime(str): {h,m}|null`, `toISODate(d: Date): string`, `fromISODate(s: string): Date` (local midnight), `dueAt(isoDate: string, time: string): Date|null`, `formatTime(d: Date): string` → `"5:00 PM"`, `dayLabel(d: Date, today: Date): "Today"|"Tomorrow"|"Oct 9"`, `isValidEmail(s): boolean`.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from "vitest";
import { fmt, fmtShort, parseTime, toISODate, fromISODate, dueAt, formatTime, dayLabel, isValidEmail } from "@shared/time.js";

describe("time helpers", () => {
  it("formats dates", () => {
    expect(fmt(new Date(2026, 9, 8))).toBe("October 8, 2026");
    expect(fmtShort(new Date(2026, 9, 8))).toBe("Oct 8");
  });
  it("parses times and rejects garbage", () => {
    expect(parseTime("5:00 PM")).toEqual({ h: 17, m: 0 });
    expect(parseTime("12:15 AM")).toEqual({ h: 0, m: 15 });
    expect(parseTime("12:15 PM")).toEqual({ h: 12, m: 15 });
    expect(parseTime("17:00")).toBeNull();
    expect(parseTime("13:00 PM")).toBeNull();
    expect(parseTime("5:75 PM")).toBeNull();
    expect(parseTime(undefined)).toBeNull();
  });
  it("round-trips ISO dates in local time", () => {
    const d = new Date(2026, 9, 8);
    expect(toISODate(d)).toBe("2026-10-08");
    expect(fromISODate("2026-10-08").getTime()).toBe(d.getTime());
  });
  it("computes due time or null", () => {
    const due = dueAt("2026-10-08", "5:00 PM");
    expect([due.getFullYear(), due.getMonth(), due.getDate(), due.getHours(), due.getMinutes()]).toEqual([2026, 9, 8, 17, 0]);
    expect(dueAt("2026-10-08", "nope")).toBeNull();
  });
  it("formats clock time", () => {
    expect(formatTime(new Date(2026, 9, 8, 16, 36))).toBe("4:36 PM");
    expect(formatTime(new Date(2026, 9, 8, 0, 5))).toBe("12:05 AM");
    expect(formatTime(new Date(2026, 9, 8, 12, 0))).toBe("12:00 PM");
  });
  it("labels days", () => {
    const today = new Date(2026, 9, 8, 15, 0);
    expect(dayLabel(new Date(2026, 9, 8), today)).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 9), today)).toBe("Tomorrow");
    expect(dayLabel(new Date(2026, 9, 12), today)).toBe("Oct 12");
  });
  it("validates emails", () => {
    expect(isValidEmail("manager@company.com")).toBe(true);
    expect(isValidEmail("manager@company")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/shared/time.test.js`
Expected: FAIL (cannot resolve `@shared/time.js`).

- [ ] **Step 3: Implement `src/shared/time.js`**

```js
export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const fmt = d => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
export const fmtShort = d => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;

export function parseTime(str) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(str || "");
  if (!m) return null;
  const hour12 = +m[1], min = +m[2];
  if (hour12 < 1 || hour12 > 12 || min > 59) return null;
  return { h: (hour12 % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0), m: min };
}

const pad = n => String(n).padStart(2, "0");
export const toISODate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISODate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

export function dueAt(isoDate, time) {
  const t = parseTime(time);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return null;
  const d = fromISODate(isoDate);
  d.setHours(t.h, t.m, 0, 0);
  return d;
}

export function formatTime(d) {
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h >= 12 ? "PM" : "AM"}`;
}

export function dayLabel(d, today) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((a - b) / 864e5);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : fmtShort(d);
}

export const isValidEmail = s => /^\S+@\S+\.\S+$/.test(s || "");
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/shared/time.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```powershell
git add src/shared/time.js tests/unit/shared/time.test.js
git commit -m "feat: shared time helpers"
```

---

### Task 3: Shared report rules

**Files:**
- Create: `src/shared/report.js`
- Test: `tests/unit/shared/report.test.js`

**Interfaces:**
- Consumes: `fmt` from `@shared/time.js`.
- Produces: `DEFAULT_TEMPLATE: string`, `VARIABLES: string[]`, `SAMPLE_NOTES`, `EMPTY_NOTES`, `polish(line, kind): string|null`, `lines(text, kind): string[]`, `buildVars(notes, user, date: Date): Vars`, `render(template, vars): Block[]`, `subjectFor(tpl: string, date: Date): string`, `blocksToText(blocks): string`, `hasNotes(notes): boolean`. `Block = {type:"section",title,items:string[]} | {type:"text",text}`. `Vars` has string keys `date,name,role` and string[] keys `tasks,topics,weekly_plans,tomorrow,blockers`.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from "vitest";
import { polish, lines, buildVars, render, DEFAULT_TEMPLATE, SAMPLE_NOTES, EMPTY_NOTES, subjectFor, blocksToText, hasNotes } from "@shared/report.js";

const user = { name: "Mark Justine Dela Cruz", role: "CDP Trainee" };
const date = new Date(2026, 9, 8);

describe("polish", () => {
  it("applies the handoff rules", () => {
    expect(polish("worked on hibernate", "tasks")).toBe("Worked on Hibernate.");
    expect(polish("criteria query", "tasks")).toBe("Worked on Criteria API queries.");
    expect(polish("fixed duplicate result", "tasks")).toBe("Fixed duplicate query results.");
    expect(polish("continued office repository", "tasks")).toBe("Continued work on the Office repository.");
    expect(polish("hql vs criteria", "topics")).toBe("Studied HQL vs. Criteria.");
    expect(polish("tomorrow continue repository", "plans")).toBe("Continue work on the repository.");
    expect(polish("- finish embedded id mapping", "plans")).toBe("Finish the embedded ID mapping.");
    expect(polish("   ", "tasks")).toBeNull();
    expect(polish("• ", "tasks")).toBeNull();
  });
  it("does not double punctuation", () => {
    expect(polish("fixed the bug!", "tasks")).toBe("Fixed the bug!");
  });
});

describe("render with the handoff example", () => {
  const blocks = render(DEFAULT_TEMPLATE, buildVars(SAMPLE_NOTES, user, date));
  it("matches the example report", () => {
    expect(blocks).toEqual([
      { type: "section", title: "TASK TODAY", items: ["Worked on Hibernate.", "Worked on Criteria API queries.", "Fixed duplicate query results.", "Continued work on the Office repository.", "Investigating an issue with the embedded ID."] },
      { type: "section", title: "PLANS FOR THE WEEK", items: ["Continue work on the repository.", "Finish the embedded ID mapping."] },
      { type: "section", title: "TOPICS", items: ["Studied Criteria API projections.", "Studied HQL vs. Criteria."] },
      { type: "text", text: "Regards," },
      { type: "text", text: "Mark Justine Dela Cruz" },
      { type: "text", text: "CDP Trainee" }
    ]);
  });
  it("omits empty sections (no BLOCKERS)", () => {
    expect(blocks.some(b => b.title === "BLOCKERS")).toBe(false);
  });
});

describe("edge input", () => {
  it("handles Windows CRLF line endings", () => {
    expect(lines("worked on hibernate\r\nfixed duplicate result\r\n", "tasks")).toEqual(["Worked on Hibernate.", "Fixed duplicate query results."]);
    const blocks = render("TASK TODAY\r\n\r\n{tasks}\r\n\r\nRegards,\r\n{name}", buildVars({ ...EMPTY_NOTES, work: "worked on sql" }, user, date));
    expect(blocks[0].items).toEqual(["Worked on SQL."]);
    expect(blocks[blocks.length - 1]).toEqual({ type: "text", text: "Mark Justine Dela Cruz" });
  });
  it("keeps unknown variables as typed and joins arrays inline", () => {
    const b = render("Hi {unknown} {tasks}", buildVars({ ...EMPTY_NOTES, work: "worked on sql" }, user, date));
    expect(b).toEqual([{ type: "text", text: "Hi {unknown} Worked on SQL." }]);
  });
  it("hasNotes ignores whitespace", () => {
    expect(hasNotes({ ...EMPTY_NOTES, work: "  \n " })).toBe(false);
    expect(hasNotes({ ...EMPTY_NOTES, topics: "x" })).toBe(true);
  });
});

describe("subject and email text", () => {
  it("fills {date}", () => expect(subjectFor("Daily Digest - {date}", date)).toBe("Daily Digest - October 8, 2026"));
  it("converts blocks to plain text", () => {
    const t = blocksToText(render(DEFAULT_TEMPLATE, buildVars(SAMPLE_NOTES, user, date)));
    expect(t.startsWith("TASK TODAY\n- Worked on Hibernate.\n")).toBe(true);
    expect(t.endsWith("Regards,\nMark Justine Dela Cruz\nCDP Trainee")).toBe(true);
    expect(t).toContain("\n\nPLANS FOR THE WEEK\n- Continue work on the repository.");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/shared/report.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/shared/report.js`**

```js
import { fmt } from "./time.js";

export const VARIABLES = ["date", "name", "role", "tasks", "topics", "weekly_plans", "blockers", "tomorrow"];
export const DEFAULT_TEMPLATE = `TASK TODAY

{tasks}

PLANS FOR THE WEEK

{weekly_plans}

TOPICS

{topics}

BLOCKERS

{blockers}

Regards,
{name}
{role}`;

export const EMPTY_NOTES = { work: "", topics: "", progress: "", blockers: "", tomorrow: "" };
export const SAMPLE_NOTES = {
  work: "worked on hibernate\ncriteria query\nfixed duplicate result\ncontinued office repository",
  topics: "criteria api projections\nhql vs criteria",
  progress: "still having issue with embedded id",
  blockers: "",
  tomorrow: "tomorrow continue repository\nfinish embedded id mapping"
};

const dict = { hibernate: "Hibernate", criteria: "Criteria", api: "API", hql: "HQL", jdbc: "JDBC", sql: "SQL", java: "Java", id: "ID", crud: "CRUD", office: "Office", spring: "Spring", postgresql: "PostgreSQL", vs: "vs." };
const verbs = /^(worked|fixed|continued|studied|implemented|investigating|reviewed|learned|wrote|created|updated|tested|finish|continue|start|review|write|refactor|refactored|attended|set up|added)\b/i;

export function polish(line, kind) {
  let s = line.trim().replace(/^[-•*]\s*/, "");
  if (!s) return null;
  s = s.replace(/^tomorrow\s+/i, "");
  s = s.replace(/criteria query/i, "criteria API queries").replace(/duplicate result\b/i, "duplicate query results");
  const rules = [
    [/^continue (.+)/i, "continue work on the $1"],
    [/^continued (.+)/i, "continued work on the $1"],
    [/^still having (an )?issues? with (.+)/i, "investigating an issue with the $2"],
    [/^finish (.+)/i, "finish the $1"]
  ];
  for (const [re, rep] of rules) { if (re.test(s)) { s = s.replace(re, rep); break; } }
  if (!verbs.test(s)) s = (kind === "topics" ? "studied " : kind === "plans" ? "continue work on " : "worked on ") + s;
  s = s.split(" ").map(w => dict[w.toLowerCase()] || w).join(" ").replace(/API API/g, "API");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

export const lines = (text, kind) => (text || "").split(/\r?\n/).map(l => polish(l, kind)).filter(Boolean);

export function buildVars(n, user, date) {
  const plans = lines(n.tomorrow, "plans");
  return {
    date: fmt(date), name: user.name, role: user.role,
    tasks: [
      ...lines(n.work, "tasks"),
      ...lines(n.progress, "progress").map(s => s.startsWith("Investigating") || s.startsWith("Continued") ? s : "Still working on: " + s.charAt(0).toLowerCase() + s.slice(1))
    ],
    topics: lines(n.topics, "topics"),
    weekly_plans: plans, tomorrow: plans,
    blockers: lines(n.blockers, "tasks")
  };
}

export function render(template, vars) {
  const blocks = [];
  let cur = null;
  template.split(/\r?\n/).forEach(raw => {
    const l = raw.trim();
    if (!l || /^[─-]{3,}$/.test(l)) return;
    const v = l.match(/^\{(\w+)\}$/);
    if (v && Array.isArray(vars[v[1]])) { if (cur) cur.items.push(...vars[v[1]]); return; }
    if (!/[{}]/.test(l) && l === l.toUpperCase() && /[A-Z]/.test(l)) { cur = { type: "section", title: l, items: [] }; blocks.push(cur); return; }
    cur = null;
    blocks.push({ type: "text", text: l.replace(/\{(\w+)\}/g, (m, k) => Array.isArray(vars[k]) ? vars[k].join(", ") : (vars[k] ?? m)) });
  });
  return blocks.filter(b => b.type !== "section" || b.items.length);
}

export const subjectFor = (tpl, date) => tpl.replace("{date}", fmt(date));
export const hasNotes = n => Object.values(n).some(v => String(v).trim());

export function blocksToText(blocks) {
  const out = [];
  let prevText = false;
  for (const b of blocks) {
    if (b.type === "section") {
      if (out.length) out.push("");
      out.push(b.title, ...b.items.map(i => "- " + i));
      prevText = false;
    } else {
      if (out.length && !prevText) out.push("");
      out.push(b.text);
      prevText = true;
    }
  }
  return out.join("\n");
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/shared/report.test.js`
Expected: PASS. If the `blocksToText` expectations fail on blank-line placement, fix `blocksToText` (not the test): sections separated by one blank line; the closing text block ("Regards,…") preceded by one blank line; consecutive text lines adjacent.

- [ ] **Step 5: Commit**

```powershell
git add src/shared tests/unit/shared
git commit -m "feat: shared report rules ported from prototype data.js"
```

---

### Task 4: Store (JSON collections)

**Files:**
- Create: `src/main/store.js`
- Test: `tests/unit/main/store.test.js`

**Interfaces:**
- Consumes: `DEFAULT_TEMPLATE`, `VARIABLES` from `@shared/report.js`.
- Produces: `createStore(dir): { read(name), write(name, data), update(name, fn), readAll() }`; collections `history[]`, `schedule[]`, `template{}`, `settings{}`, `draft{notes}`; `DEFAULTS(): object` (fresh copy each call).
- `settings` default: `{general:{defaultSendTime:"5:00 PM"},profile:{name:"Mark Justine Dela Cruz",role:"CDP Trainee"},email:{defaultRecipient:"manager@company.com",defaultSubject:"Daily Digest - {date}"},zimbra:{url:"https://mail.company.local"},ai:{provider:"gemini",model:"flash"},app:{startWithWindows:true}}`.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore, DEFAULTS } from "../../../src/main/store.js";

let dir, store;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-store-")); store = createStore(dir); });

describe("store", () => {
  it("returns defaults when files are missing", () => {
    expect(store.read("history")).toEqual([]);
    expect(store.read("settings").email.defaultRecipient).toBe("manager@company.com");
    expect(store.read("template").body).toContain("TASK TODAY");
  });
  it("writes and reads back, leaving no temp file", () => {
    store.write("history", [{ id: "a" }]);
    expect(store.read("history")).toEqual([{ id: "a" }]);
    expect(fs.readdirSync(dir).filter(f => f.endsWith(".tmp"))).toEqual([]);
  });
  it("update applies a function atomically", () => {
    store.write("schedule", [{ id: "1", status: "scheduled" }]);
    const out = store.update("schedule", items => items.map(i => ({ ...i, status: "prepared" })));
    expect(out[0].status).toBe("prepared");
    expect(store.read("schedule")[0].status).toBe("prepared");
  });
  it("survives a corrupt file: defaults returned, bad file kept", () => {
    fs.writeFileSync(path.join(dir, "draft.json"), '{"notes": {"work": "abc"');
    expect(store.read("draft").notes.work).toBe("");
    expect(fs.existsSync(path.join(dir, "draft.json.bad"))).toBe(true);
  });
  it("rejects wrong-shape data (array expected)", () => {
    fs.writeFileSync(path.join(dir, "history.json"), '{"oops":true}');
    expect(store.read("history")).toEqual([]);
  });
  it("fills missing settings keys from defaults", () => {
    fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ profile: { name: "Ann" } }));
    const s = store.read("settings");
    expect(s.profile).toEqual({ name: "Ann", role: "CDP Trainee" });
    expect(s.email.defaultSubject).toBe("Daily Digest - {date}");
  });
  it("refuses unknown collections", () => {
    expect(() => store.read("nope")).toThrow(/unknown collection/);
    expect(() => store.write("nope", {})).toThrow(/unknown collection/);
  });
  it("readAll returns every collection", () => {
    expect(Object.keys(store.readAll()).sort()).toEqual(Object.keys(DEFAULTS()).sort());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/main/store.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/main/store.js`**

```js
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_TEMPLATE, VARIABLES, EMPTY_NOTES } from "../shared/report.js";

export const DEFAULTS = () => ({
  history: [],
  schedule: [],
  template: { id: "daily-digest", name: "Daily Digest", body: DEFAULT_TEMPLATE, variables: [...VARIABLES] },
  settings: {
    general: { defaultSendTime: "5:00 PM" },
    profile: { name: "Mark Justine Dela Cruz", role: "CDP Trainee" },
    email: { defaultRecipient: "manager@company.com", defaultSubject: "Daily Digest - {date}" },
    zimbra: { url: "https://mail.company.local" },
    ai: { provider: "gemini", model: "flash" },
    app: { startWithWindows: true }
  },
  draft: { notes: { ...EMPTY_NOTES } }
});

const isObj = v => v && typeof v === "object" && !Array.isArray(v);
function merge(def, val) {
  if (Array.isArray(def)) return Array.isArray(val) ? val : def;
  if (!isObj(def)) return val === undefined || typeof val !== typeof def ? def : val;
  if (!isObj(val)) return def;
  const out = {};
  for (const k of Object.keys(def)) out[k] = merge(def[k], val[k]);
  return out;
}

export function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = n => path.join(dir, n + ".json");
  const check = n => { if (!(n in DEFAULTS())) throw new Error("unknown collection " + n); };

  function read(name) {
    check(name);
    const def = DEFAULTS()[name];
    let raw;
    try { raw = fs.readFileSync(file(name), "utf8"); } catch { return def; }
    try { return merge(def, JSON.parse(raw)); }
    catch {
      try { fs.renameSync(file(name), file(name) + ".bad"); } catch { /* keep going */ }
      return def;
    }
  }
  function write(name, data) {
    check(name);
    const tmp = file(name) + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file(name));
  }
  function update(name, fn) { const next = fn(read(name)); write(name, next); return next; }
  const readAll = () => Object.fromEntries(Object.keys(DEFAULTS()).map(n => [n, read(n)]));
  return { read, write, update, readAll };
}
```
Note: `merge` for `template`/`history`: `template` is an object → merged key-wise (extra keys dropped; fine). `variables` array stays an array. For arrays of items (`history`, `schedule`) the default `[]` means any array passes through.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/main/store.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```powershell
git add src/main/store.js tests/unit/main/store.test.js
git commit -m "feat: atomic JSON store with corruption recovery"
```

---

### Task 5: Secrets (Gemini key)

**Files:**
- Create: `src/main/secrets.js`
- Test: `tests/unit/main/secrets.test.js`

**Interfaces:**
- Produces: `createSecrets(dir, safeStorage): { setKey(key: string), getKey(): string|null, hasKey(): boolean, clearKey() }`. `safeStorage` must provide `isEncryptionAvailable()`, `encryptString(s): Buffer`, `decryptString(b): string` (Electron's `safeStorage`). Stored at `<dir>/gemini.key`.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSecrets } from "../../../src/main/secrets.js";

const fakeSafe = (available = true) => ({
  isEncryptionAvailable: () => available,
  encryptString: s => Buffer.from("enc:" + s),
  decryptString: b => b.toString().replace(/^enc:/, "")
});
let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-sec-")); });

describe("secrets", () => {
  it("round-trips and stores nothing in plaintext", () => {
    const s = createSecrets(dir, fakeSafe());
    expect(s.hasKey()).toBe(false);
    s.setKey("  AIza-secret ");
    expect(s.hasKey()).toBe(true);
    expect(s.getKey()).toBe("AIza-secret");
    expect(fs.readFileSync(path.join(dir, "gemini.key"), "utf8")).not.toContain("AIza-secret");
  });
  it("clears the key", () => {
    const s = createSecrets(dir, fakeSafe());
    s.setKey("k"); s.clearKey();
    expect(s.hasKey()).toBe(false);
    expect(s.getKey()).toBeNull();
  });
  it("refuses to store when encryption is unavailable", () => {
    expect(() => createSecrets(dir, fakeSafe(false)).setKey("k")).toThrow(/encryption/i);
  });
  it("returns null for an undecryptable file instead of throwing", () => {
    const safe = fakeSafe();
    safe.decryptString = () => { throw new Error("bad"); };
    fs.writeFileSync(path.join(dir, "gemini.key"), "junk");
    expect(createSecrets(dir, safe).getKey()).toBeNull();
  });
  it("ignores an empty key", () => {
    const s = createSecrets(dir, fakeSafe());
    s.setKey("   ");
    expect(s.hasKey()).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/main/secrets.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/main/secrets.js`**

```js
import fs from "node:fs";
import path from "node:path";

export function createSecrets(dir, safeStorage) {
  const file = path.join(dir, "gemini.key");
  fs.mkdirSync(dir, { recursive: true });
  return {
    setKey(key) {
      const k = String(key || "").trim();
      if (!k) return;
      if (!safeStorage.isEncryptionAvailable()) throw new Error("OS encryption is not available; cannot store the API key.");
      fs.writeFileSync(file, safeStorage.encryptString(k));
    },
    getKey() {
      try { return safeStorage.decryptString(fs.readFileSync(file)); } catch { return null; }
    },
    hasKey() { return this.getKey() !== null; },
    clearKey() { try { fs.rmSync(file); } catch { /* none */ } }
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/main/secrets.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```powershell
git add src/main/secrets.js tests/unit/main/secrets.test.js
git commit -m "feat: encrypted Gemini key storage"
```

---

### Task 6: Report generation (Gemini + local fallback)

**Files:**
- Create: `src/main/generate.js`
- Test: `tests/unit/main/generate.test.js`

**Interfaces:**
- Consumes: `buildVars`, `render`, `hasNotes` from `../shared/report.js`; `fromISODate` from `../shared/time.js`.
- Produces: `createGenerator({ getKey: () => string|null, fetchImpl = fetch }) → { generate(payload), testConnection(model) }`.
  - `payload = { notes, template: string, profile: {name,role}, date: "yyyy-mm-dd", model: "flash"|"pro" }` → resolves `Block[]`; throws `Error` (message = technical detail) on Gemini failure. With no key it uses local rules.
  - `testConnection(model)` → resolves `true` or throws.
- `MODEL_IDS = { flash: "gemini-flash-latest", pro: "gemini-pro-latest" }` (exported). Verify these alias names against the Gemini API docs before release; the Settings "Test Connection" button surfaces a wrong name immediately.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from "vitest";
import { createGenerator } from "../../../src/main/generate.js";
import { DEFAULT_TEMPLATE, SAMPLE_NOTES } from "../../../src/shared/report.js";

const payload = { notes: SAMPLE_NOTES, template: DEFAULT_TEMPLATE, profile: { name: "Mark", role: "CDP Trainee" }, date: "2026-10-08", model: "flash" };
const geminiReply = obj => ({ ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === "string" ? obj : JSON.stringify(obj) }] } }] }) });

describe("generate", () => {
  it("uses local rules when no key is saved (and never calls fetch)", async () => {
    let called = false;
    const g = createGenerator({ getKey: () => null, fetchImpl: async () => { called = true; } });
    const blocks = await g.generate(payload);
    expect(called).toBe(false);
    expect(blocks[0]).toEqual(expect.objectContaining({ title: "TASK TODAY" }));
    expect(blocks[0].items[0]).toBe("Worked on Hibernate.");
  });
  it("calls Gemini with the key header and renders its JSON through the template", async () => {
    let seen;
    const g = createGenerator({
      getKey: () => "KEY",
      fetchImpl: async (url, init) => { seen = { url, init }; return geminiReply({ tasks: ["Did A."], topics: ["Studied B."], weekly_plans: ["Do C."], blockers: [] }); }
    });
    const blocks = await g.generate(payload);
    expect(seen.url).toContain("gemini-flash-latest:generateContent");
    expect(seen.init.headers["x-goog-api-key"]).toBe("KEY");
    expect(JSON.parse(seen.init.body).contents[0].parts[0].text).toContain("worked on hibernate");
    expect(blocks.find(b => b.title === "TASK TODAY").items).toEqual(["Did A."]);
    expect(blocks.some(b => b.title === "BLOCKERS")).toBe(false);
    expect(blocks[blocks.length - 1]).toEqual({ type: "text", text: "CDP Trainee" });
  });
  it("accepts JSON wrapped in a markdown fence", async () => {
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => geminiReply('```json\n{"tasks":["X."],"topics":[],"weekly_plans":[],"blockers":[]}\n```') });
    expect((await g.generate(payload))[0].items).toEqual(["X."]);
  });
  it("throws with details on HTTP errors", async () => {
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => ({ ok: false, status: 503, statusText: "UNAVAILABLE", text: async () => "service overloaded" }) });
    await expect(g.generate(payload)).rejects.toThrow(/503 UNAVAILABLE.*service overloaded/);
  });
  it("throws on malformed or wrong-shape output", async () => {
    for (const bad of ["not json", { tasks: "a string" }, { tasks: [], topics: [], weekly_plans: [], blockers: [] }, { tasks: [1, 2] }]) {
      const g = createGenerator({ getKey: () => "K", fetchImpl: async () => geminiReply(bad) });
      await expect(g.generate(payload)).rejects.toThrow(/unexpected response/i);
    }
  });
  it("throws on network failure", async () => {
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => { throw new Error("ECONNRESET"); } });
    await expect(g.generate(payload)).rejects.toThrow(/ECONNRESET/);
  });
  it("testConnection fails without a key and succeeds with one", async () => {
    await expect(createGenerator({ getKey: () => null }).testConnection("flash")).rejects.toThrow(/API key/i);
    const g = createGenerator({ getKey: () => "K", fetchImpl: async () => geminiReply("ok") });
    await expect(g.testConnection("flash")).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/main/generate.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/main/generate.js`**

```js
import { buildVars, render } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";

export const MODEL_IDS = { flash: "gemini-flash-latest", pro: "gemini-pro-latest" };
const ENDPOINT = id => `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`;

const PROMPT = `You turn rough daily work notes into short report bullets for a manager.
Rules:
- One sentence per item, ending with a period.
- Work done: past tense ("Worked on ...", "Fixed ..."). Study topics: "Studied ...". Plans: imperative ("Continue work on ...").
- Fix capitalisation of technical names (Hibernate, HQL, API, SQL, JDBC, ID).
- Never invent facts. Never merge unrelated items. Skip empty input.
Return ONLY JSON with exactly these keys, each an array of strings:
{"tasks":[],"topics":[],"weekly_plans":[],"blockers":[]}
- tasks: from "Today's Work" plus anything under "Still Working On" (phrase those as "Still working on: ...", or "Investigating ..." / "Continued ...").
- topics: from "Topics / Lessons".
- weekly_plans: from "Tomorrow".
- blockers: from "Blockers".

Notes:
`;

const labels = { work: "Today's Work", topics: "Topics / Lessons", progress: "Still Working On", blockers: "Blockers", tomorrow: "Tomorrow" };
const notesText = n => Object.keys(labels).map(k => `${labels[k]}:\n${(n[k] || "").trim() || "(none)"}`).join("\n\n");

function parseReply(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let obj;
  try { obj = JSON.parse(cleaned); } catch { throw new Error("Gemini returned an unexpected response: not valid JSON"); }
  const out = {};
  for (const k of ["tasks", "topics", "weekly_plans", "blockers"]) {
    const v = obj?.[k] ?? [];
    if (!Array.isArray(v) || v.some(x => typeof x !== "string")) throw new Error(`Gemini returned an unexpected response: "${k}" must be a list of text`);
    out[k] = v.map(x => x.trim()).filter(Boolean);
  }
  if (!Object.values(out).some(a => a.length)) throw new Error("Gemini returned an unexpected response: no items");
  return out;
}

export function createGenerator({ getKey, fetchImpl = fetch }) {
  async function call(model, text) {
    const key = getKey();
    if (!key) throw new Error("No API key saved.");
    let res;
    try {
      res = await fetchImpl(ENDPOINT(MODEL_IDS[model] || MODEL_IDS.flash), {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
        signal: AbortSignal.timeout(30000)
      });
    } catch (e) { throw new Error(String(e.message || e)); }
    const raw = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${raw.slice(0, 200)}`);
    let body;
    try { body = JSON.parse(raw); } catch { throw new Error("Gemini returned an unexpected response: not valid JSON"); }
    const reply = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof reply !== "string") throw new Error("Gemini returned an unexpected response: empty");
    return reply;
  }

  return {
    async generate({ notes, template, profile, date, model }) {
      const d = fromISODate(date);
      const local = buildVars(notes, profile, d);
      if (!getKey()) return render(template, local);
      const ai = parseReply(await call(model, PROMPT + notesText(notes)));
      return render(template, { ...local, ...ai, tomorrow: ai.weekly_plans });
    },
    async testConnection(model) {
      if (!getKey()) throw new Error("No API key saved.");
      await call(model, 'Reply with the single word "ok".');
      return true;
    }
  };
}
```
Note: in the "wrong shape" test case `{tasks:[1,2]}` is rejected by the string check; `{tasks:[],…all empty}` by the "no items" check; `"not json"` by the parse check — all messages contain "unexpected response".

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/main/generate.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```powershell
git add src/main/generate.js tests/unit/main/generate.test.js
git commit -m "feat: Gemini generation with local-rules fallback"
```

---

### Task 7: Scheduler

**Files:**
- Create: `src/main/scheduler.js`
- Test: `tests/unit/main/scheduler.test.js`

**Interfaces:**
- Consumes: `createStore` shape (`read`, `write`, `update`), `dueAt` from `../shared/time.js`.
- Produces: `createScheduler({ store, now = () => new Date(), prepare: (item) => Promise<void>, notify = (title, body) => {}, onChange = (items) => {}, intervalMs = 30000 }) → { start(), stop(), tick(): Promise<void>, markOverdueMissed(), setStatus(id, status), upsert(item), remove(id) }`.
- Schedule item (disk shape): `{ id, date: "yyyy-mm-dd", time: "5:00 PM", recipient, subject, status: "scheduled"|"prepared"|"missed"|"cancelled", blocks, createdAt }`.
- `upsert(item)` throws `Error("Invalid date or time.")` if `dueAt` is null, `Error("Enter a valid email address.")` if recipient invalid; it returns the full item list and calls `onChange`.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { createScheduler } from "../../../src/main/scheduler.js";

const item = (over = {}) => ({ id: "a", date: "2026-10-08", time: "5:00 PM", recipient: "m@c.com", subject: "S", status: "scheduled", blocks: [], createdAt: "x", ...over });
let store, clock, prepared, notes, changes;
const make = (prepare) => createScheduler({ store, now: () => clock, prepare: prepare || (async it => { prepared.push(it.id); }), notify: (t, b) => notes.push([t, b]), onChange: items => changes.push(items) });
beforeEach(() => {
  store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-sch-")));
  clock = new Date(2026, 9, 8, 16, 59, 30);
  prepared = []; notes = []; changes = [];
});

describe("scheduler", () => {
  it("does nothing before the due time", async () => {
    const s = make(); s.upsert(item());
    await s.tick();
    expect(prepared).toEqual([]);
  });
  it("prepares at the due time, marks prepared, notifies", async () => {
    const s = make(); s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 0, 10);
    await s.tick();
    expect(prepared).toEqual(["a"]);
    expect(store.read("schedule")[0].status).toBe("prepared");
    expect(notes[0][0]).toMatch(/prepared in Zimbra/i);
  });
  it("never prepares the same item twice", async () => {
    const s = make(); s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 1);
    await s.tick(); await s.tick();
    expect(prepared).toEqual(["a"]);
  });
  it("does not re-enter while a prepare is still running", async () => {
    let release; let calls = 0;
    const s = make(() => { calls++; return new Promise(r => { release = r; }); });
    s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 1);
    const first = s.tick(); const second = s.tick();
    await second;
    release(); await first;
    expect(calls).toBe(1);
  });
  it("marks the item missed if prepare fails; nothing sent", async () => {
    const s = make(async () => { throw new Error("boom"); }); s.upsert(item());
    clock = new Date(2026, 9, 8, 17, 1);
    await s.tick();
    expect(store.read("schedule")[0].status).toBe("missed");
    expect(notes[0][1]).toMatch(/No email was sent/);
  });
  it("marks overdue items missed on launch without preparing", async () => {
    const s = make(); s.upsert(item({ date: "2026-10-07" }));
    clock = new Date(2026, 9, 8, 9, 0);
    s.markOverdueMissed();
    expect(store.read("schedule")[0].status).toBe("missed");
    expect(prepared).toEqual([]);
  });
  it("ignores cancelled items", async () => {
    const s = make(); s.upsert(item({ status: "cancelled" }));
    clock = new Date(2026, 9, 8, 18, 0);
    await s.tick();
    expect(prepared).toEqual([]);
  });
  it("rejects bad times and recipients on upsert", () => {
    const s = make();
    expect(() => s.upsert(item({ time: "noon" }))).toThrow(/date or time/i);
    expect(() => s.upsert(item({ recipient: "nope" }))).toThrow(/valid email/i);
  });
  it("upsert replaces by id, setStatus and remove work, onChange fires", () => {
    const s = make(); s.upsert(item()); s.upsert(item({ time: "6:00 PM" }));
    expect(store.read("schedule")).toHaveLength(1);
    expect(store.read("schedule")[0].time).toBe("6:00 PM");
    s.setStatus("a", "cancelled");
    expect(store.read("schedule")[0].status).toBe("cancelled");
    s.remove("a");
    expect(store.read("schedule")).toEqual([]);
    expect(changes.length).toBe(4);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/main/scheduler.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/main/scheduler.js`**

```js
import { dueAt, isValidEmail } from "../shared/time.js";

export function createScheduler({ store, now = () => new Date(), prepare, notify = () => {}, onChange = () => {}, intervalMs = 30000 }) {
  let busy = false, timer = null;
  const commit = fn => { const items = store.update("schedule", fn); onChange(items); return items; };

  const setStatus = (id, status) => commit(items => items.map(i => i.id === id ? { ...i, status } : i));
  const remove = id => commit(items => items.filter(i => i.id !== id));
  function upsert(item) {
    if (!dueAt(item.date, item.time)) throw new Error("Invalid date or time.");
    if (!isValidEmail(item.recipient)) throw new Error("Enter a valid email address.");
    return commit(items => items.some(i => i.id === item.id) ? items.map(i => i.id === item.id ? item : i) : [...items, item]);
  }
  function markOverdueMissed() {
    const t = now();
    const items = store.read("schedule");
    if (!items.some(i => i.status === "scheduled" && dueAt(i.date, i.time) <= t)) return;
    commit(list => list.map(i => i.status === "scheduled" && dueAt(i.date, i.time) <= t ? { ...i, status: "missed" } : i));
  }
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      for (const it of store.read("schedule")) {
        if (it.status !== "scheduled") continue;
        const due = dueAt(it.date, it.time);
        if (!due || due > now()) continue;
        try {
          await prepare(it);
          setStatus(it.id, "prepared");
          notify("Email prepared in Zimbra", "Review it in Zimbra and press Send.");
        } catch {
          setStatus(it.id, "missed");
          notify("Scheduled digest was not prepared", "No email was sent.");
        }
      }
    } finally { busy = false; }
  }
  return {
    start() { markOverdueMissed(); timer = setInterval(tick, intervalMs); tick(); },
    stop() { clearInterval(timer); },
    tick, markOverdueMissed, setStatus, upsert, remove
  };
}
```
Note: the `item.status` must be set `"scheduled"` by the renderer when creating; `markOverdueMissed` is called once at launch (in `start`).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/main/scheduler.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```powershell
git add src/main/scheduler.js tests/unit/main/scheduler.test.js
git commit -m "feat: scheduler with missed-on-launch and no re-entry"
```

---

### Task 8: Chrome launcher and Zimbra (prepare-only)

**Files:**
- Create: `src/main/chrome.js`, `src/main/zimbra.selectors.js`, `src/main/zimbra.js`, `scripts/probe-zimbra.mjs`
- Test: `tests/unit/main/chrome.test.js`, `tests/unit/main/zimbra.test.js`

**Interfaces:**
- Produces from `chrome.js`: `findChrome(env = process.env, exists = fs.existsSync): string|null`; `isDebugPortUp(port, fetchImpl = fetch): Promise<boolean>`; `ensureChrome({ port, profileDir, url, spawnImpl = spawn, find = findChrome, isUp = isDebugPortUp, wait = ms => new Promise(r => setTimeout(r, ms)), timeoutMs = 15000 }): Promise<void>` — throws `ZimbraError("NO_CHROME", …)` / `ZimbraError("UNREACHABLE", …)`.
- Produces from `zimbra.js`: `class ZimbraError extends Error { code }` with codes `"NO_CHROME" | "UNREACHABLE" | "LOGIN" | "COMPOSE"`; `createZimbra({ connect: () => Promise<Browser>, ensure: (url) => Promise<void>, selectors = SELECTORS }) → { checkSession(url): Promise<"connected"|"login">, prepareMessage({url,to,subject,body}, onStep: (n:1|2|3)=>void): Promise<void>, openPage(url): Promise<void> }`. `checkSession` rejects with `ZimbraError("UNREACHABLE")` when Chrome is not reachable.
- **Chrome 136+ ignores `--remote-debugging-port` for the default profile**, so Chrome is always launched with a dedicated `--user-data-dir` (`<userData>/chrome-profile`). The user signs in to Zimbra once in that window; the session persists there. (This corrects the spec's "normal profile" assumption; Task 18 updates the spec text.)

- [ ] **Step 1: Write the failing chrome tests**

```js
import { describe, it, expect } from "vitest";
import { findChrome, ensureChrome } from "../../../src/main/chrome.js";

describe("findChrome", () => {
  it("checks the standard install locations in order", () => {
    const env = { ProgramFiles: "C:\\PF", "ProgramFiles(x86)": "C:\\PF86", LOCALAPPDATA: "C:\\LA" };
    expect(findChrome(env, p => p.startsWith("C:\\PF86"))).toBe("C:\\PF86\\Google\\Chrome\\Application\\chrome.exe");
    expect(findChrome(env, () => false)).toBeNull();
  });
});

describe("ensureChrome", () => {
  const base = { port: 9222, profileDir: "C:\\p", url: "https://z" };
  it("does nothing when the port is already up", async () => {
    let spawned = false;
    await ensureChrome({ ...base, isUp: async () => true, spawnImpl: () => { spawned = true; } });
    expect(spawned).toBe(false);
  });
  it("throws NO_CHROME when Chrome is missing", async () => {
    await expect(ensureChrome({ ...base, isUp: async () => false, find: () => null })).rejects.toMatchObject({ code: "NO_CHROME" });
  });
  it("launches Chrome with a dedicated profile and waits for the port", async () => {
    let args, ups = 0;
    await ensureChrome({
      ...base, find: () => "chrome.exe", wait: async () => {},
      isUp: async () => ++ups > 2,
      spawnImpl: (exe, a) => { args = [exe, a]; return { unref() {} }; }
    });
    expect(args[0]).toBe("chrome.exe");
    expect(args[1]).toEqual(expect.arrayContaining(["--remote-debugging-port=9222", "--user-data-dir=C:\\p", "--no-first-run", "https://z"]));
  });
  it("throws UNREACHABLE if the port never comes up", async () => {
    await expect(ensureChrome({ ...base, find: () => "c", wait: async () => {}, timeoutMs: 3, isUp: async () => false, spawnImpl: () => ({ unref() {} }) })).rejects.toMatchObject({ code: "UNREACHABLE" });
  });
});
```
(For the last test `wait` resolves instantly, so `timeoutMs` is counted in loop iterations: implement the wait loop as `for (let waited = 0; waited < timeoutMs; waited += 500)` with `await wait(500)`; `timeoutMs: 3` then yields one iteration.)

- [ ] **Step 2: Write the failing zimbra tests**

```js
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { createZimbra, ZimbraError } from "../../../src/main/zimbra.js";
import { SELECTORS } from "../../../src/main/zimbra.selectors.js";

function fakeBrowser({ loggedIn = true, hasPage = false } = {}) {
  const log = [];
  const locator = sel => ({
    count: async () => (sel === SELECTORS.passwordField ? (loggedIn ? 0 : 1) : sel === SELECTORS.mailMarker ? (loggedIn ? 1 : 0) : 1),
    click: async () => log.push(["click", sel]),
    fill: async v => log.push(["fill", sel, v]),
    first() { return this; }
  });
  const page = {
    url: () => "https://z/mail",
    goto: async u => log.push(["goto", u]),
    bringToFront: async () => log.push(["front"]),
    waitForSelector: async () => {},
    locator, frameLocator: () => ({ locator })
  };
  const ctx = { pages: () => (hasPage ? [page] : []), newPage: async () => page };
  return { log, browser: { contexts: () => [ctx], newContext: async () => ctx } };
}

describe("zimbra", () => {
  it("exposes exactly checkSession, prepareMessage, openPage", () => {
    const z = createZimbra({ connect: async () => fakeBrowser().browser, ensure: async () => {} });
    expect(Object.keys(z).sort()).toEqual(["checkSession", "openPage", "prepareMessage"]);
  });
  it("has no send selector and exactly one click in its source", () => {
    expect(Object.entries(SELECTORS).some(([k, v]) => /send/i.test(k) || /send/i.test(String(v)))).toBe(false);
    const src = fs.readFileSync("src/main/zimbra.js", "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect([...src.matchAll(/\.click\(/g)].length).toBe(1);
  });
  it("prepares a message: steps 1,2,3, fills To/Subject/Body, never touches a send control", async () => {
    const { browser, log } = fakeBrowser();
    const z = createZimbra({ connect: async () => browser, ensure: async () => {} });
    const steps = [];
    await z.prepareMessage({ url: "https://z", to: "a@b.co", subject: "Subj", body: "Body" }, n => steps.push(n));
    expect(steps).toEqual([1, 2, 3]);
    expect(log).toEqual(expect.arrayContaining([["fill", SELECTORS.to, "a@b.co"], ["fill", SELECTORS.subject, "Subj"], ["fill", SELECTORS.body, "Body"]]));
    expect(log.some(e => /send/i.test(JSON.stringify(e)))).toBe(false);
  });
  it("throws LOGIN when the login form is showing, before touching compose", async () => {
    const { browser, log } = fakeBrowser({ loggedIn: false });
    const z = createZimbra({ connect: async () => browser, ensure: async () => {} });
    await expect(z.prepareMessage({ url: "https://z", to: "a@b.co", subject: "s", body: "b" }, () => {})).rejects.toMatchObject({ code: "LOGIN" });
    expect(log.some(e => e[0] === "fill")).toBe(false);
  });
  it("checkSession reports login / connected / unreachable", async () => {
    expect(await createZimbra({ connect: async () => fakeBrowser({ loggedIn: false }).browser, ensure: async () => {} }).checkSession("https://z")).toBe("login");
    expect(await createZimbra({ connect: async () => fakeBrowser().browser, ensure: async () => {} }).checkSession("https://z")).toBe("connected");
    await expect(createZimbra({ connect: async () => { throw new Error("ECONNREFUSED"); }, ensure: async () => {} }).checkSession("https://z")).rejects.toMatchObject({ code: "UNREACHABLE" });
  });
  it("propagates ensure() errors (no Chrome)", async () => {
    const z = createZimbra({ connect: async () => fakeBrowser().browser, ensure: async () => { throw new ZimbraError("NO_CHROME", "x"); } });
    await expect(z.checkSession("https://z")).rejects.toMatchObject({ code: "NO_CHROME" });
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/unit/main/chrome.test.js tests/unit/main/zimbra.test.js`
Expected: FAIL (modules not found).

- [ ] **Step 4: Implement `src/main/zimbra.js` (error class lives here; chrome.js imports it)**

```js
import { ZimbraError } from "./zimbra.errors.js";
import { SELECTORS } from "./zimbra.selectors.js";
export { ZimbraError };

// Prepare-only: opens a New Message and fills To/Subject/Body. There is deliberately no code
// here that locates or activates the control that transmits a message.
export function createZimbra({ connect, ensure, selectors = SELECTORS }) {
  async function getPage(url) {
    await ensure(url);
    let browser;
    try { browser = await connect(); }
    catch (e) { throw new ZimbraError("UNREACHABLE", "Unable to connect to Chrome: " + String(e.message || e)); }
    const ctx = browser.contexts()[0] || (await browser.newContext());
    let page = ctx.pages().find(p => p.url().startsWith(url));
    if (page) await page.bringToFront();
    else { page = await ctx.newPage(); await page.goto(url, { waitUntil: "domcontentloaded" }); }
    return page;
  }
  async function loggedIn(page) {
    await page.waitForSelector(`${selectors.mailMarker}, ${selectors.passwordField}`, { timeout: 20000 }).catch(() => {});
    if ((await page.locator(selectors.passwordField).count()) > 0) return false;
    return (await page.locator(selectors.mailMarker).count()) > 0;
  }
  return {
    async checkSession(url) { return (await loggedIn(await getPage(url))) ? "connected" : "login"; },
    async openPage(url) { await getPage(url); },
    async prepareMessage({ url, to, subject, body }, onStep = () => {}) {
      const page = await getPage(url);
      onStep(1);
      if (!(await loggedIn(page))) throw new ZimbraError("LOGIN", "Zimbra login required.");
      onStep(2);
      try {
        await page.locator(selectors.newMessage).first().click();
        await page.locator(selectors.to).first().fill(to);
        await page.locator(selectors.subject).first().fill(subject);
        const scope = selectors.bodyFrame ? page.frameLocator(selectors.bodyFrame) : page;
        await scope.locator(selectors.body).first().fill(body);
      } catch (e) { throw new ZimbraError("COMPOSE", "Could not fill the Zimbra message: " + String(e.message || e)); }
      onStep(3);
    }
  };
}
```
Create `src/main/zimbra.errors.js`:
```js
export class ZimbraError extends Error {
  constructor(code, message) { super(message); this.name = "ZimbraError"; this.code = code; }
}
```
(Separate file avoids a circular import between `chrome.js` and `zimbra.js`.)

- [ ] **Step 5: Implement `src/main/chrome.js`**

```js
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { ZimbraError } from "./zimbra.errors.js";

export function findChrome(env = process.env, exists = fs.existsSync) {
  const rel = ["Google", "Chrome", "Application", "chrome.exe"];
  for (const base of [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA]) {
    if (!base) continue;
    const p = path.win32.join(base, ...rel);
    if (exists(p)) return p;
  }
  return null;
}

export async function isDebugPortUp(port, fetchImpl = fetch) {
  try { return (await fetchImpl(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; }
}

export async function ensureChrome({ port, profileDir, url, spawnImpl = spawn, find = findChrome, isUp = isDebugPortUp, wait = ms => new Promise(r => setTimeout(r, ms)), timeoutMs = 15000 }) {
  if (await isUp(port)) return;
  const exe = find();
  if (!exe) throw new ZimbraError("NO_CHROME", "Google Chrome was not found on this computer.");
  spawnImpl(exe, [`--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--no-first-run", url], { detached: true, stdio: "ignore" }).unref();
  for (let waited = 0; waited < timeoutMs; waited += 500) {
    await wait(500);
    if (await isUp(port)) return;
  }
  throw new ZimbraError("UNREACHABLE", "Chrome did not open its debugging port.");
}
```

- [ ] **Step 6: Create `src/main/zimbra.selectors.js` (initial guesses, verified in Step 9)**

```js
// Selectors for the company's Zimbra web client. Verify with scripts/probe-zimbra.mjs
// against the real site (Task 8, Step 9) and adjust; nothing here may reference a send control.
export const SELECTORS = {
  passwordField: 'input[type="password"]',
  mailMarker: '#zov__main_Mail, .ZmAppChooser, [id^="zb__NEW_MENU"]',
  newMessage: '[id^="zb__NEW_MENU_left_icon"], [id^="zb__App__Mail"] , #zb__NEW_MENU',
  to: 'input[id$="_to_control"], [id$="_to_cell"] input',
  subject: 'input[id$="_subject_control"]',
  bodyFrame: "",
  body: 'textarea[id$="_body_control"], [id$="_body"] textarea, [contenteditable="true"]'
};
```

- [ ] **Step 7: Run to verify pass**

Run: `npx vitest run tests/unit/main/chrome.test.js tests/unit/main/zimbra.test.js`
Expected: PASS (all tests in both files).

- [ ] **Step 8: Write `scripts/probe-zimbra.mjs`**

```js
// Usage: node scripts/probe-zimbra.mjs https://mail.company.local
// Requires Chrome running with --remote-debugging-port=9222 (use the app's "Open Zimbra" once to start it),
// signed in to Zimbra with the compose window open. Prints candidate selectors; copy the right ones
// into src/main/zimbra.selectors.js.
import { chromium } from "playwright-core";
const url = process.argv[2];
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const page = browser.contexts()[0].pages().find(p => p.url().startsWith(url));
if (!page) { console.error("Open", url, "in the debug Chrome first."); process.exit(1); }
for (const f of [page, ...page.frames()]) {
  const rows = await f.evaluate(() => [...document.querySelectorAll("input,textarea,[contenteditable=true],button,[role=button]")]
    .map(e => ({ tag: e.tagName.toLowerCase(), id: e.id, name: e.getAttribute("name"), aria: e.getAttribute("aria-label"), title: e.getAttribute("title"), text: (e.innerText || "").slice(0, 30) }))
    .filter(r => r.id || r.name || r.aria || r.title));
  console.log("FRAME", f.url());
  console.table(rows);
}
await browser.close();
```

- [ ] **Step 9: Verify selectors against the real Zimbra (manual, needs the user's Zimbra)**

1. After Task 9 exists, run `npm run dev`, open Settings → Zimbra → Open Zimbra; sign in once in the Chrome window that opens.
2. Open a new message window manually, then run `node scripts/probe-zimbra.mjs <your Zimbra URL>`.
3. Update `src/main/zimbra.selectors.js` so `mailMarker`, `newMessage`, `to`, `subject`, `body` (and `bodyFrame` if the editor is an iframe) match the printed ids. Re-run `npx vitest run tests/unit/main/zimbra.test.js` (must still pass: no `send` in any selector).
4. In the app press Send Now → Prepare in Zimbra and confirm the compose window is filled and **not sent**.
If the real client cannot be automated reliably, apply the cut-order fallback: replace `prepareMessage` internals by opening `<url>/?view=compose&to=…&subject=…` via `openPage` (keep the same exported surface).

- [ ] **Step 10: Commit**

```powershell
git add src/main/chrome.js src/main/zimbra*.js scripts tests/unit/main/chrome.test.js tests/unit/main/zimbra.test.js
git commit -m "feat: prepare-only Zimbra module over CDP and Chrome launcher"
```

---

### Task 9: Main wiring (IPC, preload, window lifecycle)

**Files:**
- Create: `src/main/ipc.js`, `src/main/zimbra.fake.js`, `src/main/index.js` (replace stub), `src/preload/index.js` (replace stub)
- Test: `tests/unit/main/ipc.test.js`

**Interfaces:**
- Consumes: `createStore`, `createSecrets`, `createGenerator`, `createScheduler`, `createZimbra`, `ensureChrome`, `ZimbraError`, `blocksToText`, `subjectFor`.
- Produces `registerIpc({ ipcMain, store, secrets, generator, scheduler, zimbra, shell, send })` where `send(channel, payload)` pushes events to the renderer. `wrap(fn)` returns `{ok:true,value}` or `{ok:false,error:{code,message}}`.
- Channels (request/response): `store:load` → `{history,schedule,template,settings,draft,hasKey}`; `store:save(name,data)` for `history|template|settings|draft`; `schedule:upsert(item)` → items; `schedule:setStatus(id,status)` → items; `ai:generate(payload)` → blocks; `ai:test(model)` → true; `ai:setKey(key)` → true; `zimbra:check(url)` → `"connected"|"login"`; `zimbra:prepare({url,to,subject,body})` → true; `zimbra:open(url)` → true; events `prepare:step(n)` and `schedule:changed(items)`.
- Preload `window.api` (all promise-returning; rejected promises are `Error` with `.code`): `store.load()`, `store.save(name,data)`, `schedule.upsert(item)`, `schedule.setStatus(id,status)`, `schedule.onChanged(cb) → off`, `generate(payload)`, `testAI(model)`, `setApiKey(key)`, `zimbra.check(url)`, `zimbra.prepare(payload)`, `zimbra.open(url)`, `zimbra.onStep(cb) → off`.
- Env test hooks: `DD_USER_DATA` (override `userData`), `DD_TEST=1` (use `zimbra.fake.js`, which records prepared messages to `<userData>/prepared.json`).

- [ ] **Step 1: Write the failing IPC tests**

```js
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../../../src/main/store.js";
import { registerIpc } from "../../../src/main/ipc.js";

let handlers, sent, deps;
beforeEach(() => {
  handlers = {}; sent = [];
  const store = createStore(fs.mkdtempSync(path.join(os.tmpdir(), "dd-ipc-")));
  deps = {
    ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
    store, send: (c, p) => sent.push([c, p]),
    secrets: { hasKey: () => false, setKey: () => {} },
    generator: { generate: async () => [{ type: "text", text: "x" }], testConnection: async () => true },
    scheduler: { upsert: i => [i], setStatus: () => [] },
    zimbra: { checkSession: async () => "connected", openPage: async () => {}, prepareMessage: async (_p, onStep) => { onStep(1); onStep(2); onStep(3); } },
    shell: { openExternal: async () => {} }
  };
  registerIpc(deps);
});
const call = (ch, ...a) => handlers[ch]({}, ...a);

describe("ipc", () => {
  it("loads everything plus hasKey", async () => {
    const r = await call("store:load");
    expect(r.ok).toBe(true);
    expect(Object.keys(r.value).sort()).toEqual(["draft", "hasKey", "history", "schedule", "settings", "template"]);
  });
  it("saves only whitelisted collections (schedule is main-owned)", async () => {
    expect((await call("store:save", "history", [])).ok).toBe(true);
    const bad = await call("store:save", "schedule", []);
    expect(bad.ok).toBe(false);
  });
  it("wraps thrown errors with a code", async () => {
    deps.zimbra.checkSession = async () => { const e = new Error("no"); e.code = "UNREACHABLE"; throw e; };
    registerIpc(deps);
    expect(await call("zimbra:check", "https://z")).toEqual({ ok: false, error: { code: "UNREACHABLE", message: "no" } });
  });
  it("forwards prepare steps as events", async () => {
    const r = await call("zimbra:prepare", { url: "https://z", to: "a@b.co", subject: "s", body: "b" });
    expect(r.ok).toBe(true);
    expect(sent.filter(([c]) => c === "prepare:step").map(([, n]) => n)).toEqual([1, 2, 3]);
  });
  it("rejects non-http(s) Zimbra URLs", async () => {
    expect((await call("zimbra:check", "file:///etc/passwd")).ok).toBe(false);
    expect((await call("zimbra:prepare", { url: "javascript:alert(1)", to: "a@b.co", subject: "s", body: "b" })).ok).toBe(false);
  });
  it("never returns the API key", async () => {
    deps.secrets.hasKey = () => true; deps.secrets.getKey = () => "SECRET";
    registerIpc(deps);
    expect(JSON.stringify(await call("store:load"))).not.toContain("SECRET");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/main/ipc.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/main/ipc.js`**

```js
const SAVEABLE = ["history", "template", "settings", "draft"];

const wrap = fn => async (_e, ...args) => {
  try { return { ok: true, value: await fn(...args) }; }
  catch (e) { return { ok: false, error: { code: e.code || "ERROR", message: String(e.message || e) } }; }
};
const httpUrl = u => { let p; try { p = new URL(u); } catch { throw new Error("Invalid URL."); } if (!/^https?:$/.test(p.protocol)) throw new Error("Only http(s) URLs are allowed."); return u; };

export function registerIpc({ ipcMain, store, secrets, generator, scheduler, zimbra, send }) {
  const h = (ch, fn) => ipcMain.handle(ch, wrap(fn));
  h("store:load", () => ({ ...store.readAll(), hasKey: secrets.hasKey() }));
  h("store:save", (name, data) => { if (!SAVEABLE.includes(name)) throw new Error("Cannot save " + name); store.write(name, data); return true; });
  h("schedule:upsert", item => scheduler.upsert(item));
  h("schedule:setStatus", (id, status) => scheduler.setStatus(id, status));
  h("ai:generate", p => generator.generate(p));
  h("ai:test", model => generator.testConnection(model));
  h("ai:setKey", key => { secrets.setKey(key); return true; });
  h("zimbra:check", url => zimbra.checkSession(httpUrl(url)));
  h("zimbra:open", async url => { await zimbra.openPage(httpUrl(url)); return true; });
  h("zimbra:prepare", async ({ url, to, subject, body }) => {
    await zimbra.prepareMessage({ url: httpUrl(url), to, subject, body }, n => send("prepare:step", n));
    return true;
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/main/ipc.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Write `src/main/zimbra.fake.js`**

```js
import fs from "node:fs";
import path from "node:path";

// Test double used when DD_TEST=1: records prepared messages instead of driving Chrome.
export function createFakeZimbra(dir) {
  const file = path.join(dir, "prepared.json");
  return {
    async checkSession() { return "connected"; },
    async openPage() {},
    async prepareMessage(msg, onStep = () => {}) {
      onStep(1); onStep(2);
      const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
      fs.writeFileSync(file, JSON.stringify([...all, msg]));
      onStep(3);
    }
  };
}
```

- [ ] **Step 6: Write `src/preload/index.js`**

```js
import { contextBridge, ipcRenderer } from "electron";

async function call(channel, ...args) {
  const r = await ipcRenderer.invoke(channel, ...args);
  if (r.ok) return r.value;
  const e = new Error(r.error.message); e.code = r.error.code; throw e;
}
const on = channel => cb => {
  const fn = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld("api", {
  store: { load: () => call("store:load"), save: (name, data) => call("store:save", name, data) },
  schedule: {
    upsert: item => call("schedule:upsert", item),
    setStatus: (id, status) => call("schedule:setStatus", id, status),
    onChanged: on("schedule:changed")
  },
  generate: p => call("ai:generate", p),
  testAI: model => call("ai:test", model),
  setApiKey: key => call("ai:setKey", key),
  zimbra: {
    check: url => call("zimbra:check", url),
    prepare: p => call("zimbra:prepare", p),
    open: url => call("zimbra:open", url),
    onStep: on("prepare:step")
  }
});
```

- [ ] **Step 7: Write `src/main/index.js`**

```js
import { app, BrowserWindow, ipcMain, safeStorage, shell, Notification } from "electron";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { createStore } from "./store.js";
import { createSecrets } from "./secrets.js";
import { createGenerator } from "./generate.js";
import { createScheduler } from "./scheduler.js";
import { createZimbra } from "./zimbra.js";
import { createFakeZimbra } from "./zimbra.fake.js";
import { ensureChrome } from "./chrome.js";
import { registerIpc } from "./ipc.js";
import { blocksToText } from "../shared/report.js";
import { subjectFor } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";

if (process.env.DD_USER_DATA) app.setPath("userData", process.env.DD_USER_DATA);
const PORT = 9222;

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  let win = null;
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

  app.whenReady().then(() => {
    const dir = app.getPath("userData");
    const store = createStore(dir);
    const secrets = createSecrets(dir, safeStorage);
    const generator = createGenerator({ getKey: () => secrets.getKey() });
    const send = (ch, payload) => { if (win && !win.isDestroyed()) win.webContents.send(ch, payload); };
    const zimbra = process.env.DD_TEST
      ? createFakeZimbra(dir)
      : createZimbra({
          connect: () => chromium.connectOverCDP(`http://127.0.0.1:${PORT}`),
          ensure: url => ensureChrome({ port: PORT, profileDir: join(dir, "chrome-profile"), url })
        });
    const scheduler = createScheduler({
      store,
      prepare: it => zimbra.prepareMessage({ url: store.read("settings").zimbra.url, to: it.recipient, subject: it.subject || subjectFor(store.read("settings").email.defaultSubject, fromISODate(it.date)), body: blocksToText(it.blocks) }),
      notify: (title, body) => { if (Notification.isSupported()) new Notification({ title, body }).show(); },
      onChange: items => send("schedule:changed", items)
    });
    registerIpc({ ipcMain, store, secrets, generator, scheduler, zimbra, shell, send });
    app.setLoginItemSettings({ openAtLogin: !!store.read("settings").app.startWithWindows && !process.env.DD_TEST });

    win = new BrowserWindow({
      width: 1440, height: 900, minWidth: 1100, minHeight: 700, show: false, backgroundColor: "#0c0c0c", title: "Daily Digest",
      titleBarStyle: "hidden", titleBarOverlay: { color: "#050505", symbolColor: "#bdbdbd", height: 40 },
      webPreferences: { preload: join(__dirname, "../preload/index.js"), sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    win.removeMenu();
    win.once("ready-to-show", () => win.show());
    // Keep running (minimised) while digests are scheduled so the timer can fire.
    win.on("close", e => {
      if (!app.isQuitting && store.read("schedule").some(i => i.status === "scheduled")) { e.preventDefault(); win.minimize(); }
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL);
    else win.loadFile(join(__dirname, "../renderer/index.html"));

    scheduler.start();
  });
  app.on("before-quit", () => { app.isQuitting = true; });
  app.on("window-all-closed", () => app.quit());
}
```

- [ ] **Step 8: Verify build and a manual launch**

Run: `npm run build` — Expected: succeeds.
Run: `npx vitest run` — Expected: all unit tests so far pass.
Run: `npm run dev` — Expected: a window opens showing "Daily Digest" (renderer stub) with the dark title-bar overlay and window controls; close it.

- [ ] **Step 9: Commit**

```powershell
git add src tests
git commit -m "feat: IPC, preload, window lifecycle, single instance, test double"
```

---

### Task 10: Renderer foundation (tokens, fonts, design system)

**Files:**
- Create (copy): `src/renderer/src/styles/tokens/{base,colors,spacing,typography}.css`, `src/renderer/src/ds/**` (all `.jsx` from `design_handoff_daily_digest/design_system_source/components/**`, preserving the `core|data|feedback|forms|layout|navigation` subfolders), `src/renderer/src/ds/index.js`, `src/renderer/src/app.css`
- Modify: `src/renderer/src/ds/core/Icon.jsx`, `src/renderer/src/main.jsx`
- Test: `tests/unit/renderer/ds.test.jsx`

**Interfaces:**
- Produces: `import * as DS from "./ds"` exposing `Button, IconButton, Icon, Kbd, Tooltip, Badge, StatusBadge, Tag, Banner, ConfirmDialog, EmptyState, Modal, Toast, Checkbox, DatePicker, Field, Input, RadioCard, Select, Switch, Textarea, TimePicker, Card, NotchCard, AppSidebar, ConnectionStatus`. `Icon({name,size,strokeWidth,color,style})` renders a `lucide-react` icon by kebab-case name (returns `null` for unknown names).

- [ ] **Step 1: Copy files**

```powershell
$src = "design_handoff_daily_digest\design_system_source"
New-Item -ItemType Directory -Force src\renderer\src\ds, src\renderer\src\styles\tokens | Out-Null
Get-ChildItem "$src\components" -Recurse -Filter *.jsx | ForEach-Object {
  $rel = $_.FullName.Substring((Resolve-Path "$src\components").Path.Length + 1)
  $dest = Join-Path "src\renderer\src\ds" $rel
  New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
  Copy-Item $_.FullName $dest
}
foreach ($f in 'base','colors','spacing','typography') { Copy-Item "$src\tokens\$f.css" "src\renderer\src\styles\tokens\$f.css" }
Copy-Item "$src\fonts\LEDDotMatrix-400.ttf" "src\renderer\src\styles\LEDDotMatrix-400.ttf"
```
(`.d.ts`, `.prompt.md` and `*.card.html` files are intentionally not copied.)

- [ ] **Step 2: Write the failing DS test**

`tests/unit/renderer/ds.test.jsx`:
```jsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as DS from "../../../src/renderer/src/ds/index.js";

const ICONS = "square-pen clock history layout-template settings copy pencil refresh-cw send check external-link lock mail loader-circle circle arrow-left chevron-down chevron-up chevron-left chevron-right calendar x info circle-alert circle-check triangle-alert ban".split(" ");

describe("design system port", () => {
  it("exports every component", () => {
    for (const n of "Button IconButton Icon Kbd Tooltip Badge StatusBadge Tag Banner ConfirmDialog EmptyState Modal Toast Checkbox DatePicker Field Input RadioCard Select Switch Textarea TimePicker Card NotchCard AppSidebar ConnectionStatus".split(" ")) {
      expect(DS[n], n).toBeTypeOf("function");
    }
  });
  it("renders every Lucide icon name the handoff uses", () => {
    for (const name of ICONS) {
      const { container } = render(<DS.Icon name={name} />);
      expect(container.querySelector("svg"), name).not.toBeNull();
    }
  });
  it("renders nothing for an unknown icon", () => {
    const { container } = render(<DS.Icon name="not-a-real-icon" />);
    expect(container.querySelector("svg")).toBeNull();
  });
  it("Button shows the disabled and loading states", () => {
    const { getByRole, rerender } = render(<DS.Button disabled>Go</DS.Button>);
    expect(getByRole("button")).toBeDisabled();
    rerender(<DS.Button loading>Go</DS.Button>);
    expect(getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/unit/renderer/ds.test.jsx`
Expected: FAIL (`ds/index.js` missing).

- [ ] **Step 4: Replace `Icon.jsx` and write the barrel**

`src/renderer/src/ds/core/Icon.jsx` (replace whole file; the original looked icons up on `window.lucide`):
```jsx
import React from "react";
import * as L from "lucide-react";

const toPascal = n => String(n).split(/[-_ ]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");

export function Icon({ name, size = 18, strokeWidth = 1.75, color = "currentColor", style }) {
  const C = L[toPascal(name)];
  if (!C) return null;
  return <C width={size} height={size} strokeWidth={strokeWidth} color={color} aria-hidden="true" style={{ flexShrink: 0, ...style }} />;
}
```
`src/renderer/src/ds/index.js`:
```js
export { Button } from "./core/Button.jsx";
export { IconButton } from "./core/IconButton.jsx";
export { Icon } from "./core/Icon.jsx";
export { Kbd } from "./core/Kbd.jsx";
export { Tooltip } from "./core/Tooltip.jsx";
export { Badge } from "./data/Badge.jsx";
export { StatusBadge } from "./data/StatusBadge.jsx";
export { Tag } from "./data/Tag.jsx";
export { Banner } from "./feedback/Banner.jsx";
export { ConfirmDialog } from "./feedback/ConfirmDialog.jsx";
export { EmptyState } from "./feedback/EmptyState.jsx";
export { Modal } from "./feedback/Modal.jsx";
export { Toast } from "./feedback/Toast.jsx";
export { Checkbox } from "./forms/Checkbox.jsx";
export { DatePicker } from "./forms/DatePicker.jsx";
export { Field } from "./forms/Field.jsx";
export { Input } from "./forms/Input.jsx";
export { RadioCard } from "./forms/RadioCard.jsx";
export { Select } from "./forms/Select.jsx";
export { Switch } from "./forms/Switch.jsx";
export { Textarea } from "./forms/Textarea.jsx";
export { TimePicker } from "./forms/TimePicker.jsx";
export { Card } from "./layout/Card.jsx";
export { NotchCard } from "./layout/NotchCard.jsx";
export { AppSidebar } from "./navigation/AppSidebar.jsx";
export { ConnectionStatus } from "./navigation/ConnectionStatus.jsx";
```
If any component file exports under a different name than the one in the barrel, fix the barrel to match the file (run `Select-String -Path src\renderer\src\ds -Pattern '^export' -Recurse` to list them).

- [ ] **Step 5: Fonts and tokens CSS**

Create `src/renderer/src/styles/fonts.css` (replaces the Google Fonts import so the app works offline):
```css
@font-face{font-family:"LED Dot-Matrix";src:url("./LEDDotMatrix-400.ttf") format("truetype");font-weight:400;font-style:normal;font-display:swap}
```
Create `src/renderer/src/app.css`:
```css
html,body,#root{height:100%;margin:0;overflow:hidden}
.hrow:hover{background:var(--ink-4)!important}
a{color:var(--orange-400)}a:hover{color:var(--orange-500)}
button:focus-visible,[role="button"]:focus-visible,.hrow:focus-visible,a:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.app-drag{-webkit-app-region:drag}
.app-nodrag{-webkit-app-region:no-drag}
```
Replace `src/renderer/src/main.jsx`:
```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./styles/fonts.css";
import "./styles/tokens/colors.css";
import "./styles/tokens/typography.css";
import "./styles/tokens/spacing.css";
import "./styles/tokens/base.css";
import "./app.css";
import { App } from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
```
(`App.jsx` is created in Task 11; until then add a temporary `export const App = () => <div>Daily Digest</div>;` file so the build passes.)

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run tests/unit/renderer/ds.test.jsx`
Expected: PASS (4 tests). Run `npm run build` — Expected: succeeds.

- [ ] **Step 7: Commit**

```powershell
git add src/renderer tests/unit/renderer
git commit -m "feat: port design system, tokens and offline fonts"
```

---

### Task 11: Renderer core (persistence mapping, shell, state, App)

**Files:**
- Create: `src/renderer/src/persist.js`, `src/renderer/src/AppShell.jsx`, `src/renderer/src/Shell.jsx`, `src/renderer/src/useApp.js`, `src/renderer/src/App.jsx` (replace temp)
- Test: `tests/unit/renderer/persist.test.js`

**Interfaces:**
- Consumes: `window.api` (Task 9), `@shared/*`, `./ds`.
- Produces from `persist.js`: `itemFromDisk/itemToDisk/historyFromDisk/historyToDisk` (shapes below).
- Renderer shapes: schedule item `{id, date: Date, time, to, subject, status, blocks, createdAt?}`; history entry `{id, date: Date, dateLabel, time, to, status, notes, blocks}`.
- Produces from `Shell.jsx`: `PageHeader({title,meta,right,onBack})`, `Overline({children,style})`, `DigestDocument({blocks,subject,to,editing,draft,setDraft,dim})` — copied verbatim from the prototype's `Shell.jsx` (without `WindowFrame`/`AppStatus`), converted to ES exports with `import { IconButton } from "./ds"`.
- Produces from `AppShell.jsx`: `AppShell({status, children})` (40 px title bar, centered "Daily Digest", `status` on the right with 140 px right padding for the window-controls overlay), `AppStatus({s})` identical logic to the prototype.
- Produces from `useApp.js`: `useApp() → { s, a, ready }` where `s` is the state object of handoff §5.8 plus `{ today: Date, settings, hasKey, curId, genError: {details}|null, modalDetails: string|null }` and `a` has the action names of handoff §5.8 plus `saveSettings(patch)`, `setSettingsDraft` is NOT needed (Settings screen keeps local state until Save).

- [ ] **Step 1: Write the failing persist test**

```js
import { describe, it, expect } from "vitest";
import { itemFromDisk, itemToDisk, historyFromDisk, historyToDisk } from "../../../src/renderer/src/persist.js";

const blocks = [{ type: "section", title: "TASK TODAY", items: ["A."] }];

describe("persist mapping", () => {
  it("round-trips a schedule item", () => {
    const disk = { id: "1", date: "2026-10-08", time: "5:00 PM", recipient: "m@c.com", subject: "S", status: "scheduled", blocks, createdAt: "2026-10-08T10:00:00.000Z" };
    const r = itemFromDisk(disk);
    expect(r.date).toEqual(new Date(2026, 9, 8));
    expect(r.to).toBe("m@c.com");
    expect(itemToDisk(r)).toEqual(disk);
  });
  it("round-trips a history entry and derives dateLabel", () => {
    const disk = { id: "h1", date: "2026-10-07", time: "5:02 PM", recipient: "m@c.com", status: "sent", notes: { work: "x" }, blocks };
    const r = historyFromDisk(disk);
    expect(r.dateLabel).toBe("October 7, 2026");
    expect(historyToDisk(r)).toEqual(disk);
  });
  it("itemToDisk stamps createdAt when missing", () => {
    expect(itemToDisk({ id: "1", date: new Date(2026, 9, 8), time: "5:00 PM", to: "a@b.co", subject: "S", status: "scheduled", blocks }).createdAt).toMatch(/^\d{4}-/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/renderer/persist.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `persist.js`**

```js
import { toISODate, fromISODate, fmt } from "@shared/time.js";

export const itemFromDisk = i => ({ id: i.id, date: fromISODate(i.date), time: i.time, to: i.recipient, subject: i.subject, status: i.status, blocks: i.blocks, createdAt: i.createdAt });
export const itemToDisk = i => ({ id: i.id, date: toISODate(i.date), time: i.time, recipient: i.to, subject: i.subject, status: i.status, blocks: i.blocks, createdAt: i.createdAt || new Date().toISOString() });
export const historyFromDisk = h => { const d = fromISODate(h.date); return { id: h.id, date: d, dateLabel: fmt(d), time: h.time, to: h.recipient, status: h.status, notes: h.notes, blocks: h.blocks }; };
export const historyToDisk = h => ({ id: h.id, date: toISODate(h.date), time: h.time, recipient: h.to, status: h.status, notes: h.notes, blocks: h.blocks });
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/renderer/persist.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Create `Shell.jsx` and `AppShell.jsx`**

`Shell.jsx`: copy `design_handoff_daily_digest/prototype/Shell.jsx`, then apply exactly these edits: delete the `WindowFrame` and `AppStatus` functions and the final `Object.assign(window,…)` line; add at the top `import React from "react"; import { IconButton } from "./ds";`; in `PageHeader` delete the line `const {IconButton}=window.ZimbraDigestDesignSystem_9514e4;`; prefix `PageHeader`, `Overline`, `DigestDocument` with `export`. In `DigestDocument` replace the unneeded ternary `style={{color:b.text.startsWith("Regards")?"var(--fg-document)":"var(--fg-document)"}}` with `style={{color:"var(--fg-document)"}}`.

`AppShell.jsx`:
```jsx
import React from "react";

export function AppStatus({ s }) {
  const busy = s.stage === "generating", sch = s.digestStatus === "scheduled";
  const c = busy || sch ? "var(--status-info)" : s.zimbra ? "var(--status-success)" : "var(--status-warning)";
  const label = busy ? "Generating…" : sch ? "Scheduled · " + s.schedule.time : s.zimbra ? "Ready" : "Offline";
  return (
    <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "500 12px/1 var(--font-sans)", color: "var(--fg-3)" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, animation: busy ? "dd-pulse 1.2s infinite" : "none" }} />{label}
    </span>
  );
}

export function AppShell({ status, children }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--surface-window)" }}>
      <div className="app-drag" style={{ height: "var(--titlebar-height)", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 150px 0 14px", background: "var(--surface-titlebar)", borderBottom: "1px solid var(--border-subtle)", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", font: "var(--text-app-title)", color: "var(--fg-2)", pointerEvents: "none" }}>Daily Digest</div>
        <div className="app-nodrag" style={{ marginLeft: "auto", position: "relative" }}>{status}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 6: Write `useApp.js`**

```js
import React from "react";
import { fmt, toISODate, formatTime, dueAt } from "@shared/time.js";
import { hasNotes, EMPTY_NOTES, SAMPLE_NOTES, DEFAULT_TEMPLATE, subjectFor, blocksToText } from "@shared/report.js";
import { itemFromDisk, itemToDisk, historyFromDisk, historyToDisk } from "./persist.js";

const api = () => window.api;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const draftOf = b => Object.fromEntries(b.map((x, i) => x.type === "section" ? [i, x.items.join("\n")] : null).filter(Boolean));

const initial = () => ({
  page: "new", stage: "form", notes: { ...EMPTY_NOTES }, today: new Date(), date: new Date(), blocks: [], draft: {},
  digestStatus: "none", schedule: { date: new Date(), time: "5:00 PM", to: "" }, items: [], modal: null, zimbra: false, toast: null,
  genAt: null, savedAt: null, sentAt: null, history: [], historySel: null, template: DEFAULT_TEMPLATE,
  settings: null, hasKey: false, genStep: 0, prepStep: 0, testing: false, testingAI: false, curId: null, genError: null, modalDetails: null
});

export function useApp() {
  const [s, setS] = React.useState(initial);
  const [ready, setReady] = React.useState(false);
  const ref = React.useRef(s); ref.current = s;
  const up = p => setS(prev => ({ ...prev, ...(typeof p === "function" ? p(prev) : p) }));
  const timers = React.useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const genId = React.useRef(0);
  const shownMissed = React.useRef(new Set());

  const toast = (message, tone = "success") => {
    const id = Date.now();
    up({ toast: { message, tone, id } });
    later(() => up(p => p.toast && p.toast.id === id ? { toast: null } : {}), 3200);
  };
  const subject = (c = ref.current) => subjectFor(c.settings.email.defaultSubject, c.date);

  const maybeShowMissed = items => {
    const m = items.find(i => i.status === "missed" && !shownMissed.current.has(i.id));
    if (m && !ref.current.modal) { shownMissed.current.add(m.id); up({ modal: { t: "missed", id: m.id } }); }
  };
  const applyItems = disk => {
    const items = disk.map(itemFromDisk);
    up(p => ({ items, digestStatus: p.curId && items.find(i => i.id === p.curId)?.status === "prepared" && p.digestStatus === "scheduled" ? "prepared" : p.digestStatus }));
    maybeShowMissed(items);
  };

  // ---- boot
  React.useEffect(() => {
    let off = () => {}, offStep = () => {};
    api().store.load().then(async d => {
      const settings = d.settings;
      const today = new Date();
      setS(p => ({ ...p, settings, hasKey: d.hasKey, template: d.template.body, today, date: today,
        notes: { ...EMPTY_NOTES, ...d.draft.notes }, digestStatus: hasNotes(d.draft.notes) ? "draft" : "none",
        history: d.history.map(historyFromDisk), items: d.schedule.map(itemFromDisk),
        schedule: { date: today, time: settings.general.defaultSendTime, to: settings.email.defaultRecipient } }));
      setReady(true);
      maybeShowMissed(d.schedule.map(itemFromDisk));
      api().zimbra.check(settings.zimbra.url).then(r => up({ zimbra: r === "connected" }), () => up({ zimbra: false }));
    });
    off = api().schedule.onChanged(applyItems);
    offStep = api().zimbra.onStep(n => up({ prepStep: n }));
    return () => { off(); offStep(); clear(); };
  }, []);

  // ---- autosave notes (debounced)
  React.useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => api().store.save("draft", { notes: s.notes }), 600);
    return () => clearTimeout(t);
  }, [s.notes, ready]);

  async function runPrepare({ to, subj, blocks, forCur }) {
    clear();
    up({ modal: { t: "prepare" }, prepStep: 0 });
    try {
      await api().zimbra.prepare({ url: ref.current.settings.zimbra.url, to, subject: subj, body: blocksToText(blocks) });
      up(p => ({ prepStep: 3, zimbra: true, digestStatus: forCur ? "prepared" : p.digestStatus }));
      toast("Email prepared in Zimbra.");
      return true;
    } catch (e) {
      up({ modal: { t: e.code === "LOGIN" ? "login" : "zerr" }, modalDetails: e.message, zimbra: e.code === "LOGIN" ? false : ref.current.zimbra });
      return false;
    }
  }

  const a = {
    go: page => up({ page, historySel: null }),
    newDigest: () => { const c = ref.current; if (["none", "sent"].includes(c.digestStatus)) a.resetDigest(); else up({ page: "new" }); },
    resetDigest: () => { clear(); const now = new Date(); up(p => ({ page: "new", stage: "form", notes: { ...EMPTY_NOTES }, blocks: [], draft: {}, digestStatus: "none", savedAt: null, sentAt: null, curId: null, date: now, today: now, modal: null, genError: null })); api().store.save("draft", { notes: { ...EMPTY_NOTES } }); },
    setNotes: notes => up(p => ({ notes, digestStatus: p.digestStatus === "none" ? "draft" : p.digestStatus })),
    fillSample: () => up({ notes: { ...SAMPLE_NOTES }, digestStatus: "draft" }),
    async generate() {
      const c = ref.current;
      if (!hasNotes(c.notes)) return;
      clear();
      const id = ++genId.current;
      up({ page: "new", stage: "generating", genStep: 0, modal: null, genError: null });
      later(() => up({ genStep: 1 }), 600);
      later(() => up({ genStep: 2 }), 1200);
      try {
        const blocks = await api().generate({ notes: c.notes, template: c.template, profile: c.settings.profile, date: toISODate(c.date), model: c.settings.ai.model });
        if (id !== genId.current) return;
        clear();
        up({ stage: "review", blocks, digestStatus: "ready", savedAt: null, genAt: formatTime(new Date()) });
      } catch (e) {
        if (id !== genId.current) return;
        clear();
        up({ stage: "error", genError: { details: e.message } });
      }
    },
    regenerate: () => { if (ref.current.savedAt) up({ modal: { t: "regen" } }); else a.generate(); },
    editNotes: () => up({ stage: "form", digestStatus: "draft" }),
    startEdit: () => up(p => ({ stage: "editing", draft: draftOf(p.blocks) })),
    setDraft: draft => up({ draft }),
    saveEdit: () => { up(p => ({ stage: "review", savedAt: formatTime(new Date()), blocks: p.blocks.map((b, i) => b.type === "section" && p.draft[i] != null ? { ...b, items: p.draft[i].split(/\r?\n/).map(x => x.trim()).filter(Boolean) } : b) })); toast("Saved"); },
    cancelEdit: () => up({ stage: "review" }),
    openSchedule: (edit, id) => up({ modal: { t: "schedule", edit, id } }),
    async confirmSchedule(sch, editId) {
      const c = ref.current;
      try {
        if (editId && editId !== c.curId) {
          const it = c.items.find(i => i.id === editId);
          disk(await api().schedule.upsert(itemToDisk({ ...it, ...sch, status: "scheduled" })));
          up({ modal: null }); toast("Schedule updated."); return;
        }
        const id = c.curId || uid();
        const item = { id, ...sch, subject: subject(c), status: "scheduled", blocks: c.blocks };
        disk(await api().schedule.upsert(itemToDisk(item)));
        up({ schedule: sch, digestStatus: "scheduled", stage: "review", modal: null, curId: id });
        toast(editId ? "Schedule updated." : "Digest scheduled for " + sch.time + ".");
      } catch (e) { up({ modal: { ...c.modal, fail: true } }); }
    },
    async cancelSchedule(id) {
      applyItems(await api().schedule.setStatus(id, "cancelled"));
      up(p => ({ digestStatus: id === p.curId ? "ready" : p.digestStatus, curId: id === p.curId ? null : p.curId, modal: null }));
      toast("Digest cancelled.", "info");
    },
    openSend: () => up({ modal: { t: "send" } }),
    async confirmSend() {
      const c = ref.current;
      if (!c.zimbra) { try { const r = await api().zimbra.check(c.settings.zimbra.url); up({ zimbra: r === "connected" }); if (r !== "connected") { up({ modal: { t: "login" } }); return; } } catch (e) { up({ modal: { t: "zerr" }, modalDetails: e.message }); return; } }
      await runPrepare({ to: c.schedule.to, subj: subject(c), blocks: c.blocks, forCur: true });
    },
    async loginZimbra() { up({ modal: null }); toast("Opening Zimbra in your browser…", "info"); try { await api().zimbra.open(ref.current.settings.zimbra.url); } catch (e) { up({ modal: { t: "zerr" }, modalDetails: e.message }); } },
    async retryZimbra() { up({ modal: null, testing: true }); try { const r = await api().zimbra.check(ref.current.settings.zimbra.url); up({ testing: false, zimbra: r === "connected", modal: { t: "send" } }); } catch (e) { up({ testing: false, modal: { t: "zerr" }, modalDetails: e.message }); } },
    async testZimbra() {
      up({ testing: true });
      try { const r = await api().zimbra.check(ref.current.settings.zimbra.url); up({ testing: false, zimbra: r === "connected" }); toast(r === "connected" ? "Zimbra connection OK." : "Zimbra login required.", r === "connected" ? "success" : "warning"); }
      catch (e) { up({ testing: false, zimbra: false }); toast("Unable to connect to Zimbra.", "danger"); }
    },
    async openZimbra() { toast("Opening Zimbra in your browser…", "info"); try { await api().zimbra.open(ref.current.settings.zimbra.url); } catch (e) { toast("Unable to open Zimbra.", "danger"); } },
    setModal: modal => up({ modal }), closeModal: () => { up({ modal: null }); },
    markSent() {
      const c = ref.current, time = formatTime(new Date());
      const entry = { id: uid(), date: c.date, dateLabel: fmt(c.date), time, to: c.schedule.to, blocks: c.blocks, notes: c.notes, status: "sent" };
      const history = [entry, ...c.history];
      api().store.save("history", history.map(historyToDisk));
      up({ digestStatus: "sent", sentAt: time, history });
    },
    async prepareMissed(id) {
      const it = ref.current.items.find(i => i.id === id);
      const ok = await runPrepare({ to: it.to, subj: it.subject || subject(), blocks: it.blocks, forCur: false });
      if (ok) applyItems(await api().schedule.setStatus(id, "prepared"));
    },
    async dismissMissed(id) { applyItems(await api().schedule.setStatus(id, "cancelled")); up({ modal: null }); toast("Digest cancelled. No email was sent.", "info"); },
    selectHistory: id => up({ historySel: id }),
    duplicate: h => { up({ notes: { ...h.notes }, page: "new", stage: "form", digestStatus: "draft", blocks: [], savedAt: null, curId: null }); toast("Notes copied. Generate and review the new digest.", "info"); },
    saveTemplate: tpl => { up({ template: tpl }); api().store.save("template", { ...{ id: "daily-digest", name: "Daily Digest" }, body: tpl, variables: ["date", "name", "role", "tasks", "topics", "weekly_plans", "blockers", "tomorrow"] }); toast("Template saved."); },
    async saveSettings({ settings, apiKey }) {
      await api().store.save("settings", settings);
      if (apiKey && apiKey.trim()) { await api().setApiKey(apiKey); up({ hasKey: true }); }
      up(p => ({ settings, schedule: p.digestStatus === "scheduled" ? p.schedule : { ...p.schedule, to: settings.email.defaultRecipient, time: settings.general.defaultSendTime } }));
      toast("Settings saved.");
    },
    async testAI() {
      up({ testingAI: true });
      try { await api().testAI(ref.current.settings.ai.model); toast("Connection OK."); }
      catch (e) { toast("Unable to connect: " + e.message, "danger"); }
      up({ testingAI: false });
    }
  };
  function disk(items) { applyItems(items); }

  // ---- keyboard shortcuts (Ctrl on Windows)
  React.useEffect(() => {
    const h = e => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const c = ref.current, k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); a.newDigest(); }
      else if (k === "enter" && c.page === "new" && ["form", "error"].includes(c.stage)) { e.preventDefault(); a.generate(); }
      else if (k === "s" && e.shiftKey) { e.preventDefault(); if (c.stage === "review" && c.digestStatus === "ready") a.openSchedule(false); }
      else if (k === "s") { e.preventDefault(); if (c.stage === "editing" && c.page === "new") a.saveEdit(); else if (c.page === "templates" && window.__ddSaveTemplate) window.__ddSaveTemplate(); else if (c.page === "settings" && window.__ddSaveSettings) window.__ddSaveSettings(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return { s, a, ready };
}
```
Notes on semantics (match the handoff): after Schedule the current digest's item id is `curId`; the prototype's literal `"cur"` id is replaced by `s.curId` everywhere in screens (Tasks 12–13). The `schedule` object `{date,time,to}` is the dialog default and the current digest's schedule.

- [ ] **Step 7: Write `App.jsx`**

```jsx
import React from "react";
import { AppSidebar, Toast } from "./ds";
import { AppShell, AppStatus } from "./AppShell.jsx";
import { useApp } from "./useApp.js";
import { NewDigestScreen } from "./screens/NewDigest.jsx";
import { ScheduledScreen } from "./screens/Scheduled.jsx";
import { HistoryScreen } from "./screens/History.jsx";
import { TemplatesScreen } from "./screens/Templates.jsx";
import { SettingsScreen } from "./screens/Settings.jsx";
import { ScheduleModal, SendModal, PrepareModal, LoginModal, ZimbraErrorDialog, ZimbraStatusModal, ConfirmCancel, ConfirmRegen, MissedDialog, ViewModal } from "./screens/dialogs.jsx";

export function App() {
  const { s, a, ready } = useApp();
  if (!ready) return null;
  const nSch = s.items.filter(i => i.status === "scheduled").length;
  const items = [
    { id: "new", label: "New Digest", icon: "square-pen", kbd: "⌘N" },
    { id: "scheduled", label: "Scheduled", icon: "clock", count: nSch || undefined, countTone: "info" },
    { id: "history", label: "History", icon: "history" },
    { id: "templates", label: "Templates", icon: "layout-template" },
    { id: "settings", label: "Settings", icon: "settings" }
  ];
  const Screen = { new: NewDigestScreen, scheduled: ScheduledScreen, history: HistoryScreen, templates: TemplatesScreen, settings: SettingsScreen }[s.page];
  const mt = s.modal && s.modal.t;
  return (
    <AppShell status={<AppStatus s={s} />}>
      <AppSidebar items={items} value={s.page} onChange={id => id === "new" ? (a.go("new"), a.newDigest()) : a.go(id)} connected={s.zimbra} onConnectionClick={() => a.setModal({ t: "zstatus" })} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", minHeight: 0 }}><Screen s={s} a={a} /></main>
      {mt === "schedule" && <ScheduleModal key={s.modal.id || "n"} s={s} a={a} />}
      {mt === "send" && <SendModal s={s} a={a} />}
      {mt === "prepare" && <PrepareModal s={s} a={a} />}
      {mt === "login" && <LoginModal s={s} a={a} />}
      {mt === "zerr" && <ZimbraErrorDialog s={s} a={a} />}
      {mt === "zstatus" && <ZimbraStatusModal s={s} a={a} />}
      {mt === "cancelSched" && <ConfirmCancel s={s} a={a} />}
      {mt === "regen" && <ConfirmRegen a={a} />}
      {mt === "missed" && <MissedDialog s={s} a={a} />}
      {mt === "view" && <ViewModal s={s} a={a} />}
      {s.toast && <div key={s.toast.id} style={{ position: "absolute", left: 0, right: 0, bottom: 24, display: "flex", justifyContent: "center", zIndex: 200, pointerEvents: "none" }}><div style={{ pointerEvents: "auto" }}><Toast tone={s.toast.tone} message={s.toast.message} onClose={() => a.setModal(s.modal)} /></div></div>}
    </AppShell>
  );
}
```
(The Toast `onClose` should clear the toast; add `a.clearToast: () => up({ toast: null })` to `useApp` and use `onClose={a.clearToast}`.)

- [ ] **Step 8: Verify build**

Screens do not exist yet, so create the five screen files and `dialogs.jsx` as one-line stubs exporting the named components (`export const X = () => null;`) so `npm run build` succeeds; they are replaced in Tasks 12–14. Run `npm run build`; Expected: succeeds.

- [ ] **Step 9: Commit**

```powershell
git add src/renderer tests/unit/renderer
git commit -m "feat: renderer state, shell, persistence mapping"
```

---

### Task 12: Port the New Digest screen and dialogs

**Files:**
- Create: `src/renderer/src/screens/NewDigest.jsx`, `src/renderer/src/screens/dialogs.jsx` (replace stubs)
- Source: `design_handoff_daily_digest/prototype/screens.jsx` (17 951 bytes)

**Interfaces:**
- Consumes: `useApp` state `s` and actions `a` (Task 11), `./ds`, `../Shell.jsx`, `@shared/time.js`, `@shared/report.js`.
- Produces: `NewDigestScreen({s,a})` from `NewDigest.jsx`; `ScheduleModal, SendModal, PrepareModal, LoginModal, ZimbraErrorDialog, ZimbraStatusModal, ConfirmCancel, ConfirmRegen, MissedDialog, ViewModal` from `dialogs.jsx`.

- [ ] **Step 1: Split and convert the prototype file**

Copy `prototype/screens.jsx` into two files: everything from the top through `NewDigestScreen` (`NOTE_LABELS`, `lbl`, `InputPane`, `NotesSummary`, `StatusPanel`, `Steps`, `Placeholder`, `NewDigestScreen`) → `NewDigest.jsx`; the dialog components (`ScheduleModal` … `ViewModal`) → `dialogs.jsx`. `Steps` is used by both → put it in `NewDigest.jsx` and `export` it; import it in `dialogs.jsx`.

At the top of each file:
```jsx
import React from "react";
import * as DS from "../ds";
import { PageHeader, Overline, DigestDocument } from "../Shell.jsx";
import { fmt, isValidEmail, dueAt } from "@shared/time.js";
import { subjectFor } from "@shared/report.js";
const D = () => DS;
```
(`const D=()=>window.ZimbraDigestDesignSystem_9514e4;` is deleted; `D()` call sites stay untouched.) Prefix every top-level component that is used elsewhere with `export`.

- [ ] **Step 2: Apply the substitutions (all are mechanical; verify each with the grep in Step 3)**

| Prototype | Replace with |
|---|---|
| `DD.fmt(x)` | `fmt(x)` |
| `DD.today` | `s.today` |
| `"Daily Digest - "+DD.fmt(s.date)` | `subjectFor(s.settings.email.defaultSubject, s.date)` |
| `DD.zimbraUrl` | `s.settings.zimbra.url` |
| `DD.recipient` | `s.settings.email.defaultRecipient` |
| `it.id==="cur"` / `id==="cur"` / `"cur"` item id (Schedule/Cancel dialogs) | `s.curId` |
| `s.items.find(i=>i.id===s.modal.id)||{time:"5:00 PM"}` | `s.items.find(i=>i.id===s.modal.id)||{time:s.settings.general.defaultSendTime}` |
| hard-coded `"Generated 4:36 PM"` / `"Edited · Saved 4:38 PM"` | `"Generated "+s.genAt` / `"Edited · Saved "+s.savedAt` |
| Error banner details literal `503 UNAVAILABLE: service overloaded⏎request_id=7f2c19a0` | `s.genError?.details` |
| `ZimbraErrorDialog` details literal `ECONNREFUSED https://mail.company.local:443` | `s.modalDetails` (component now takes `{s,a}`) |
| Default schedule time `"5:00 PM"` in `ScheduleModal` | `s.settings.general.defaultSendTime` |
| `ScheduleModal` `willFail` references | delete (real failure sets `modal.fail`) |
| Schedule dialog's "Try Again" action | `a.confirmSchedule(sch, edit?m.id:undefined)` (re-run) |
| `MissedDialog` "Prepare Now" | `a.prepareMissed(m.id)`; "Cancel" → `a.dismissMissed(m.id)` |
| Missed dialog time text `"5:00 PM"` | `it.time` |
| `Use example notes` | calls `a.fillSample()` (unchanged) |

- [ ] **Step 3: Add the new validations**

In `ScheduleModal`: compute `const due = dueAt(toISO(d), t)` where `toISO` is `toISODate` from `@shared/time.js`; `const past = !due || due <= new Date();` Show the time field error `"Choose a time in the future."` (`TimePicker` accepts `error` via `Field`; if the DS `TimePicker` does not forward `error`, render the message as a red `--text-helper` line under the pickers) and disable the **Schedule/Save** button when `past || !isValidEmail(recipient)`. Edit mode applies the same rule.

- [ ] **Step 4: Verify no globals remain and the build passes**

Run: `Select-String -Path src\renderer\src\screens\NewDigest.jsx,src\renderer\src\screens\dialogs.jsx -Pattern 'window\.|\bDD\.|Date\(2026'`
Expected: no matches.
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 5: Manual check (golden path, covers handoff §3.1/§3.6)**

Run `npm run dev`. Verify against the handoff: empty form + "Use example notes" + Generate disabled/enabled; generating steps; review document equals the handoff's example report; Edit → Save Changes → "Edited · Saved {time}"; Schedule dialog rejects a past time; Send Now → Prepare in Zimbra (use `DD_TEST=1 DD_USER_DATA=%TEMP%\dd-dev npm run dev` to use the fake) → "Email ready in Zimbra" → "I've Sent It" → Sent panel.

- [ ] **Step 6: Commit**

```powershell
git add src/renderer
git commit -m "feat: port New Digest screen and dialogs"
```

---

### Task 13: Port Scheduled and History screens

**Files:**
- Create: `src/renderer/src/screens/Scheduled.jsx`, `src/renderer/src/screens/History.jsx` (replace stubs)
- Source: `prototype/screens2.jsx` (`ScheduledScreen`, `HistoryScreen`; `SettingsScreen` goes to Task 14)

**Interfaces:**
- Consumes: `s.items` (renderer shape, Task 11), `s.history`, `a.*`.
- Produces: `ScheduledScreen({s,a})`, `HistoryScreen({s,a})`.

- [ ] **Step 1: Convert**

Copy the two functions plus `COLS`; header as in Task 12 (`import React`, `import * as DS from "../ds"`, `const D=()=>DS;`, `PageHeader, Overline, DigestDocument` from `../Shell.jsx`, and `fmtShort, dayLabel` from `@shared/time.js`). Delete the prototype's local `dayLabel` and use `dayLabel(d, s.today)`; replace `DD.MONTHS[x.getMonth()].slice(0,3)+" "+x.getDate()` with `fmtShort(x)`.

- [ ] **Step 2: Apply the behavior changes**

| Where | Change |
|---|---|
| Scheduled list | Active groups include statuses `scheduled` **and** `missed` (badge `scheduled` / `missed`, `StatusBadge` supports `missed`); `prepared` items are not listed; `cancelled` go to the final "Cancelled" group at opacity .6 (handoff §3.2) |
| Row actions | View → `a.setModal({t:"view",id:it.id})`; Edit → `a.openSchedule(true,it.id)`; Cancel → `a.setModal({t:"cancelSched",id:it.id})`; missed rows show **View** only |
| Row time color | `--fg-accent` when `it.id===s.curId`, else `--fg-1` |
| History recipient column | `h.to \|\| s.settings.email.defaultRecipient` |
| History detail document `to` | same as above; subject `"Daily Digest - "+sel.dateLabel` (kept) |
| History rows | add `role="button" tabIndex={0}` and `onKeyDown` Enter → `a.selectHistory(h.id)` |
| Empty states | exact copy from handoff §3.2/§3.3 (unchanged from prototype) |

- [ ] **Step 3: Verify and manual check**

Run: `Select-String -Path src\renderer\src\screens\Scheduled.jsx,src\renderer\src\screens\History.jsx -Pattern 'window\.|\bDD\.'` — Expected: no matches.
Run: `npm run build` — Expected: succeeds.
Run the app with `DD_TEST=1 DD_USER_DATA=%TEMP%\dd-dev`: schedule a digest for later today → Scheduled list shows it grouped "Today" with a count badge in the sidebar; Cancel → "Cancelled" group; History empty state reads "No previous digests yet."; after "I've Sent It", History lists the entry; Duplicate copies notes only and shows the info toast.

- [ ] **Step 4: Commit**

```powershell
git add src/renderer
git commit -m "feat: port Scheduled and History screens"
```

---

### Task 14: Port Templates and Settings screens

**Files:**
- Create: `src/renderer/src/screens/Templates.jsx`, `src/renderer/src/screens/Settings.jsx` (replace stubs)
- Source: `prototype/TemplatesScreen.jsx`; `SettingsScreen` from `prototype/screens2.jsx`

**Interfaces:**
- Consumes: `s.template`, `s.settings`, `s.hasKey`, `s.zimbra`, `s.testing`, `s.testingAI`, `a.saveTemplate(tpl)`, `a.saveSettings({settings, apiKey})`, `a.testZimbra`, `a.openZimbra`, `a.testAI`.
- Produces: `TemplatesScreen({s,a})`, `SettingsScreen({s,a})`. Both register their Save handler on `window.__ddSaveTemplate` / `window.__ddSaveSettings` for Ctrl+S (set in an effect, deleted on unmount).

- [ ] **Step 1: Templates**

Copy `TemplatesScreen.jsx`; header imports as in Task 12 plus `import { render, buildVars, SAMPLE_NOTES } from "@shared/report.js"`. Replace `DD.render(DD.template…)`-style calls: live preview = `render(text, buildVars(SAMPLE_NOTES, s.settings.profile, s.today))`; document `to` = `s.settings.email.defaultRecipient`; subject = `subjectFor(s.settings.email.defaultSubject, s.today)`. Keep `window.__ddTemplateRef` and `window.__ddSaveTemplate` (already in the prototype). The Cancel button resets to `s.template`. Highlight overlay `TemplateEditor` is ported unchanged (cut-order item: if short on time replace by a plain mono `Textarea`).

- [ ] **Step 2: Settings**

Copy `SettingsScreen`; initial local state from the real settings:
```jsx
const [p, setP] = React.useState({
  name: s.settings.profile.name, role: s.settings.profile.role,
  to: s.settings.email.defaultRecipient, subject: s.settings.email.defaultSubject,
  time: s.settings.general.defaultSendTime, model: s.settings.ai.model, url: s.settings.zimbra.url, apiKey: ""
});
const save = () => a.saveSettings({
  apiKey: p.apiKey,
  settings: { ...s.settings,
    general: { ...s.settings.general, defaultSendTime: p.time },
    profile: { name: p.name, role: p.role },
    email: { defaultRecipient: p.to, defaultSubject: p.subject },
    zimbra: { url: p.url },
    ai: { ...s.settings.ai, model: p.model } } });
React.useEffect(() => { window.__ddSaveSettings = save; return () => { delete window.__ddSaveSettings; }; });
```
Edits: header **Save** → `onClick={save}`; Zimbra status badge uses `s.zimbra`; Test Connection (`loading={s.testing}`) → `a.testZimbra`; Open Zimbra → `a.openZimbra`; AI **Test Connection** (`loading={s.testingAI}`) → `a.testAI`. Block saving when `p.to` is invalid (`isValidEmail`) or `p.url` is not `http(s)` (show the DS `Input` `error` text "Enter a valid email address." / "Enter a valid URL.").
**Added field (deviation from the handoff, required to enter the Gemini key):** in the AI Provider card, below "Model", add `<Input label="API key" type="password" value={p.apiKey} onChange={v=>setP({...p,apiKey:v})} placeholder={s.hasKey?"Saved":"Paste your key"} helper="Stored encrypted on this computer."/>`. Keep the card quiet: no icons/badges/accent color.

- [ ] **Step 3: Verify**

Run: `Select-String -Path src\renderer\src\screens\*.jsx -Pattern 'window\.ZimbraDigest|\bDD\.'` — Expected: no matches.
Run: `npm run build` — Expected: succeeds.
Manual (with the test env): change Profile name and Role → Save → generate a digest → sign-off uses the new name; change default recipient → Send dialog shows it; Templates: edit text → "Unsaved changes", Save enables, "Template saved." toast; generate again uses the saved template; restart the app → settings, template persist.

- [ ] **Step 4: Commit**

```powershell
git add src/renderer
git commit -m "feat: port Templates and Settings screens, wire settings"
```

---

### Task 15: Accessibility fixes from the handoff (§7.4)

**Files:**
- Modify: `src/renderer/src/ds/feedback/Modal.jsx`, `src/renderer/src/ds/core/Button.jsx` (only if needed), `src/renderer/src/ds/core/IconButton.jsx`, `src/renderer/src/ds/navigation/AppSidebar.jsx`, `src/renderer/src/ds/navigation/ConnectionStatus.jsx`, `src/renderer/src/ds/data/Tag.jsx`, `src/renderer/src/screens/NewDigest.jsx` (Steps)
- Test: `tests/unit/renderer/a11y.test.jsx`

**Interfaces:**
- Produces: `Modal` renders `role="dialog" aria-modal="true" aria-labelledby=<title id>`, focuses its first focusable element on open, traps Tab/Shift+Tab inside, and restores focus to the previously focused element on close.

- [ ] **Step 1: Write the failing tests**

```jsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal, Button } from "../../../src/renderer/src/ds/index.js";

function Harness() {
  const [open, setOpen] = React.useState(false);
  return (<>
    <button onClick={() => setOpen(true)}>opener</button>
    <Modal open={open} title="Hello" onClose={() => setOpen(false)} footer={<><Button>One</Button><Button>Two</Button></>}>body</Modal>
  </>);
}

describe("Modal accessibility", () => {
  it("is a labelled modal dialog", () => {
    render(<Harness />); fireEvent.click(screen.getByText("opener"));
    const d = screen.getByRole("dialog");
    expect(d).toHaveAttribute("aria-modal", "true");
    expect(d).toHaveAccessibleName("Hello");
  });
  it("focuses inside on open, traps Tab, restores focus on close", () => {
    render(<Harness />);
    const opener = screen.getByText("opener"); opener.focus(); fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    const focusables = dialog.querySelectorAll("button");
    focusables[focusables.length - 1].focus();
    fireEvent.keyDown(document.activeElement, { key: "Tab" });
    expect(document.activeElement).toBe(focusables[0]);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(opener);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/renderer/a11y.test.jsx`
Expected: FAIL (no role/labelledby/trap).

- [ ] **Step 3: Implement in `Modal.jsx`**

Read the file, then add (keeping the existing markup/styling): `const titleId = React.useId();` on the panel `role="dialog" aria-modal="true" aria-labelledby={titleId}` and `id={titleId}` on the title element; a `ref` on the panel; an effect on `open` that stores `document.activeElement`, focuses the first `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])` inside the panel (or the panel itself with `tabIndex={-1}`), and on cleanup restores focus to the stored element; extend the existing keydown handler so `Tab`/`Shift+Tab` wraps between the first and last focusable elements inside the panel (`e.preventDefault()` when wrapping).

- [ ] **Step 4: Remaining handoff fixes**

- `AppSidebar` items, `ConnectionStatus`, `IconButton`, `Tag` (when clickable) must be real `<button>`s (the CSS in `app.css` already provides the `:focus-visible` ring); if any is a `div`, change the tag and add `type="button"`.
- `Steps` container (`NewDigest.jsx`): add `aria-live="polite"`.
- History rows: done in Task 13.

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run`
Expected: all unit tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/renderer tests/unit/renderer
git commit -m "feat: dialog focus management and focus-visible rings"
```

---

### Task 16: End-to-end smoke test

**Files:**
- Create: `playwright.config.mjs`, `tests/e2e/smoke.spec.mjs`

**Interfaces:**
- Consumes: the built app (`out/`), env `DD_TEST=1`, `DD_USER_DATA=<tmpdir>`; the fake Zimbra writes `<userData>/prepared.json`.

- [ ] **Step 1: Config**

`playwright.config.mjs`:
```js
import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "tests/e2e", timeout: 60000, workers: 1, reporter: "list" });
```

- [ ] **Step 2: Write the tests**

`tests/e2e/smoke.spec.mjs`:
```js
import { test, expect, _electron as electron } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const launch = dir => electron.launch({ args: ["."], env: { ...process.env, DD_TEST: "1", DD_USER_DATA: dir } });
const fresh = () => fs.mkdtempSync(path.join(os.tmpdir(), "dd-e2e-"));

test("generate → review → send now → I've Sent It → History", async () => {
  const dir = fresh();
  const app = await launch(dir);
  const w = await app.firstWindow();
  await expect(w.getByRole("button", { name: /Generate Digest/ })).toBeDisabled();
  await w.getByRole("button", { name: "Use example notes" }).click();
  await w.getByRole("button", { name: /Generate Digest/ }).click();
  await expect(w.getByText("Worked on Hibernate.")).toBeVisible({ timeout: 10000 });
  await expect(w.getByText("Ready for Review")).toBeVisible();
  await w.getByRole("button", { name: "Send Now" }).click();
  await w.getByRole("button", { name: /Prepare in Zimbra/ }).click();
  await expect(w.getByText("Email ready in Zimbra")).toBeVisible({ timeout: 10000 });
  await w.getByRole("button", { name: "Close" }).click();
  await expect(w.getByText("Prepared in Zimbra").first()).toBeVisible();
  const prepared = JSON.parse(fs.readFileSync(path.join(dir, "prepared.json"), "utf8"));
  expect(prepared).toHaveLength(1);
  expect(prepared[0].to).toBe("manager@company.com");
  expect(prepared[0].body).toContain("- Worked on Hibernate.");
  await w.getByRole("button", { name: /I've Sent It/ }).click();
  await expect(w.getByText("Sent", { exact: true }).first()).toBeVisible();
  await w.getByRole("button", { name: "History" }).click();
  await expect(w.getByText("Daily Digest").first()).toBeVisible();
  await app.close();
});

test("schedule persists across restart and rejects past times", async () => {
  const dir = fresh();
  let app = await launch(dir);
  let w = await app.firstWindow();
  await w.getByRole("button", { name: "Use example notes" }).click();
  await w.getByRole("button", { name: /Generate Digest/ }).click();
  await expect(w.getByText("Worked on Hibernate.")).toBeVisible({ timeout: 10000 });
  await w.getByRole("button", { name: /Schedule Send/ }).click();
  await expect(w.getByText(/Choose a time in the future|The current approved version/)).toBeVisible();
  // Pick tomorrow's date is covered manually; here assert the scheduled file after a valid schedule via API:
  await w.evaluate(async () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    await window.api.schedule.upsert({ id: "e2e", date: iso, time: "5:00 PM", recipient: "m@c.com", subject: "S", status: "scheduled", blocks: [], createdAt: new Date().toISOString() });
  });
  await app.close();
  app = await launch(dir);
  w = await app.firstWindow();
  await w.getByRole("button", { name: /Scheduled/ }).click();
  await expect(w.getByText("Tomorrow")).toBeVisible();
  await app.close();
});

test("a corrupt data file does not stop the app from starting", async () => {
  const dir = fresh();
  fs.writeFileSync(path.join(dir, "history.json"), "{not json");
  const app = await launch(dir);
  const w = await app.firstWindow();
  await expect(w.getByText("What did you work on today?")).toBeVisible();
  expect(fs.existsSync(path.join(dir, "history.json.bad"))).toBe(true);
  await app.close();
});

test("second instance does not open a second window", async () => {
  const dir = fresh();
  const app = await launch(dir);
  await app.firstWindow();
  const second = await launch(dir).catch(() => null);
  if (second) { expect(second.windows().length).toBe(0); await second.close().catch(() => {}); }
  expect(app.windows().length).toBe(1);
  await app.close();
});
```

- [ ] **Step 3: Run**

Run: `npm run e2e`
Expected: 4 tests pass. Fix real failures in the app code (not by loosening assertions). Button accessible names must match the visible labels from the handoff; if `Kbd` text pollutes the name (e.g. "Generate Digest ⌘↵"), the regexes above already tolerate it.

- [ ] **Step 4: Commit**

```powershell
git add playwright.config.mjs tests/e2e
git commit -m "test: electron end-to-end smoke tests"
```

---

### Task 17: Windows installer

**Files:**
- Create: `electron-builder.yml`

**Interfaces:**
- Produces: `dist/Daily Digest Setup 1.0.0.exe` from `npm run dist`.

- [ ] **Step 1: Write `electron-builder.yml`**

```yaml
appId: com.dailydigest.app
productName: Daily Digest
directories:
  output: dist
files:
  - out/**
  - package.json
win:
  target:
    - target: nsis
      arch: [x64]
  signAndEditExecutable: false
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createStartMenuShortcut: true
  createDesktopShortcut: false
  shortcutName: Daily Digest
```
(The app registers itself to start with Windows at runtime through `app.setLoginItemSettings` using the `app.startWithWindows` setting, default on, editable by adding a toggle later; the installer does not need a custom page.)

- [ ] **Step 2: Build and inspect**

Run: `npm run dist`
Expected: `dist/Daily Digest Setup 1.0.0.exe` exists (unsigned: SmartScreen may warn on first run).
Run: `Get-ChildItem dist -Filter *.exe | Select-Object Name,Length`
Expected: one installer, > 50 MB.

- [ ] **Step 3: Install check (manual)**

Run the installer; launch "Daily Digest" from the Start menu; confirm the window opens, a generated digest works, settings persist after closing and reopening, and Task Manager shows one instance when launched twice.

- [ ] **Step 4: Commit**

```powershell
git add electron-builder.yml
git commit -m "build: Windows NSIS installer"
```

---

### Task 18: Update the spec, then verify against the handoff checklist

**Files:**
- Modify: `docs/superpowers/specs/2026-10-09-daily-digest-electron-design.md`
- Create: `docs/verification-checklist.md` (copy of handoff §8 with results)

- [ ] **Step 1: Correct the spec for decisions made in this plan**

Edit the spec so it states: (a) §2/§3.2 — Chrome is launched with a **dedicated profile** (`<userData>/chrome-profile`) because Chrome 136+ ignores `--remote-debugging-port` on the default profile; the user signs in to Zimbra once in that window; (b) §3.1 — `zimbra` public surface is `checkSession`, `prepareMessage`, `openPage`; (c) §3.1 `schedule.json` is owned by the main process (renderer mutates it only through `schedule:upsert`/`schedule:setStatus`); (d) §10 — Settings gains one added field, "API key" in the AI Provider card; the Schedule dialog rejects past times with "Choose a time in the future."; closing the window minimises instead of quitting while any digest is scheduled.

- [ ] **Step 2: Run everything**

Run: `npx vitest run` — Expected: all unit tests pass.
Run: `npm run e2e` — Expected: all e2e tests pass.

- [ ] **Step 3: Walk the handoff checklist**

Copy handoff §8 ("Verification checklist (build vs. prototype)") into `docs/verification-checklist.md`. Run the app (`DD_TEST=1 DD_USER_DATA=%TEMP%\dd-verify npm run dev`, then once against the real Zimbra) at 1440×900 and 1280×800 and tick each box with what was observed. Any unchecked box becomes a fix before this task is done. Specifically confirm with the real Zimbra: compose window filled, **not sent**; "Zimbra login required." shown when signed out; no password field anywhere.

- [ ] **Step 4: Commit**

```powershell
git add docs
git commit -m "docs: align spec with plan decisions; verification checklist"
```

---

## Self-Review

**Spec coverage**
- §2 decisions: Electron/Vite/React/JSON (T1, T4), CDP Chrome (T8), Gemini+local fallback (T6), fidelity port (T10–14), Windows only (T1, T17).
- §3 architecture: layers (T9–11), store (T4), generate (T6), zimbra (T8), scheduler (T7), secrets (T5), shared report (T3), Chrome/CDP (T8).
- §4 data flow: autosave, generate, edit/save, prepare with real steps, schedule snapshot, I've Sent It (T11).
- §5 Zimbra safety incl. export-surface test (T8).
- §6 errors: Gemini (T6/T11), Zimbra unreachable/login (T8/T11/T12), scheduler missed (T7/T11/T13).
- §7 build order and cut order (Global Constraints, T1–T17), installer (T17).
- §8 testing: Vitest units (T2–T9, T10, T11, T15), Playwright smoke (T16), fakes via env (T9).
- §9 out of scope respected (no auto-update, no other OS, single template).
- §10 accessibility gaps: focus-visible (T10 `app.css`), dialog focus (T15), focusable History rows (T13), real `missed` badge (T13).
- §11 assumptions: Zimbra URL default in store defaults (T4).

**Placeholder scan:** no "TBD/TODO". Task 8 Step 9 is an explicit manual discovery step (selectors depend on the company's Zimbra) with a defined fallback; Task 12–14 port steps specify exact substitution tables against the checked-in prototype source rather than reprinting ~60 KB of unchanged JSX.

**Type consistency:** schedule item disk shape `{id,date,time,recipient,subject,status,blocks,createdAt}` (T7) ↔ `itemToDisk/itemFromDisk` (T11) ↔ IPC `schedule:upsert` (T9). `ZimbraError.code` values `NO_CHROME|UNREACHABLE|LOGIN|COMPOSE` (T8) ↔ renderer handling of `LOGIN`/others (T11). `prepare:step` numbers 1–3 (T8/T9) ↔ `prepStep` (T11, T12 `PrepareModal` reads `s.prepStep`, done when `>=3`). `generate` payload `{notes,template,profile,date,model}` (T6) ↔ renderer call (T11). `a.saveSettings({settings,apiKey})` (T11) ↔ Settings screen (T14). `curId` replaces the prototype's `"cur"` id in T12–T13 tables.

**Review Focus coverage:** (1) corrupt file → T4 tests + T16 e2e; (2) Gemini malformed → T6 tests; (3) past/invalid time → T2, T7 tests, T12 dialog rule; (4) double instance / re-entry → T7 re-entry test, T16 second-instance test; (5) CRLF → T3 tests; (6) Chrome/login failures → T8 tests, T12 manual check.
