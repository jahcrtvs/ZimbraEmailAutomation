# Daily Digest

A Windows desktop app that turns rough daily notes into a formal status email, then prepares that email in your company's Zimbra webmail so you can review it and press Send yourself.

> **The app never presses Send.** It opens a New Message in Zimbra and fills in the recipients, subject and body. You read the message in Zimbra and send it yourself. Nothing in the code locates or clicks a send control, and a unit test guards that.

## What it does

1. You type short, lazy notes (a few keywords per line are enough) into five fields: today's work, topics or lessons, still working on, blockers, and tomorrow.
2. The app expands each note into one formal sentence and lays the result out as a report: **Task Today**, **Plans for the Week**, a sign-off with your name and role.
3. You review and edit the report, then either **Send Now** or **Schedule Send**.
4. For either one, the app opens Zimbra in Chrome, starts a New Message, and fills in To, Subject and Body. You press Send.
5. Afterwards you click **I've Sent It** and the digest is recorded in History.

### Features

- **AI-written sentences** from keyword notes, using Gemini or Groq. Without an API key it falls back to simple built-in text rules.
- **Multiple recipients.** Separate addresses with commas, semicolons or spaces.
- **Back-dated digests.** A "Digest date" picker (today or earlier) lets you fill in days you missed. The date drives the subject and the report.
- **Configurable date format** for the subject and the report date: `October 9, 2026`, `Friday, October 9, 2026`, `Oct 9, 2026`, `10/09/2026`, `09/10/2026` or `2026-10-09`.
- **Scheduling.** Pick a date and time. When it is due, the app prepares the email in Zimbra. If the app was not running at that time, you get a "Missed" prompt on the next launch and nothing is auto-sent.
- **Editable report template** with variables, plus a live preview.
- **History** of sent digests, with a Duplicate action that copies the notes into a new draft.
- **Start with Windows** (on by default) so scheduled digests can fire. Closing the window minimises the app instead of quitting while anything is scheduled.

## Install

