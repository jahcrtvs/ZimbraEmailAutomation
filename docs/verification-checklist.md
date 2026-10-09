# Verification checklist (build vs. prototype)

Copied from handoff §8 and checked on 2026-10-09 against v1.1.0 plus follow-up fixes.

How to read it:
- `[x]` — confirmed by code inspection, an automated test, or the user's screenshots of the running app and real Zimbra.
- `[ ]` — **not observed.** Needs a manual look in the running app (`npm run dev`, 1440×900 and 1280×800), because pixel sizes and visual styling cannot be confirmed from code or tests.

Automated evidence: `npm test` — 13 files, 96 tests pass. `npm run e2e` — 4 of 4 pass (generate → send → history; schedule persists across restart and rejects past times; corrupt data file; single instance).

## Shell
- [ ] Window 1440×900 and 1280×800 both usable; title bar 40 px; sidebar 208 px; page header 60 px (title bar overlay is set to 40 px in `src/main/index.js`; the rest is visual)
- [x] Sidebar shows exactly New Digest, Scheduled, History, Templates, Settings (`src/renderer/src/App.jsx`)
- [ ] Active item styled (bg `#262626`, orange icon)
- [x] Scheduled count badge appears only when ≥1 scheduled item (`nSch || undefined`)
- [x] "Zimbra Connected/Disconnected" opens the status dialog (`ZimbraStatusModal`)
- [x] Title-bar status: Ready / Offline / Generating… / Scheduled · {time} (`AppShell.jsx`)
- [x] Shortcuts use Ctrl (spec §2): handler accepts Ctrl, and the labels now read Ctrl+N, Ctrl+↵, Ctrl+Shift+S, Ctrl+S. Label widths not checked visually.

## New Digest
- [x] Empty form, header "New Daily Digest", date, badge "Draft"
- [x] Five labeled textareas, four marked Optional
- [x] "Use example notes" visible only when empty
- [x] Generate Digest disabled when empty
- [ ] Preview placeholder skeleton + caption before generation
- [x] Generating: "Generating…" on the button, form dimmed, title-bar status
- [x] Generation error: banner, "View details", Try Again, notes preserved (unit-tested in `generate.test.js`)
- [ ] Review layout: 320 px notes column + white document; header strip To/Subject; uppercase sections; Regards block (seen in the user's screenshots; pixel sizes not measured)
- [x] Action bar: Edit, Regenerate, Send Now, Schedule Send
- [x] Edit: per-section textareas, Cancel, Save Changes; toast "Saved"
- [x] Regenerate confirms only when saved edits exist (`regenerate` checks `savedAt`)
- [x] "Edit notes" returns to the form with notes intact
- **Added:** Digest date picker (today or earlier) — unit-tested date logic; picker UI not observed.

## Sending
- [x] Send dialog shows recipient + subject; button reads "Prepare in Zimbra"
- [x] Disconnected Zimbra → login-required dialog, no password field (`dialogs.jsx`). Not yet seen with a signed-out real Zimbra.
- [x] Preparing dialog with 3 steps, then "Email ready in Zimbra" with Open Zimbra
- [x] Prepared panel: "Prepared in Zimbra", Open Zimbra, I've Sent It (user screenshot)
- [x] I've Sent It adds a History entry (e2e)
- [x] Connection / compose / no-Chrome error dialogs with "Nothing was sent." (error code now survives the preload bridge, commit `e5dfb75`)
- [x] **The app never clicks Send in Zimbra.** `zimbra.js` has one click (New Message), asserted by a unit test; no selector mentions a send control. The user's screenshot shows the compose window filled and unsent.
- [x] Real Zimbra: compose window filled with To (two bubbles), Subject and Body. The recipient read-back check (`1f08f23`) is **not yet confirmed live.**

## Scheduling
- [x] Schedule dialog: date, time, recipients (validated), "You press Send." note
- [x] Past times rejected: "Choose a time in the future." (e2e)
- [x] Failure banner "Unable to schedule the digest." / "No changes were made."
- [x] Schedule persists across restart (e2e)
- [x] Edit Schedule toast "Schedule updated."; cancel toast "Digest cancelled."
- [ ] Locked panel after scheduling (LED time, date, recipient, Approved version note) and read-only document
- [ ] Cancelled row at 60% opacity
- [ ] Scheduled list: grouping, 6 columns, badges, empty state
- [x] Missed dialog: "No email was sent." with Prepare Now / Cancel (`MissedDialog`; scheduler logic unit-tested)

## Supporting
- [ ] History list columns, detail view with back + Duplicate, empty state
- [x] Duplicate loads notes only (`duplicate` in `useApp.js`)
- [x] Templates: save toast "Template saved."
- [ ] Templates: orange variable highlighting, 8 clickable tags, Save/Cancel only when dirty
- [x] Settings: General, Profile, Email, Zimbra, AI Provider; Save toast
- [x] No sparkle/robot wording in the UI (search for those icon names finds none)
- [x] No password field except the AI "API key" input (Settings), which is not a Zimbra password
- [ ] LED Dot-Matrix only for scheduled/sent times; JetBrains Mono only for raw notes, template editor and error details

## Open items found during this review
1. **Fixed:** scheduled emails ignored the Date format setting (`src/main/index.js`).
2. **Fixed:** an e2e test failed after 5 PM because two elements matched one locator.
3. **Fixed:** UI showed ⌘ shortcut glyphs; labels now say Ctrl.
4. **Follow-up:** the Zimbra selectors are a best guess for a classic Zimbra 8 client. Real-page confirmation is pending (`scripts/probe-zimbra.mjs`).
5. **Follow-up:** the Groq model name `openai/gpt-oss-120b` and its JSON-mode support are unverified against Groq's model list.
6. **Follow-up:** the signed-out Zimbra login dialog has not been seen against the real site.
7. **Security:** a Groq API key was pasted in chat earlier. Treat it as exposed and revoke it.
