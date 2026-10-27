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

- **AI-written sentences** from keyword notes, written by a small model running on your own computer through Ollama. Your notes stay on your PC. If the local model fails you can optionally let Groq or Gemini take over, with your approval and with names, emails and links hidden first. With no AI at all it uses simple built-in text rules.
- **Multiple recipients.** Separate addresses with commas, semicolons or spaces.
- **Back-dated digests.** A "Digest date" picker (today or earlier) lets you fill in days you missed. The date drives the subject and the report.
- **Configurable date format** for the subject and the report date: `October 9, 2026`, `Friday, October 9, 2026`, `Oct 9, 2026`, `10/09/2026`, `09/10/2026` or `2026-10-09`.
- **Scheduling.** Pick a date and time. When it is due, the app prepares the email in Zimbra. If the app was not running at that time, you get a "Missed" prompt on the next launch and nothing is auto-sent.
- **Editable report template** with variables, plus a live preview.
- **History** of sent digests, with a Duplicate action that copies the notes into a new draft.
- **Start with Windows** (on by default) so scheduled digests can fire. Closing the window minimises the app instead of quitting while anything is scheduled or while its Zimbra Chrome window is open (quitting the app closes that Chrome window).

## Install

Download the latest installer from the [Releases page](https://github.com/jahcrtvs/ZimbraEmailAutomation/releases) and run `Daily Digest Setup X.Y.Z.exe`.

- This repository is private, so you must be signed in to GitHub with access to it.
- The installer is **not code-signed**. On first run Windows SmartScreen shows "Windows protected your PC". Click **More info**, then **Run anyway**.
- It installs per user. You can change the install folder.

### Requirements

- Windows 10 or 11 (x64).
- Google Chrome installed. The app drives Chrome to reach Zimbra.
- An account on your company's Zimbra webmail.
- [Ollama](https://ollama.com/download) with a small model for the AI-written sentences (see [Set up the local AI](#set-up-the-local-ai)). A PC with 8 GB of RAM can run the default model; 16 GB or a GPU is more comfortable.
- Optional: a [Groq](https://console.groq.com/) or [Gemini](https://aistudio.google.com/) API key, used only as a fallback when the local AI fails.

## First-time setup

Open **Settings** and fill in:

| Section | What to set |
|---|---|
| General | Default send time |
| Profile | Your name and role (used in the sign-off) |
| Email | Default recipients, default subject (`{date}` is replaced), date format |
| Zimbra | The URL of your Zimbra webmail |
| Local AI | Server address and model (the defaults work with Ollama). Click **Save and check** |
| Cloud fallback | Optional. Provider (None, Groq or Gemini), ask-each-time or automatic, API key, words to hide |

Then click **Open Zimbra** (in the Zimbra status dialog or from the prepared-email panel). The app opens its own Chrome window. **Sign in to Zimbra there once.** The session is kept in a dedicated Chrome profile, so you normally will not need to sign in again.

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

Do not pick a model whose name ends in `-cloud` or `:cloud`. Ollama runs those on its own servers, so your notes would leave your computer. Settings warns you if you do. For such a model, or a server address that is not on this computer, the app treats the server like a cloud service: emails, links, names and your hidden words are replaced first, notes that look like they hold a password or key are not sent, and past reports are never shown to it.

Other servers that speak the OpenAI chat API (LM Studio, llama.cpp) may work if you change the server address, but only Ollama is tested.

### Optional cloud fallback

If the local AI fails (for example Ollama is not running) you can let one cloud provider write the digest instead.

- Choose the provider in **Settings > Cloud fallback** and paste its API key. The key is encrypted on your computer.
- By default the app **asks you each time** and shows the exact text it would send. You can switch to **Send automatically**.
- Before anything is sent, emails, links, IP addresses, phone numbers, long tokens, your name and the words you list are replaced with placeholders, then put back in the result. Notes that look like they contain a password or key, or that are very long, are never sent.
- A digest written by a cloud service says so in a banner. Settings lists your last cloud sends (time, provider, reason, size, never the content).
- Free Gemini API usage may be used by Google to improve its products. Prefer Groq, or a paid Gemini project, if your notes are sensitive.

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

- The local model gets your notes with a short set of rules and a few examples of how you usually write (taken from reports you have already sent, topped up with built-in examples). It writes the note and then one formal sentence for it, for every item. A sentence that adds a number or name your note did not mention, or that is about a different item, is replaced by the built-in rule for that item, and the report says how many were replaced. Sentences appear on screen as they are written. A typical report takes 30 to 45 seconds on a laptop without a graphics card; see `docs/local-ai-benchmark.md`. This needs a recent Ollama (structured output); if the app says the server rejected the request, update Ollama.
- If the local model fails, you see why (not running, model missing, too slow, unusable answer). Then, depending on your Cloud fallback settings, the app asks before sending sanitised notes to the cloud, sends them automatically, or builds the digest with its built-in text rules. Your notes are never lost.
- Cloud calls retry rate-limit and server errors up to 3 times. If the cloud also fails, the built-in text rules are used.
- Always read the report before sending. A small model may add general context that a keyword implies, and that context can be wrong.

## Privacy and safety

- **No Zimbra password** is ever typed, read or stored. You sign in yourself in Chrome.
- The app controls its Chrome window over a private pipe, not a debugging port, so other programs on your computer cannot attach to your signed-in Zimbra session.
- **API keys** (only needed for the optional cloud fallback) are encrypted with Windows (Electron `safeStorage`) and stay in the main process. The settings screen can write a key but can never read it back.
- With the local AI, your notes go only to the Ollama server on your own computer. The main process, not the screen, decides what is sent and where, from your saved settings.
- Only the sanitised text of your notes can ever go to a cloud provider, and only after you approve it (or turn on automatic sending). Your Zimbra content is never sent anywhere.
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
| "Local AI is not running." | Install Ollama from <https://ollama.com/download> and start it, then **Save and check** in Settings. If Ollama is on another port or machine, change the server address. |
| "Model not installed." | Run the command Settings shows, for example `ollama pull qwen2.5:3b-instruct`, then check again. |
| "The local model took too long to answer." | The first run after a pause loads the model and can be slow. Try again, or pick a smaller model. |
| "AI was not used for this digest." | The banner says why. The digest was built with the built-in text rules. Fix the cause and click **Regenerate**. |
| The cloud dialog never appears | You have no fallback provider or key saved, so the app goes straight to the built-in rules. |

The selectors that find Zimbra's fields live in `src/main/zimbra.selectors.js`. They were written for the classic Zimbra web client and might need adjusting for your server. Quit Daily Digest, then run `node scripts/probe-zimbra.mjs <your-zimbra-url>`. It opens Chrome with the app's profile; open a New Message there and press Enter in the terminal to list the real element ids.

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

- **Zimbra automation** uses Playwright to launch the installed Chrome with the app's own profile (`launchPersistentContext`, over a pipe; no debugging port is opened). The module exposes only `checkSession`, `prepareMessage` and `openPage`.
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

### Updates reaching users

On launch, and every 4 hours while open, the app asks the website (`site/api/version.js`) for the newest version and the oldest allowed one:

- **Newer release exists:** a dismissible "Version X is available" banner with a Download button. The newest version is the latest GitHub Release, so publishing a release is all it takes.
- **Version below the minimum:** a full-screen "Update required" screen replaces the app until the user installs the new version. To force an update, set `MIN_VERSION` (for example `1.3.0`) in the Vercel project settings and redeploy. Leave it unset or `0.0.0` to force nothing.
- **Check fails (offline, website down):** the app opens normally.

Only versions that contain this check can be forced, so users on 1.2.2 or earlier have to install the first release with it by hand. The website address is `UPDATE_SITE` in `src/main/index.js` (override with `DD_UPDATE_SITE`); change it if the site moves to a custom domain.

## Status

Known limits:

- The Zimbra selectors have been tested against one classic Zimbra setup. Other versions may need changes.
- The installer is unsigned.
- Windows only.
- The Groq model name and its JSON mode have not been checked against Groq's current model list.
- Small local models can phrase things oddly or add context a keyword only hints at. Read the report before sending.
- To compare models on your own notes, run `node scripts/try-local.mjs notes.json qwen2.5:3b-instruct qwen2.5:7b-instruct` (needs Ollama running).

## License

No license has been chosen. All rights reserved by the repository owner until one is added.