Download the latest installer from the [Releases page](https://github.com/jahcrtvs/ZimbraEmailAutomation/releases) and run `Daily Digest Setup X.Y.Z.exe`.

- This repository is private, so you must be signed in to GitHub with access to it.
- The installer is **not code-signed**. On first run Windows SmartScreen shows "Windows protected your PC". Click **More info**, then **Run anyway**.
- It installs per user. You can change the install folder.

### Requirements

- Windows 10 or 11 (x64).
- Google Chrome installed. The app drives Chrome to reach Zimbra.
- An account on your company's Zimbra webmail.
- Optional: a [Gemini](https://aistudio.google.com/) or [Groq](https://console.groq.com/) API key for the AI-written sentences.

## First-time setup

Open **Settings** and fill in:

| Section | What to set |
|---|---|
| General | Default send time |
| Profile | Your name and role (used in the sign-off) |
| Email | Default recipients, default subject (`{date}` is replaced), date format |
| Zimbra | The URL of your Zimbra webmail |
| AI Provider | Provider (Gemini or Groq), model, and your API key |

Then click **Open Zimbra** (in the Zimbra status dialog or from the prepared-email panel). The app opens its own Chrome window. **Sign in to Zimbra there once.** The session is kept in a dedicated Chrome profile, so you normally will not need to sign in again.

## Using it

### Make a digest

1. Go to **New Digest**.
2. Write your notes. Click **Use example notes** to see the format.
3. Click **Generate Digest** (Ctrl+Enter).
4. Review the report. Use **Edit** to change any line, or **Regenerate** to try again.
5. Click **Send Now** and then **Prepare in Zimbra**. Check the message in Zimbra and press Send there.
6. Back in the app, click **I've Sent It**.

### Fill in a missed day

1. On **New Digest**, set **Digest date** to the day you missed.
2. Enter that day's notes and generate as usual.
3. Prepare it in Zimbra. The subject and report use the date you picked.

### Schedule a digest

1. Generate and review a digest.
2. Click **Schedule Send** (Ctrl+Shift+S), then choose a date, time and recipients.
3. Keep the app running. At the due time it prepares the email and shows a notification. You still press Send in Zimbra.

You can view, edit or cancel scheduled digests on the **Scheduled** page.

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | New digest |
| Ctrl+Enter | Generate digest |
| Ctrl+Shift+S | Schedule send |
| Ctrl+S | Save (edits, template, settings) |

## How AI generation works

- Each note is sent to the provider you chose in Settings, with instructions to write one formal sentence per item, fix the spelling of technical names, and never invent facts, numbers or results.
- Transient errors (rate limits, server errors) are retried automatically, up to 3 attempts.
- If the call fails, you see an error banner. Your notes are kept and **Try Again** re-runs the request.
- With no API key saved, the app uses its built-in text rules instead.
- Always read the report before sending. The model may add general context that a keyword implies, and that context can be wrong.

## Privacy and safety

- **No Zimbra password** is ever typed, read or stored. You sign in yourself in Chrome.
- **API keys** are encrypted with Windows (Electron `safeStorage`) and stay in the main process. The settings screen can write a key but can never read it back.
- Only the text of your notes is sent to the AI provider you select. Your Zimbra content is never sent anywhere.
- All data is stored locally as JSON files in the app's user-data folder (history, schedule, template, settings and your current draft).
- If a key was ever shown in a chat, a log or a commit, treat it as exposed and revoke it at the provider.

## Troubleshooting

| Problem | What to do |
|---|---|
| "Google Chrome is required." | Install Chrome, then click Retry. |
| "Unable to connect to Zimbra." | Check the Zimbra URL in Settings and your network, then Retry. |
| "Zimbra login required." | Click Open Zimbra and sign in to the Chrome window the app opens. |
| "Unable to prepare the email." | Zimbra opened but the message could not be filled in. The details show which field failed. Close any old compose tab and retry. |
| A recipient comes through wrong | The app reads the To field back and reports any address Zimbra altered. Retry, or open Zimbra and correct it. |
| Scheduled digest did not run | The app must be running at the due time. Missed items are offered on next launch. |

The selectors that find Zimbra's fields live in `src/main/zimbra.selectors.js`. They were written for the classic Zimbra web client and might need adjusting for your server. Run `node scripts/probe-zimbra.mjs <your-zimbra-url>` with the New Message window open to list the real element ids.

## Development

Requires Node.js 22 and Windows.

```bash
npm install
npm run dev        # start the app with hot reload
npm test           # unit tests (Vitest)
npm run e2e        # build, then end-to-end smoke tests (Playwright)
npm run build      # production build into out/
npm run dist       # build the Windows installer into dist/
```

If `npm run dev` says Electron is not installed, run `node node_modules/electron/install.js`.

Tests and e2e runs use fakes only. They never launch real Chrome, contact Zimbra or call an AI provider.

### Project layout

```
src/main/        Electron main process: store, secrets, generate, scheduler,
                 chrome launcher, Zimbra automation, IPC
src/preload/     the small, named API exposed to the UI as window.api
src/renderer/    React UI: screens, dialogs, design-system components
src/shared/      report rules and date/time helpers used by both sides
tests/           unit and e2e tests
scripts/         probe-zimbra.mjs, a helper that lists Zimbra's element ids
docs/            design spec, implementation plan, verification checklist
design_handoff_daily_digest/   the original UI spec and prototype
```

Key design points:

- **Zimbra automation** uses Playwright over the Chrome DevTools Protocol, attached to a Chrome that the app launches with its own profile. The module exposes only `checkSession`, `prepareMessage` and `openPage`.
- **Schedule data** is owned by the main process. The UI changes it only through `schedule:upsert` and `schedule:setStatus`.
- **Recipients** are inserted one whole address at a time and committed with `;`, then verified by reading the To row back.

More detail: [design spec](docs/superpowers/specs/2026-10-09-daily-digest-electron-design.md) and [verification checklist](docs/verification-checklist.md).

## Releasing

Versions follow semantic versioning. Choose the bump that matches the change:

```bash
npm run release:patch   # bug fix            1.1.0 -> 1.1.1
npm run release:minor   # new feature        1.1.0 -> 1.2.0
npm run release:major   # breaking change    1.1.0 -> 2.0.0
git push --follow-tags
```

Each command bumps `package.json`, commits `chore: release vX.Y.Z` and tags it. Pushing the tag runs the GitHub Actions workflow in `.github/workflows/release.yml`, which runs the tests, builds the Windows installer, and publishes a GitHub Release. The release notes list the commit messages since the previous version, so write clear commit messages.

The installed app shows its version at the bottom of **Settings**.

## Status

Known limits:

- The Zimbra selectors have been tested against one classic Zimbra setup. Other versions may need changes.
- The installer is unsigned.
- Windows only.
- The Groq model name and its JSON mode have not been checked against Groq's current model list.

## License

No license has been chosen. All rights reserved by the repository owner until one is added.
