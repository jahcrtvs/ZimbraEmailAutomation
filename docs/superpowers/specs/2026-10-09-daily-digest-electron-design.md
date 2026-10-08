# Daily Digest (Electron) — Design Spec

Date: 2026-10-09
Source of truth for UI/copy/behavior: `design_handoff_daily_digest/README.md` (referred to below as "the handoff"; section numbers like §3.1 refer to it). This spec records the decisions made on top of it and the architecture. Where this spec is silent, the handoff governs.

## 1. Purpose and success criteria

Daily Digest is a personal desktop utility (single user, Windows). The user types rough daily notes, generates a formatted report, reviews/edits it, then either sends now or schedules it. Both paths only **prepare** the email in the company's Zimbra webmail; **the app never presses Send**.

Success = the build passes the handoff's verification checklist (§8) and no code path can click Send in Zimbra.

## 2. Decisions

| Topic | Decision |
|---|---|
| Stack | Electron + Vite + React (JS), JSON file store |
| Zimbra | Playwright-core attached over CDP to the user's own Chrome (`--remote-debugging-port=9222`, normal profile, existing login). No passwords handled. |
| Report generation | Gemini when an API key is saved; local text rules (`polish`/`buildVars`/`render`) when no key is saved. A Gemini failure shows the handoff error state (§3.1 A); notes are preserved and Try Again re-runs the call. |
| Fidelity | High; UI ported nearly line-for-line from the prototype JSX and DS components |
| Platform | Windows only (including the installer); Ctrl replaces ⌘ in shortcuts |

## 3. Architecture

### 3.1 Layers
- **Renderer (React).** Ported screens, dialogs and DS components as ES modules. UI state only (the prototype's `s`/`a` shape). No Node access. Never sees the API key or Zimbra.
- **Preload.** Exposes a typed `window.api` with named calls only: `generate`, `prepareInZimbra`, `checkZimbra`, `openZimbra`, `loadStore`, `saveStore`, `testAI`, `saveSecret`/`hasSecret`, plus an event subscription for prepare progress. Nothing generic (no arbitrary IPC, no raw `ipcRenderer`).
- **Main process.** Modules, each with one purpose:
  - `store` — JSON files in `app.getPath('userData')`: `history.json`, `schedule.json`, `template.json`, `settings.json`, `draft.json`. Atomic writes (temp file + rename).
  - `generate` — chooses Gemini or local rules; always passes variables through the shared `render(template, vars)`.
  - `zimbra` — Playwright over CDP. Public surface is exactly `checkSession` and `prepareMessage`.
  - `scheduler` — 30 s timer; at the due time runs the same prepare flow and marks the item `prepared`; on launch marks overdue `scheduled` items `missed`.
  - `secrets` — Gemini key stored via Electron `safeStorage`; never sent to the renderer.
- **Shared module** (`shared/report.js`): `polish`, `buildVars`, `render`, per handoff §5.5, used by main (generation, fallback) and renderer (Templates live preview).

### 3.2 Chrome / CDP
If nothing is listening on `localhost:9222`, the app offers to launch Chrome with `--remote-debugging-port=9222` and the user's normal profile. Connection failure shows the "Unable to connect to Zimbra." dialog (handoff §3.6) with "Nothing was sent."

## 4. Data flow

1. Notes autosave (debounced) to `draft.json`; errors and crashes never lose them.
2. Generate → `api.generate({notes, template, profile, date})` → `blocks`. Errors surface through the error stage.
3. Edit/Save updates `blocks` (the approved version).
4. Send Now → `api.prepareInZimbra({to, subject, blocks})`; main emits real progress steps (`opening`, `checking`, `preparing`, `done`) that drive the Preparing dialog (no timers).
5. Schedule → snapshot of approved blocks + date/time/recipient saved to `schedule.json`; the scheduler later runs the same prepare flow.
6. "I've Sent It" → history entry with the real clock time; draft cleared.

Gemini request: five note fields + template; response JSON `{tasks[], topics[], weekly_plans[], blockers[]}` (one past-tense sentence ending in a period per item, no invented facts); then `render`.

Data shapes: handoff §6 unchanged. Hard-coded values in the prototype (today = Oct 8 2026, "4:36 PM", "4:38 PM", "4:41 PM", profile name) are replaced by the real clock and the Profile settings. Settings are wired per handoff §7.3 (Profile → sign-off; Email defaults → Send/Schedule dialogs and subject; Default send time → Schedule dialog; Zimbra URL → connection tests; Model → Gemini call).

## 5. Zimbra safety (enforced in code)

- `zimbra` exposes only `checkSession` and `prepareMessage`. `prepareMessage` opens a New Message, fills To/Subject/Body, then returns. No function selects or clicks a Send control.
- Nothing is typed on a login page. "Login required" asks the user to sign in in Chrome.
- Status wording follows the handoff: "Prepared in Zimbra" until the user confirms with "I've Sent It".
- A unit test asserts the module's exported surface so a send function cannot be added unnoticed.

## 6. Errors

| Failure | Behavior |
|---|---|
| Gemini call fails | Error banner "Unable to generate the digest." + View details; notes kept; Try Again |
| Zimbra unreachable | "Unable to connect to Zimbra." dialog; Retry / Open Zimbra; "Nothing was sent." |
| Zimbra not logged in | "Zimbra login required." dialog |
| Scheduler failure or app not running at due time | Item becomes `missed`; Missed dialog on next launch (Prepare Now / Cancel); nothing auto-sent |

## 7. Build order

1. Scaffold Electron + Vite + React; copy tokens/fonts/DS components; `lucide-react` for icons.
2. Port Shell, five screens, all dialogs on in-memory state with the shared report rules; reproduce the handoff's example report and presets.
3. Persistence (`store`) and Settings wiring.
4. Gemini + `safeStorage`; Zimbra over CDP with real progress.
5. Scheduler, missed-on-launch check, desktop notification when an email is prepared.
6. Tests and walk the verification checklist.
7. Windows installer: `electron-builder` NSIS target (x64), per-user install, Start Menu shortcut, app name "Daily Digest". The scheduler needs the app running, so the installer offers a "Start with Windows" option (default on). Unsigned for now, so SmartScreen may warn on first run.

Cut order if time is short (handoff §7.1): Templates highlight overlay → DatePicker popover → Zimbra automation (fall back to opening a compose URL) → Settings test buttons.

## 8. Testing

- Vitest: shared `polish`/`buildVars`/`render` against the handoff's example output; store; scheduler due/missed logic with a fake clock; the `zimbra` export-surface guard.
- Playwright smoke test of the Electron renderer through each screen against the handoff checklist.
- Zimbra and Gemini sit behind interfaces; tests use fakes.

## 9. Out of scope

Auto-update; macOS/Linux (the installer is Windows-only); multiple templates (shape allows it, one is shipped); any mail-sending capability (permanent); prototype-only pieces (state switcher, scale-to-fit, mock traffic-light frame; the native window frame is used).

## 10. Handoff accessibility gaps to fix

`:focus-visible` ring on buttons, icon buttons, nav items, rows and tags; dialog focus trap, focus-first-control and restore-on-close, `aria-labelledby`; keyboard-focusable History rows (Enter opens); a real `missed` StatusBadge for missed schedule items.

## 11. Assumptions

- Zimbra URL defaults to `https://mail.company.local` and is editable in Settings.
- The user is already signed in to Zimbra in Chrome.
- Single user, single machine.
