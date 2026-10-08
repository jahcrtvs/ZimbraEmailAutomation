# Zimbra Digest Design System

Design system for **Daily Digest Assistant** (Zimbra Daily Digest Automation): a small desktop tool that turns an employee's rough daily notes into their company's daily digest email, lets them review and edit it, and schedules or prepares it in Zimbra webmail. It does not replace Zimbra and never sends without the user's review (unless they opt into automatic sending).

## Sources
- `uploads/fcd5c9a91c66cc1d41df74c218363379.jpg` → copied to `assets/reference/workspace-moodboard.jpg`. A dark CRM "Workspace" dashboard used as the **visual moodboard** (not Zimbra's own UI). Layout, card shape, pills, metrics and colour were derived from it.
- `uploads/LED Dot-Matrix 400.ttf` → `fonts/LEDDotMatrix-400.ttf`. Display face.
- No codebase, Figma, logo or product copy was provided. Components and the UI kit are authored from the moodboard; copy is written to fit the digest product.

## Index
- `styles.css` — entry point (imports only) → `tokens/fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — React primitives (see list below), each with `.d.ts` + `.prompt.md` + one card per folder
- `ui_kits/daily-digest-assistant/` — desktop prototype of the full journey with a 20-state switcher
- `assets/reference/` — moodboard
- `fonts/` — LED Dot-Matrix
- `thumbnail.html`, `SKILL.md`

## Components
- core: **Button**, **IconButton**, **Icon**, **Kbd**, **Tooltip**
- data: **StatusBadge**, **Badge**, **Tag**
- forms: **Field**, **Input**, **Textarea**, **Select**, **DatePicker**, **TimePicker**, **Switch**, **Checkbox**, **RadioCard**
- feedback: **Modal**, **ConfirmDialog**, **Toast**, **Banner**, **EmptyState**
- layout: **Card**, **NotchCard**
- navigation: **AppSidebar**, **ConnectionStatus**

The inventory follows the product brief's list (buttons, inputs, textareas, badges, status indicators, cards, modals, navigation, tooltips, dropdowns, date/time pickers, toasts, confirmation dialogs). Intentional additions: Kbd (shortcut hints, brief §31), RadioCard (sending behaviour), Banner (missed schedule + error states), EmptyState, Icon (Lucide wrapper), Field (shared label/helper wrapper).

## CONTENT FUNDAMENTALS
- **Voice:** plain, calm, practical. "Write what you worked on. We'll turn it into your daily digest." Never "leverage AI-powered intelligence".
- **Person:** the app is "we", the user is "you". Greeting by first name: "Good afternoon, Mark."
- **Labels:** short verb + noun, Title Case for buttons: Generate Digest, Schedule Send, Send Now, Open Zimbra, Save Changes. Sentence case for body, helpers and field labels ("Today's work", "In progress").
- **Reassurance over alarm:** say what did *not* happen. "No email was sent." "Your notes are saved." "Nothing was sent."
- **AI is credited, not featured:** a small "Generated with Gemini" tag on the preview. No chat, no "Ask AI".
- **Errors:** one plain sentence + what to do ("Check your AI connection and try again.") + action. Technical text only behind "View details".
- **Dates/times:** "October 8, 2026", "5:00 PM", "Today at 5:00 PM". Status detail joined with a middle dot: "Scheduled · 5:00 PM", "Sent · 5:01 PM".
- **Status vocabulary:** Draft, Generating, Ready for Review, Scheduled, Sending, Sent, Failed, Cancelled, Missed.
- **Digest output** (the email itself) uses the company template: uppercase section headings (TASK TODAY, PLANS FOR THE WEEK), past-tense bullets ending in periods, "Regards," sign-off with name and role.
- **Emoji:** none.

## VISUAL FOUNDATIONS
- **Colour:** near-black window (`--ink-1`), black sidebar/title bar (`--ink-0`), sunken preview pane (`--ink-2`), cards `--ink-3`. One accent, digest orange `--orange-500 #f6a23a`: primary buttons, focus rings, active nav icon, template variables. Blue/green/red/amber appear only in status pills, banners and dots.
- **Type:** Inter for all UI (app title 13, page title 20, section 14, body 14, meta 12, overline 11 uppercase). LED Dot-Matrix only for the scheduled time and today's date — the two numbers that matter. JetBrains Mono for raw notes and the template editor.
- **Backgrounds:** solid dark surfaces. No imagery, patterns, textures or gradients inside the app.
- **Cards:** `Card` is flat `--surface-card`, 16px radius, hairline border, no shadow. `NotchCard` (top-right corner stepped away for a circular ↗ action) is reserved for Today's Digest on Home.
- **The document:** the generated email is shown on a white sheet (`--surface-document`) with To/Subject header — the one light surface, so the user always sees exactly what will be sent. Edit mode turns each section into an inline textarea on the sheet.
- **Shapes:** buttons and badges are pills; fields are 8px-rounded rectangles on `--surface-field` with an orange border + soft ring on focus.
- **Borders:** hairline translucent white (`--border-default` 16%). No coloured left-border accents.
- **Shadows:** in-grid cards are flat; popovers use `--shadow-pop`. `--shadow-accent-glow` is reserved for focus.
- **Hover:** surfaces lift one ink step (card → `--ink-4`); outline controls get a 6–8% white wash; white buttons dim to `--paper-1`.
- **Press:** buttons scale to .97. No bounce.
- **Motion:** 120–180ms `--ease-out`. Popovers/dialogs/toasts use `dd-pop` (6px rise + fade). Spinners for loading, a soft pulse on Generating. No decorative animation.
- **Transparency/blur:** only in translucent borders and tinted delta chips (18% alpha). No backdrop blur.
- **Layout:** desktop window (macOS-style title bar, 40px) → 208px sidebar (nav + Zimbra status pinned bottom) → main. Pages have a 60px header (title, meta, status/primary action). New Digest is a 50/50 input|preview split that becomes 320px notes | preview after generation. Sticky action bar at the bottom of the preview. One orange primary button per screen.
- **Spacing:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 (`--space-1…9`).
- **Radii:** 6 / 8 / 12 / 16 / 20 / pill. Fields 8, cards 16, dialogs 20, buttons pill.
- **Status colour:** ready = orange, scheduled/generating = blue, sent = green, failed = red, missed = amber, draft/cancelled = grey. Always a tinted pill (14% background, full-strength text).

## ICONOGRAPHY
- **Lucide** (CDN, `lucide@0.454.0` UMD) — thin 1.75 stroke, rounded caps, matching the moodboard's line icons. Rendered through the `Icon` component; pages must load the Lucide script. This is a **substitution**: the moodboard's exact icon set is unknown.
- Common glyphs: `house`, `square-pen`, `clock`, `history`, `layout-template`, `settings`, `sparkles` (generate), `send`, `pencil`, `refresh-cw`, `calendar`, `lock`, `external-link`, `copy`, `check`, `circle-alert`, `triangle-alert`, `arrow-up-right`.
- Icons live inside circular IconButtons or inline at 14–18px next to labels. No emoji, no unicode icon characters, no PNG icons.
- **No logo was provided.** The window title is plain Inter text "Daily Digest Assistant"; the LED wordmark "DAILY DIGEST" is used only on the project thumbnail.

## Caveats
- Inter is loaded from Google Fonts (per the brief); LED Dot-Matrix is the only shipped binary.
- No real product code, Zimbra screens or logo were provided; the UI kit is built from the written brief.
