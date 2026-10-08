# Handoff: Daily Digest (desktop report-preparation utility)

## 0. Overview
Daily Digest is a small internal desktop app. The user types rough notes, clicks **Generate Digest**, reviews and optionally edits a report shown as an email document, then either **Send Now** or **Schedule Send**. Both paths only **prepare** the email in the company's Zimbra webmail. **The app never presses Send in Zimbra.** The user does that manually.

Flow: `Notes → Generate → Review → Edit (optional) → Save = Approved version → Send Now | Schedule → Prepare in Zimbra → STOP → user clicks Send in Zimbra`.

Navigation (exactly five): New Digest, Scheduled, History, Templates, Settings. Zimbra status is pinned bottom-left of the sidebar. No AI branding anywhere except a quiet "AI Provider" card, last in Settings.

### About the design files
The files in `prototype/` are **design references created in HTML/React-in-the-browser**. They show intended look and behavior. They are not production code. Recreate them in the target stack (section 7) using its own patterns. The prototype has no backend: the "generation" is a text-rule mock, Zimbra/scheduling/storage are simulated.

### Fidelity
**High-fidelity.** Final colors, type, spacing, copy and interactions. Recreate pixel-faithfully. All values below are read from the source files.

### Folder layout of this bundle
```
README.md                         this document
prototype/                        runnable reference (open "Daily Digest.html" in a browser; needs internet for React/Babel/Lucide/Google Fonts CDNs)
design_system_source/             design system source: components/, tokens/, fonts/
```

---

## 1. FILES AND STRUCTURE

### prototype/
| File | Purpose |
|---|---|
| `Daily Digest.html` | **Entry point.** Loads CDN scripts (Lucide 0.454.0, React 18.3.1, ReactDOM, Babel standalone 7.29.0), the DS CSS and bundle, then the JSX files. Contains the `STATES` table (30 preset states), the `App` component (all state + actions), the state switcher bar, scale-to-fit logic and keyboard shortcuts. |
| `data.js` | `window.DD`: seed data (user, today, sample notes, history), the default template string, and the text rules `polish`, `buildVars`, `render` that fake report generation. |
| `Shell.jsx` | `WindowFrame` (mock macOS window), `AppStatus` (title-bar status dot), `PageHeader`, `Overline`, `DigestDocument` (the white email sheet, view + edit modes). |
| `screens.jsx` | `NewDigestScreen` (with `InputPane`, `NotesSummary`, `StatusPanel`, `Steps`, `Placeholder`) and all dialogs: `ScheduleModal`, `SendModal`, `PrepareModal`, `LoginModal`, `ZimbraErrorDialog`, `ZimbraStatusModal`, `ConfirmCancel`, `ConfirmRegen`, `MissedDialog`, `ViewModal`. |
| `screens2.jsx` | `ScheduledScreen`, `HistoryScreen`, `SettingsScreen`. |
| `TemplatesScreen.jsx` | `TemplatesScreen` and `TemplateEditor` (textarea over a highlighted `<pre>`). |
| `_ds/zimbra-digest-design-system-9514e4fa-…/` | Compiled design system used by the prototype: `_ds_bundle.js` (UMD, exposes `window.ZimbraDigestDesignSystem_9514e4`), `styles.css`, `tokens/*.css`, `fonts/LEDDotMatrix-400.ttf`, `readme.md`, `_ds_manifest.json`, `_adherence.oxlintrc.json`. |

### design_system_source/
| Path | Purpose |
|---|---|
| `tokens/colors.css` | Color variables (section 2.1). |
| `tokens/typography.css` | Font stacks, sizes, weights, semantic text styles. |
| `tokens/spacing.css` | Spacing, radii, control heights, sidebar/titlebar size, shadows, easing, durations. |
| `tokens/base.css` | `color-scheme:dark`, body defaults, link colors, thin scrollbars, keyframes `dd-spin`, `dd-pulse`, `dd-pop`. |
| `tokens/fonts.css` | Google Fonts import (Inter 400/500/600/700, JetBrains Mono 400/500) + `@font-face` for LED Dot-Matrix. |
| `fonts/LEDDotMatrix-400.ttf` | Display face, used only for large times/dates. |
| `components/core/` | `Button`, `IconButton`, `Icon` (Lucide wrapper), `Kbd`, `Tooltip` (each with `.d.ts`, `.prompt.md`, and a preview `.card.html`). |
| `components/data/` | `StatusBadge`, `Badge`, `Tag`. |
| `components/forms/` | `Field`, `Input`, `Textarea`, `Select`, `DatePicker`, `TimePicker`, `Switch`, `Checkbox`, `RadioCard`. |
| `components/feedback/` | `Modal`, `ConfirmDialog`, `Toast`, `Banner`, `EmptyState`. |
| `components/layout/` | `Card`, `NotchCard` (NotchCard is unused in this app). |
| `components/navigation/` | `AppSidebar`, `ConnectionStatus`. |

### How screens and states are wired
- `App` (in `Daily Digest.html`) owns a single state object `s` (section 5.8) and an action object `a`. Every screen receives `{s, a}`.
- `s.page` ∈ `new | scheduled | history | templates | settings` picks the screen from a map. The sidebar `onChange` sets `s.page`.
- Within `new`, `s.stage` ∈ `form | generating | error | review | editing` and `s.digestStatus` ∈ `none | draft | ready | scheduled | prepared | sent` drive layout (section 3.1).
- `s.modal` is `null` or `{t: <type>, ...}`. `t` ∈ `schedule | send | prepare | login | zerr | zstatus | cancelSched | regen | missed | view`. Dialogs render inside the window frame (absolute, `inset:0`, scrim).
- `s.toast` is `{message, tone, id}`; one toast at a time, bottom-center, auto-dismiss at 3200 ms.
- The **State switcher** (top of page, a DS `Select` 300 px wide + size buttons) calls `apply(i)`, which replaces `s` with `{...base(), ...STATES[i][1]}`. It exists for design review only and is **not part of the product**.
- Scale-to-fit (prototype stage only): `scale = min(1, (viewportW-32)/W, (viewportH-76)/H)` applied with CSS `transform` to the window. The stage bar above the window is 60 px tall. Page background outside the window: `radial-gradient(90% 70% at 50% 0%, #1d1d1d 0%, #070707 70%)`.

---

## 2. DESIGN TOKENS (exact)

### 2.1 Colors (CSS variables from `tokens/colors.css`)
Base:
| Var | Value |
|---|---|
| `--ink-0` | `#050505` (sidebar, title bar) |
| `--ink-1` | `#0c0c0c` (window/app background) |
| `--ink-2` | `#151515` (sunken preview pane, field background) |
| `--ink-3` | `#1e1e1e` (cards, dialogs) |
| `--ink-4` | `#262626` (raised, active nav, hover on cards, toast) |
| `--ink-5` | `#303030` |
| `--ink-6` | `#3c3c3c` (scrollbar thumb) |
| `--paper-0` | `#ffffff` |
| `--paper-1` | `#f2f2f2` |
| `--paper-2` | `#d9d9d9` |
| `--grey-1` | `#bdbdbd` |
| `--grey-2` | `#8e8e8e` |
| `--grey-3` | `#6a6a6a` |
| `--orange-300` | `#ffc274` |
| `--orange-400` | `#fbb04f` |
| `--orange-500` | `#f6a23a` (the one accent) |
| `--orange-600` | `#e88b1c` |
| `--orange-700` | `#b8670c` |
| `--red-500` | `#f04a3e` |
| `--green-500` | `#7ed957` |
| `--yellow-500` | `#f5d343` |
| `--blue-500` | `#2d8cff` |

Semantic aliases (use these in components):
| Role | Var → value |
|---|---|
| App background | `--bg-app` → `--ink-1` `#0c0c0c` |
| Window | `--surface-window` → `#0c0c0c` |
| Sidebar | `--surface-sidebar` → `#050505` |
| Title bar | `--surface-titlebar` → `#050505` |
| Card | `--surface-card` → `#1e1e1e`; hover `--surface-card-hover` → `#262626` |
| Raised | `--surface-raised` → `#262626` |
| Sunken (preview) | `--surface-sunken` → `#151515` |
| Field | `--surface-field` → `#151515` |
| Accent surface | `--surface-accent` → `#f6a23a` |
| Inverse surface | `--surface-inverse` → `#ffffff` |
| Document sheet | `--surface-document` → `#ffffff` |
| Text primary | `--fg-1` → `#ffffff` |
| Text secondary | `--fg-2` → `#bdbdbd` |
| Text muted | `--fg-3` → `#8e8e8e` |
| Text on accent | `--fg-on-accent` → `#0c0c0c` |
| Text accent | `--fg-accent` → `#f6a23a` |
| Document text | `--fg-document` → `#1b1b1b`; muted `--fg-document-muted` → `#6b6b6b` |
| Border subtle | `--border-subtle` → `rgba(255,255,255,.08)` |
| Border default | `--border-default` → `rgba(255,255,255,.16)` |
| Border strong | `--border-strong` → `rgba(255,255,255,.32)` |
| Border accent | `--border-accent` → `#f6a23a` |
| Success (Zimbra connected dot, Sent) | `--status-success` → `#7ed957` |
| Warning (missed, login required) | `--status-warning` → `#f5d343` |
| Error | `--status-danger` → `#f04a3e` |
| Info (scheduled, generating) | `--status-info` → `#2d8cff` |
| Tints (14–16% alpha fills) | `--tint-accent` `rgba(246,162,58,.14)`; `--tint-success` `rgba(126,217,87,.14)`; `--tint-danger` `rgba(240,74,62,.14)`; `--tint-warning` `rgba(245,211,67,.14)`; `--tint-info` `rgba(45,140,255,.16)`; `--tint-neutral` `rgba(255,255,255,.07)` |
| Scrim | `--overlay-scrim` → `rgba(0,0,0,.6)` |

Hard-coded colors outside variables: title-bar traffic lights `#ff5f57 #febc2e #28c840` (mock chrome only); document header strip `#f4f4f4` with bottom border `#e6e6e6`; document edit textarea border `#d7d7d7`, background `#fffdf8`, ring `rgba(246,162,58,.18)`; Banner borders `rgba(245,211,67,.3)` warning, `rgba(240,74,62,.3)` danger, `rgba(45,140,255,.3)` info, `rgba(126,217,87,.3)` success; danger button border `rgba(240,74,62,.4)`.

### 2.2 Typography
Families: `--font-sans` = Inter (400/500/600/700) then `ui-sans-serif, system-ui, sans-serif`. `--font-mono` = JetBrains Mono (400/500). `--font-display` = "LED Dot-Matrix" (400), fallback Inter.
Body: `font: 400 14px/1.5 Inter`, `-webkit-font-smoothing: antialiased`.

Semantic styles (shorthand `weight size/line-height family`):
| Style | Value | Used for |
|---|---|---|
| `--text-app-title` | `600 13px/1 Inter` | Title bar "Daily Digest" (color `--fg-2`, centered) |
| `--text-page-title` | `600 20px/1.3 Inter` | Page header title |
| `--text-section` | `600 14px/1.3 Inter` | Card title (Settings) |
| `--text-body` | `400 14px/1.5 Inter` | Body, inputs |
| `--text-meta` | `400 12px/1.3 Inter` | Header date, hints, timestamps |
| `--text-helper` | `400 12px/1.5 Inter` | Helper text under fields (`--fg-3`) |
| `--text-overline` | `600 11px/1 Inter` + `letter-spacing .06em` + uppercase | Overlines ("Preview", "Report", "Your notes", group labels, table headers). Color `--fg-3` |
| `--text-led-time` | `400 48px/1 LED Dot-Matrix` | Time in the locked Scheduled/Sent panel |
| `--text-led-small` | `400 24px/1 LED Dot-Matrix` | Time column in Scheduled list |

Other styles used:
- **Field label**: `500 12px/1.2 Inter`, `--fg-2`. **"Optional" hint**: same row, right-aligned, `400`, `--fg-3`. Label→field gap 6 px.
- **Intro line on New Digest**: `500 15px/1.3 Inter`, `--fg-1`; helper beneath `--text-helper`, `--fg-3`, margin-top 4.
- **Buttons**: `500 {12|13|14}px/1 Inter` for sm/md/lg.
- **Sidebar item**: `500 13px/1 Inter` (active `600`).
- **Connection status**: `500 12px/1 Inter`, `--fg-3`.
- **Modal title**: `600 16px/1.3 Inter`; description `--text-body`, `--fg-2`, margin-top 6.
- **Banner title** `600 14px/1.35`; body `--text-body --fg-2` margin-top 4; "View details" `500 12px/1`; details `400 11px/1.5 JetBrains Mono`.
- **Toast**: `500 13px/1.3 Inter`.
- **EmptyState title** `600 15px/1.3`; body `--text-body`, `--fg-3`, max-width 300.
- **StatusBadge**: `500 12px/1` (sm: `500 11px/1`).
- **Badge (nav count)**: `600 11px/1`.
- **Tag**: `500 12px/1` (mono variant uses JetBrains Mono).
- **Kbd**: `500 11px/1`.
- **Raw notes summary text**: `400 13px/1.55 JetBrains Mono`, `--fg-3`, `white-space: pre-wrap`.
- **Template editor**: `400 13px/1.7 JetBrains Mono`.
- **Document**: body `400 14px/1.6 Inter`; header rows `400 13px/1.3`; section headings `700 12px/1`, letter-spacing `.06em`.
- **Status panel head**: `600 15px/1.2`.

### 2.3 Spacing, radii, sizes, shadows
- Spacing scale: `--space-1…9` = 4, 8, 12, 16, 20, 24, 32, 40, 48 px.
- Radii: `--radius-xs` 6, `-sm` 8, `-md` 12, `-lg` 16, `-xl` 20, `-pill` 999. Fields 8, cards 16, dialogs 20, buttons/badges/toast pill, document sheet 12, window 12.
- Control heights: `--control-sm` 28, `-md` 36, `-lg` 40.
- Window: 1440×900 or 1280×800, radius 12, `overflow:hidden`, shadow `--shadow-window`.
- Title bar: `--titlebar-height` 40 px, padding `0 14px`, bg `--ink-0`, bottom border `--border-subtle`. Traffic lights 12 px circles, gap 8.
- Sidebar: `--sidebar-width` 208 px, padding `12px 10px`, bg `--ink-0`, right border `--border-subtle`. Nav items 32 px tall, padding `0 10px`, radius 8, gap 10, icon 16 px; items gap 2.
- Page header: 60 px tall, padding `0 28px`, bottom border `--border-subtle`, items gap 12.
- Main page content padding: 28 px (Scheduled/History/Settings); form pane `20px 28px`; preview pane `14px 28px 24px` (top overline row `16px 28px 0`).
- Shadows: `--shadow-pop` `0 16px 48px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)` (dialogs, popovers, toast). `--shadow-window` `0 30px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.1)`. `--focus-ring` `0 0 0 3px rgba(246,162,58,.28)`. `--shadow-card` `0 1px 0 rgba(255,255,255,.04) inset` (defined, cards render flat).
- Motion: `--ease-out` `cubic-bezier(.2,.8,.2,1)`; `--dur-fast` 120 ms; `--dur-base` 180 ms.

### 2.4 The two window sizes
Only the window width/height change. Layout is identical (flex/grid with `minmax(0,1fr)`), so the main area is 1232 px wide at 1440 and 1072 px at 1280 (window minus 208 sidebar).
- New Digest, before generation: two equal columns → 616 px each at 1440, 536 px each at 1280.
- After generation: left column fixed 320 px, preview takes the rest (912 / 752 px). The white document fills the preview width minus 56 px padding.
- Templates: two equal columns (616 / 536).
- Scheduled / History tables use fixed columns plus one flexible column (section 3), so the Recipient column absorbs the width difference.
- Settings content is capped at `max-width: 720`; History detail document at `max-width: 760`.
- The vertical area is 860 / 760 px (window minus 40 title bar). The New Digest form (5 textareas) is designed to fit in 760 without page scroll; the form pane scrolls internally if not (`overflow-y:auto`).

---

## 3. SCREENS

### 3.0 Shell (all screens)
- **Title bar**: traffic lights left; centered text "Daily Digest"; right side `AppStatus`: a 7 px dot + label (`500 12px/1`, `--fg-3`), gap 6.
  - Generating: blue dot pulsing (`dd-pulse 1.2s infinite`), "Generating…".
  - Digest scheduled: blue dot, "Scheduled · {time}" (e.g. "Scheduled · 5:00 PM").
  - Zimbra connected: green dot, "Ready".
  - Zimbra disconnected: yellow dot, "Offline".
  - Priority: generating > scheduled > connection.
- **Sidebar** (`AppSidebar`), items in order:
  1. **New Digest** — icon `square-pen`. On hover shows a `Kbd` "⌘N".
  2. **Scheduled** — icon `clock`. Shows a `Badge` (tone `info`: bg `--tint-info`, text `--status-info`) with the number of items whose status is `scheduled`. Hidden when 0.
  3. **History** — icon `history`.
  4. **Templates** — icon `layout-template`.
  5. **Settings** — icon `settings`.
  - Active item: bg `--ink-4`, text `--fg-1`, weight 600, icon color `--orange-500`. Inactive: text `--fg-2`, icon `currentColor`, hover bg `rgba(255,255,255,.04)`.
  - Bottom (pinned; a flexible spacer above it): 1 px top border `--border-subtle`, padding-top 10, margin-top 10, then `ConnectionStatus`: 30 px tall button, full width, padding `0 10px`, radius 8. Dot 7 px: connected = solid `--status-success`; disconnected = transparent with `1.5px solid --fg-3`. Text "Zimbra Connected" or "Zimbra Disconnected" (`--fg-3`). Hover bg `rgba(255,255,255,.04)`. Click opens the Zimbra status dialog (3.6).
- **Page header** (`PageHeader`): optional back `IconButton` (icon `arrow-left`, label "Back"), `h1` title, optional meta text (`--text-meta`, `--fg-3`), flexible spacer, right slot.

### 3.1 New Digest (primary screen)
Header: title **"New Daily Digest"** (before generation) or **"Daily Digest"** (review/locked), meta **"October 8, 2026"** (date format `Month D, YYYY`), right slot `StatusBadge` (see mapping below).

Header badge mapping (`StatusBadge`, 24 px, pill):
| Situation | status | label shown |
|---|---|---|
| Form, any fill level (digestStatus `none` or `draft`) | `draft` | "Draft" (grey) |
| Generating | `generating` | "Generating" (blue, dot pulsing) |
| Generation error | `failed` | "Generation failed" (red, icon `circle-alert`) |
| Review | `ready` | "Ready for Review" (orange dot) |
| Editing | `ready` | "Editing" |
| Scheduled | `scheduled` | "Scheduled · 5:00 PM" (blue, icon `clock`, detail after "· ") |
| Prepared | `sending` | "Prepared in Zimbra" (blue, pulsing dot) |
| Sent | `sent` | "Sent" (green, icon `check`) |

Body: CSS grid, `grid-template-columns` = `minmax(0,1fr) minmax(0,1fr)` before generation, `320px minmax(0,1fr)` afterwards. Left column has a right border `--border-subtle`.

#### A. Form (stages `form`, `generating` (dimmed), `error`)
Left pane (flex column; scroll area + footer):
- Scroll area: padding `20px 28px`, gap 14. While generating: opacity .5, pointer-events none.
- Intro (`p`): **"What did you work on today?"** and below (helper style) **"Rough notes are fine. The report is organized after you generate it."**
- 5 `Textarea`s (label above, `--surface-field` bg, 1 px `--border-default`, radius 8, padding `9px 12px`, `resize: vertical`, text `--text-body`), in this order:
| # | Label | Hint (right of label) | Rows | Placeholder |
|---|---|---|---|---|
| 1 | Today's Work | none (primary, **required**: at least one field must be non-empty) | 4 | `worked on hibernate⏎criteria query⏎fixed duplicates` (3 lines) — autofocus |
| 2 | Topics / Lessons | "Optional" | 2 | What did you study or learn today? |
| 3 | Still Working On | "Optional" | 2 | Work that is not finished yet |
| 4 | Blockers | "Optional" | 2 | Anything blocking your progress? |
| 5 | Tomorrow | "Optional" | 2 | What you plan to continue next |
- Footer bar: padding `12px 28px`, top border `--border-subtle`, flex, gap 8.
  - **Use example notes**: `Button` ghost, size sm, icon `copy`. Visible **only when all five fields are empty**. Click fills the five fields with the sample notes (5.3) and sets status to draft.
  - Spacer.
  - **Generate Digest**: `Button` primary, size lg, shows `Kbd` "⌘↵". Disabled (opacity .4, not-allowed) when all fields are empty/whitespace. While generating: shows spinner and label "Generating…" and hides the Kbd.
- Right pane (preview, bg `--surface-sunken`): top row `Overline` "Preview". Content by stage:
  - `form`: **Placeholder** — dashed 1 px `--border-default` box, radius 12, padding 28, gap 22, containing three fake sections: overline text "TASK TODAY", "PLANS FOR THE WEEK", "TOPICS" (`700 11px/1`, tracking .06em, `--fg-3`, margin-bottom 10) each followed by 3, 2, 1 grey bars (`height 8; radius 4; bg --ink-3; margin-bottom 8; widths 80%/62%/70%`), then caption **"The report appears here after you generate it."** (`--text-meta`, `--fg-3`).
  - `generating`: padding `48px 8px`; `Steps` with title **"Generating report…"** (`600 15px/1.3`) and three steps: "Reading your notes", "Applying the template", "Preparing the report". Completed steps: green check; current: spinning `loader-circle` (`dd-spin .9s linear infinite`); pending: small hollow circle (8 px) in `--fg-3`. Text color: done `--fg-2`, current `--fg-1`, pending `--fg-3`. Step rows gap 14, icon column 18 px wide, gap 10.
  - `error`: `Banner` tone `danger`, title **"Unable to generate the digest."**, body **"Your original notes are still available."**, "View details" disclosure containing `503 UNAVAILABLE: service overloaded⏎request_id=7f2c19a0`, action `Button` primary sm **"Try Again"**. The notes stay in the left form.

#### B. Review (stage `review`, digestStatus `ready`)
Left (320 px) **NotesSummary**: padding 24, gap 18, scrolls. Row: `Overline` "Your notes" + ghost sm `Button` icon `pencil` **"Edit notes"** (returns to the form with notes intact). Then, for each non-empty note field: label (`500 12px/1.2`, `--fg-2`, margin-bottom 6) = "Today's Work" / "Topics / Lessons" / "Still Working On" / "Blockers" / "Tomorrow", and the raw text in mono.

Right (preview): top row `Overline` "Report", flexible spacer, version text (`--text-meta`, `--fg-3`): **"Generated 4:36 PM"** (hard-coded in the prototype; use real time) or after saving **"Edited · Saved 4:38 PM"**; while editing **"Editing"** in `--orange-400`.
Scroll area: the **document sheet** (see 3.1-F). Below it a sticky-style action bar (not overlapped; fixed at bottom of the column): padding `12px 28px`, top border `--border-subtle`, bg `--surface-window`, gap 8:
- **Edit** — outline md, icon `pencil`.
- **Regenerate** — ghost md, icon `refresh-cw` (deliberately quiet).
- spacer
- **Send Now** — outline md, icon `send`.
- **Schedule Send** — primary lg, icon `clock`, `Kbd` "⌘⇧S". This is the single orange button.

#### C. Editing (stage `editing`)
Same layout. Each section's bullet list in the document turns into a `textarea` (see F). Action bar: left helper text **"One bullet per line. Changes apply to this digest only."** (`--text-meta`, `--fg-3`), spacer, **Cancel** (ghost md), **Save Changes** (primary md, icon `check`, `Kbd` "⌘S"). Saving shows toast "Saved", returns to review and sets "Edited · Saved {time}".

#### D. Locked states (digestStatus `scheduled | prepared | sent`)
Left column becomes a **StatusPanel** (padding 24, gap 20). Document on the right is read-only, no action bar. Preview overline row version text: scheduled → **"Approved version · locked"**; prepared/sent → **"Read only"**.
- **Scheduled**: head = 28 px circle (bg `--tint-info`, icon `clock` in `--status-info`) + **"Scheduled"** (`600 15px`). Then LED time (48 px, `--fg-accent`) and the date below (`--fg-2`, margin-top 10; e.g. "October 8, 2026"). Then label/value **"Recipient"** (label `--text-meta` `--fg-3`, margin-bottom 4) → email. Then a ruled note (top+bottom 1 px `--border-subtle`, padding `12px 0`): lock icon + **"Approved version."** (bold 600, `--fg-1`) + " The report shown here will be used as is." Buttons (full width, gap 8): **Edit Schedule** (outline, icon `clock`) and **Cancel Schedule** (danger). Footnote (`--text-helper`, `--fg-3`): "At {time}, Daily Digest prepares this email in Zimbra and stops. Nothing is sent until you press Send in Zimbra."
- **Prepared**: head icon `mail` (info tint) + **"Prepared in Zimbra"**. Paragraph (`--fg-2`): "The email is waiting in Zimbra. Review it there and press Send. Nothing has been sent yet." Recipient. Buttons: **Open Zimbra** (outline, iconRight `external-link`, full) and **I've Sent It** (primary, icon `check`, full). "I've Sent It" moves to Sent and adds the digest to History.
- **Sent**: head icon `check` (success tint) + **"Sent"**. LED time = time of confirmation (48 px, `--fg-1`), date, Recipient. Button **Start New Digest** (outline, icon `square-pen`, full) → clears everything back to an empty form.

#### E. Document sheet (`DigestDocument`)
White sheet (`#fff`, text `#1b1b1b`), radius 12, overflow hidden.
- Header strip: bg `#f4f4f4`, bottom border `#e6e6e6`, padding `12px 28px`, grid `64px 1fr`, row-gap 6, `400 13px/1.3`. Row "To" (label `#6b6b6b`) → recipient; row "Subject" → `Daily Digest - October 8, 2026` (weight 600).
- Body: padding `24px 28px 28px`, flex column gap 4, `400 14px/1.6`.
  - Section block (margin-bottom 16): title (uppercase, `700 12px/1`, tracking .06em, margin-bottom 8) then `ul` with `padding-left 20`, margin 0.
  - Text block: plain line (e.g. "Regards,", name, role).
- Example rendered output (sample notes, default template):
```
To: manager@company.com
Subject: Daily Digest - October 8, 2026

TASK TODAY
• Worked on Hibernate.
• Worked on Criteria API queries.
• Fixed duplicate query results.
• Continued work on the Office repository.
• Investigating an issue with the embedded ID.

PLANS FOR THE WEEK
• Continue work on the repository.
• Finish the embedded ID mapping.

TOPICS
• Studied Criteria API projections.
• Studied HQL vs. Criteria.

Regards,
Mark Justine Dela Cruz
CDP Trainee
```
(The BLOCKERS section is omitted when empty.) Only section bullets are editable; the "Regards, name, role" lines are not (they come from Profile).
- Edit mode textareas: width 100%, border `1px solid #d7d7d7`, radius 8, padding `8px 10px`, `400 14px/1.6`, text `#1b1b1b`, bg `#fffdf8`, no outline, always-on ring `0 0 0 3px rgba(246,162,58,.18)`, `resize: vertical`, rows = max(2, line count).

### 3.2 Scheduled
Header: title "Scheduled" (no meta/right). Content padding 28, gap 24, scrolls.
- If no items: `EmptyState` icon `clock`, title **"No scheduled digests."**, body **"Create a digest and schedule it for later."**, action primary **"New Digest"**.
- Else: helper line (`--text-helper`, `--fg-3`): **"Scheduling prepares the email in Zimbra at the set time. You review it there and press Send."**, then a column-header row, then groups.
- Grid columns (both header and rows): `110px 96px 130px minmax(0,1fr) 120px 190px`, gap 12. Headers (overline style): Date, Time, Report, Recipient, Status, (blank).
- Groups: `Overline` label = "Today" / "Tomorrow" / "Oct 9" style for other dates (derived from days from today). Items sorted by date ascending. Cancelled items go in a final group labelled **"Cancelled"** at opacity .6.
- Row (card): padding `14px 16px`, radius 12, bg `--surface-card`, 1 px `--border-subtle`. Cells: date as "Oct 8" (`--fg-2`); time in LED 24 px (`--fg-accent` for the digest created in this session, otherwise `--fg-1`); "Daily Digest" (weight 500); recipient (`--fg-2`, ellipsis); `StatusBadge` sm (`scheduled` or `cancelled`); actions right-aligned gap 6: **View** (outline sm), **Edit** (outline sm), **Cancel** (ghost sm). Cancelled rows have no actions.
- **View** → modal with the read-only document (3.6). **Edit** → Schedule dialog in edit mode. **Cancel** → Cancel confirmation.

### 3.3 History
Header: "History". List view: grid columns `130px minmax(0,1fr) 200px 130px 150px`, gap 12, header row labels Date, Subject, Recipient, Status, (blank). Rows (cards, padding `12px 16px`, radius 12, hover bg `--ink-4`, cursor pointer): "Oct 8" · "Daily Digest" (500) · recipient (`--fg-2`) · `StatusBadge` sm · actions **View** (outline sm) and **Duplicate** (ghost sm). Row click = View.
Seed rows (all "Sent"): Oct 7, Oct 6, Oct 5 (see 6.5). New entry added at top when "I've Sent It" is pressed.
- **Detail**: header title **"Daily Digest · October 7, 2026"**, back `IconButton`, right: `StatusBadge` "Sent · 5:02 PM" and **Duplicate** (primary, icon `copy`). Body on `--surface-sunken`, padding `20px 28px`, document `max-width: 760`, subject "Daily Digest - {date}".
- **Duplicate**: copies the **notes** (not the report) into a new empty-status form (`stage form`, status draft), navigates to New Digest, toast **"Notes copied. Generate and review the new digest."** (info). The new digest must be generated and reviewed again.
- **Empty**: `EmptyState` icon `history`, **"No previous digests yet."**, **"Your completed digests will appear here."**

### 3.4 Templates
Header: "Templates", meta "Daily Digest", right: `Unsaved changes` (`--text-meta`, `--fg-3`, only when dirty), **Cancel** (ghost, disabled unless dirty; resets the text), **Save Template** (primary, icon `check`, `Kbd` "⌘S", disabled unless dirty).
Body: two equal columns.
- Left (padding `18px 28px 24px`, right border `--border-subtle`, gap 14): `Overline` **"Daily Digest format"**; editor (flex:1, radius 12, bg `--surface-field`, 1 px `--border-default`); below it label **"Available variables"** + " · click to insert" (`--fg-3`, 400), then `Tag`s (mono, tone accent: bg `--tint-accent`, text `--orange-400`, height 22, padding `0 8px`, radius 6, gap 6, wrap): `{date}` `{name}` `{role}` `{tasks}` `{topics}` `{weekly_plans}` `{blockers}` `{tomorrow}`. Click inserts the token at the caret.
- Editor internals: a transparent `textarea` (`color: transparent; caret-color: --fg-1; spellcheck off`) stacked over a `pre aria-hidden` that shows the same text in `--fg-2` with each `{variable}` wrapped in a span (`color --orange-400; background --tint-accent; radius 4`). Both: padding `16px 18px`, mono `400 13px/1.7`, `pre-wrap`, `break-word`. Scroll positions synced.
- Right (bg `--surface-sunken`, padding `18px 28px 24px`, gap 14): row `Overline` "Preview" + "Filled with sample notes" (`--text-meta`). Document with subject "Daily Digest - October 8, 2026", recipient manager@company.com, built from the sample notes using the template text currently in the editor (live).
- Default template text (exact):
```
TASK TODAY

{tasks}

PLANS FOR THE WEEK

{weekly_plans}

TOPICS

{topics}

BLOCKERS

{blockers}

Regards,
{name}
{role}
```
- Save → stores template, toast **"Template saved."** Saved template applies to **future** generations only; existing reports are unchanged.

### 3.5 Settings
Header: "Settings", right **Save** (primary, `Kbd` "⌘S") → toast "Settings saved." Content: `max-width 720`, padding 28, column, gap 14, scrolls. Five `Card`s (radius 16, bg `--surface-card`, 1 px `--border-subtle`, padding 20, header row title `600 14px/1.3` with optional subtitle `--text-meta --fg-3` margin-top 3). Two-column rows use grid `1fr 1fr`, gap 14.
1. **General** — `TimePicker` "Default send time" (default "5:00 PM").
2. **Profile** (subtitle "Used in the report sign-off") — `Input` "Name" (default "Mark Justine Dela Cruz"), `Input` "Role" (default "CDP Trainee").
3. **Email** — `Input` "Default recipient" (default `manager@company.com`), `Input` "Default subject" (default `Daily Digest - {date}`, helper "Daily Digest - October 8, 2026").
4. **Zimbra** — card header action: `StatusBadge` sm "Connected" (green) or "Disconnected" (grey, hollow dot). Body: `Input` "Zimbra URL" (default `https://mail.company.local`, helper "Uses your existing browser session. Your password is never entered here."); if disconnected a warning `Banner` **"Zimbra login required."** / "Open Zimbra and sign in, then test the connection."; buttons **Open Zimbra** (outline, iconRight `external-link`) and **Test Connection** (secondary, loading spinner while testing); footnote (`--text-helper`, `--fg-3`, margin-top 14) "Daily Digest prepares emails in Zimbra and never presses Send."
5. **AI Provider** (last; subtitle "Used to organize notes into the report") — `Input` "Provider" = "Gemini" (read-only), `Select` "Model" (Flash / Pro), **Test Connection** (outline, margin-top 14). No icons, no badge, no accent color.
Note: in the prototype, Settings values live in local component state and are **not** wired to the report sign-off, default recipient or subject. Real build must connect them (section 7).

### 3.6 Dialogs (all render over the window with scrim)
Dialog shell (`Modal`): scrim `rgba(0,0,0,.6)`, content centered with 24 px padding; panel radius 20, bg `--ink-3`, `--shadow-pop`, animation `dd-pop 180ms`. Header padding `20px 20px 0 24px`; optional close `IconButton` (icon `x`, label "Close (Esc)", 32 px circle); body padding `20px 24px 0`; footer padding 24, flex-end, gap 8. Esc and scrim click close if closable. `ConfirmDialog` = Modal width 420 with a 36 px circular tinted icon above the title.

| Dialog | Width | Content (exact copy) | Buttons |
|---|---|---|---|
| **Schedule Send** (new) / **Edit Schedule** | 460 | `DatePicker` "Date" and `TimePicker` "Time" side by side (grid 1fr 1fr, gap 12); `Input` "Recipient" (error "Enter a valid email address." with red border + `circle-alert` icon when invalid); divider (top border) then lock icon + "The current approved version of this digest will be used when the email is prepared. At that time Zimbra is opened and the email is filled in. **You press Send.**" Optional failure `Banner` danger on top: "Unable to schedule the digest." / "No changes were made." / action **Try Again**. Defaults: date = digest date (today, min date today), time = "5:00 PM", recipient = default recipient. | Cancel (ghost), **Schedule** (primary, icon `clock`) or **Save** in edit mode; disabled while recipient invalid |
| **Send Daily Digest** | 440 | Two ruled rows (label column 80 px, `--fg-3`): Recipient → email; Subject → "Daily Digest - October 8, 2026". Then "The current digest will be prepared in Zimbra. You review the message there and press Send yourself." | Cancel (ghost), **Prepare in Zimbra** (primary, iconRight `external-link`) |
| **Preparing** | 440 | Title "Preparing email in Zimbra…"; steps: "Opening Zimbra", "Checking session", "Preparing message" (same `Steps` visuals). Not closable. | none |
| **Ready** (same dialog, after step 3) | 440 | Title "Email ready in Zimbra"; green check circle + "Review the message in Zimbra before sending." and muted "Daily Digest has not sent anything and never will." Closable. | Close (ghost), **Open Zimbra** (primary, iconRight `external-link`) |
| **Login required** | 420 | warning tone, icon `lock`, title "Zimbra login required.", text "Sign in to Zimbra in your browser, then try again. Daily Digest never asks for your Zimbra password." | Close (ghost), **Open Zimbra** (warning-colored primary) |
| **Zimbra connection error** | 420 | danger tone, icon `circle-alert`, title "Unable to connect to Zimbra.", text "Check your connection or open Zimbra manually.", info `Banner` "Nothing was sent." with details `ECONNREFUSED https://mail.company.local:443` | **Open Zimbra** (ghost, left), **Retry** (danger-styled confirm) |
| **Zimbra status** | 440 | Title "Zimbra", read-only `Input` "Zimbra URL", "Status" label + `StatusBadge` ("Connected" green / "Disconnected" grey), if disconnected warning `Banner` "Zimbra login required." / "Open Zimbra and sign in. Daily Digest uses your existing browser session." | **Open Zimbra** (outline, iconRight `external-link`), **Test Connection** (secondary, loading) |
| **Cancel scheduled digest?** | 420 | danger tone, icon `clock`, "This digest will no longer be prepared in Zimbra." | **Keep Scheduled** (ghost), **Cancel Schedule** (danger) |
| **Replace the current digest?** | 420 | warning tone, icon `refresh-cw`, "Regenerating creates a new report from your notes. Your edits to this version will be lost." | **Keep Current** (ghost), **Regenerate** (warning-colored) |
| **Missed Scheduled Digest** | 420 | warning tone, icon `triangle-alert`, "Your Daily Digest was scheduled for 5:00 PM, but the application was not running." + blank line + bold "No email was sent." | **Cancel** (ghost), **Prepare Now** (primary-warning) |
| **View report** | 620 | Title "Daily Digest · {date}", document in a `max-height: 420` scroll box | Close (ghost) |

Dialog button note: `ConfirmDialog` confirm uses `variant="danger"` when tone is danger, else `primary`; for tone warning the background is overridden to `--status-warning`.

### 3.7 Toasts (bottom-center, 24 px from the bottom)
Pill, min-height 40, padding `0 6px 0 14px`, bg `--ink-4`, `--shadow-pop`, icon 15 px colored by tone (`check` success, `info` info, `triangle-alert` warning, `circle-alert` danger) + message + dismiss `x`. Auto-dismiss 3200 ms. Messages used: "Saved" · "Digest scheduled for {time}." · "Schedule updated." · "Digest cancelled." (info) · "Digest cancelled. No email was sent." (info) · "Email prepared in Zimbra." · "Opening Zimbra in your browser…" (info) · "Zimbra connected." · "Zimbra connection OK." / "Zimbra login required." (warning) · "Notes copied. Generate and review the new digest." (info) · "Template saved." · "Settings saved." · "Connection OK."

### 3.8 Keyboard shortcuts (Ctrl on Windows/Linux)
`⌘N` New Digest (resets only if the current digest is empty or sent) · `⌘↵` Generate Digest (New Digest page, form/error stage) · `⌘⇧S` Schedule Send (review stage, status ready) · `⌘S` Save Changes (editing) / Save Template (Templates) / Save (Settings). `Esc` closes closable dialogs.

---

## 4. STATES

### 4.1 Preset states in the prototype switcher (30)
1 New Digest · Empty; 2 Partially filled (Today's Work = "worked on hibernate⏎criteria query"); 3 Filled (sample notes); 4 Generating (step 2 active); 5 Generation error; 6 Review · Generated; 7 Review · Editing (first section gets an extra bullet "Updated the Office repository mappings."); 8 Review · Saved (toast "Saved", "Edited · Saved 4:38 PM"); 9 Send Now confirmation; 10 Preparing in Zimbra; 11 Ready in Zimbra; 12 Zimbra login required; 13 Zimbra connection error; 14 Zimbra status · Connected; 15 Zimbra status · Disconnected; 16 Prepared · waiting for you to send; 17 Schedule dialog; 18 Schedule failed; 19 Scheduled confirmation (toast "Digest scheduled for 5:00 PM."); 20 Scheduled list; 21 Edit schedule; 22 Cancel confirmation; 23 Cancelled (toast "Digest cancelled."); 24 Missed schedule; 25 Scheduled · Empty; 26 History; 27 History detail; 28 History · Empty; 29 Templates; 30 Settings.

### 4.2 Component states (from DS source)
**Button** (pill, 1 px border, `box-sizing:border-box`, gap 8, sizes sm 28/12px/px12/icon14, md 36/13px/px14/icon16, lg 40/14px/px18/icon16). Variants (bg / text / border / hover bg / active bg):
- primary: `--surface-accent` / `--fg-on-accent` / transparent / `--orange-400` / `--orange-600`
- inverse: `#fff` / `--fg-on-inverse` / transparent / `--paper-1` / `--paper-2`
- secondary (default): `--ink-4` / `--fg-1` / `--border-subtle` / `--ink-5` / `--ink-6`
- outline: transparent / `--fg-1` / `--border-default` / `rgba(255,255,255,.06)` / `rgba(255,255,255,.1)`
- ghost: transparent / `--fg-2` / transparent / `rgba(255,255,255,.06)` / `rgba(255,255,255,.1)`
- danger: transparent / `--status-danger` / `rgba(240,74,62,.4)` / `--tint-danger` / `rgba(240,74,62,.22)`
States: hover = hover bg; pressed = active bg + `transform: scale(.97)`; disabled = opacity .4, cursor not-allowed, no hover/press; loading = disabled-style interaction with spinning `loader-circle` replacing the left icon, cursor `progress`; transitions `background 120ms, transform 120ms`. **There is no explicit focus style in the DS Button (browser default outline). Add a `:focus-visible` ring `box-shadow: var(--focus-ring)`.**
Per-button specifics: *Generate Digest* primary lg, disabled when no notes, loading label "Generating…". *Use example notes* ghost sm, hidden unless empty. *Prepare in Zimbra* primary md with trailing `external-link`. *I've Sent It* primary md full width with `check`. `Kbd` inside primary buttons uses the "onLight" tone (bg `rgba(0,0,0,.12)`, opacity .75), otherwise bg `rgba(255,255,255,.08)` with 1 px `--border-subtle`, text `--fg-3`, height 18, padding `0 5px`, radius 5.

**Inputs / Textareas / Selects / Pickers** (`fieldBox`): min-height 36, padding `0 12px` (textarea inner padding `9px 12px`), radius 8, bg `--surface-field`, border `1px --border-default`. Focus: border `--border-accent` + `--focus-ring`. Error: border `--status-danger`, no ring, helper text turns `--status-danger`, trailing `circle-alert` icon (Input). Disabled: transparent bg, opacity .5. Read-only inputs look like normal inputs. Transition `border-color 120ms, box-shadow 120ms`. Input inner height 34. Select/DatePicker/TimePicker open a popover (`top: calc(100% + 4px)`, radius 12, bg `--ink-3`, `--shadow-pop`, animation `dd-pop 120ms`); option rows padding `8px 10px`, selected row bg `rgba(255,255,255,.06)` + orange `check` (Select) or orange text on `--tint-accent` (TimePicker). TimePicker slots every 15 min from 7:00 AM to 9:00 PM, format "5:00 PM". DatePicker popover 252 px wide, Monday-first grid, selected day = orange circle, today = 1 px `--border-strong` ring, days before `minDate` disabled.

**Other**: `IconButton` 32 px circle, hover bg `rgba(255,255,255,.07)`. `Card` with `onClick` hovers to `--ink-4`. `ConnectionStatus` and nav items hover `rgba(255,255,255,.04)`. History rows hover `--ink-4`.

### 4.3 Transitions and animations
| What | Spec |
|---|---|
| Dialog/toast appear | `dd-pop`: from `opacity 0; translateY(6px) scale(.98)` to none; 180 ms (popovers 120 ms), `cubic-bezier(.2,.8,.2,1)` |
| Spinner | `dd-spin` 360° linear, 0.8 s (buttons) / 0.9 s (steps) infinite |
| Generating/sending dot | `dd-pulse` opacity 1 → .35 → 1, 1.2 s infinite |
| Button | background 120 ms, press scale .97 |
| Fields | border/box-shadow 120 ms |
| Document dim | opacity transition 180 ms (supported, unused) |
| Mock timings | generation steps advance at 0 / 600 / 1200 ms, report appears at 1800 ms; Zimbra prepare steps at 0 / 700 / 1400 ms, done at 2100 ms; login flow 1200 ms; connection tests 900 ms; retry 800 ms |
No other animations. No bounce, no gradients inside the app, no blur.

---

## 5. BEHAVIOR AND LOGIC

### 5.1 End-to-end flow
1. App opens on **New Digest** (empty form, status badge "Draft", title-bar "Ready").
2. User types or pastes notes (or clicks "Use example notes"). Any content enables **Generate Digest** (also ⌘↵).
3. Generate → stage `generating`: form dims, preview shows steps, title bar "Generating…". After ~1.8 s → stage `review`, `digestStatus = ready`, report built from notes + current template + date. On failure → stage `error` with Banner; notes preserved; **Try Again** re-runs generation.
4. Review: document on the right, raw notes on the left. User may **Edit**, **Regenerate**, **Send Now** or **Schedule Send**.
5. **Edit** → per-section textareas → **Save Changes** (⌘S) → toast "Saved", header text "Edited · Saved {time}". **Cancel** discards changes. The saved blocks are the **approved version**.
6. **Regenerate**: if the report has saved edits (`savedAt` set) → confirmation "Replace the current digest?". Otherwise regenerates immediately. The current report remains the source of truth until the user confirms.
7a. **Send Now** → Send dialog → **Prepare in Zimbra**. If Zimbra is disconnected → "Zimbra login required." dialog instead. If connected → Preparing dialog (3 steps) → "Email ready in Zimbra" dialog + toast "Email prepared in Zimbra." → status `prepared`; locked left panel shows **Open Zimbra** and **I've Sent It**.
7b. **Schedule Send** → Schedule dialog → **Schedule** → status `scheduled`, the approved blocks are copied into a schedule item, toast "Digest scheduled for {time}.", locked panel with LED time, title-bar "Scheduled · {time}".
8. At the scheduled time (real build): app prepares the email in Zimbra and **stops**. It never clicks Send.
9. User sends in Zimbra, returns, clicks **I've Sent It** → status `sent`, history entry created ({date, time "4:41 PM" in prototype → use actual time}, blocks, notes, status `sent`), the Sent panel shows the time. **Start New Digest** resets the form.
10. **History** now lists the new entry at the top.

### 5.2 Sending safety rules (must hold in the real build)
- The app **never** clicks Zimbra's Send button, never schedules a send inside Zimbra, never stores a Zimbra password.
- The only Zimbra actions are: open Zimbra, verify an existing browser session, open a New Message, fill recipient, subject, body, then stop.
- Copy always says "Prepare" (never "Send") on the button that triggers Zimbra. Status text says "Prepared in Zimbra", never "Sent", until the user confirms with "I've Sent It".

### 5.3 "Use example notes" — exact content
Fills the five fields with:
```
work:     "worked on hibernate\ncriteria query\nfixed duplicate result\ncontinued office repository"
topics:   "criteria api projections\nhql vs criteria"
progress: "still having issue with embedded id"   (Still Working On)
blockers: ""
tomorrow: "tomorrow continue repository\nfinish embedded id mapping"
```
and sets status to draft. Button is visible only when all fields are empty.

### 5.4 Scheduling rules
- Scheduling copies the **current saved blocks** into the schedule item. Later changes to notes or regeneration don't alter it; once scheduled the report is read-only ("Approved version · locked").
- **Edit Schedule** changes only date, time, recipient. It never regenerates or changes content. From the Scheduled list, editing another item opens the same dialog filled with that item's values; saving shows toast "Schedule updated."
- **Cancel Schedule** → confirm → item status `cancelled`; if it was the current digest, digest status returns to `ready` (editable again) and toast "Digest cancelled." (info). Cancelled items remain in the list under "Cancelled".
- **Missed**: if the app wasn't running at the due time, nothing is sent or prepared. On next launch show "Missed Scheduled Digest" with **Prepare Now** (runs the Prepare flow with the stored approved content, then removes the item from Scheduled) or **Cancel** (marks cancelled, toast "Digest cancelled. No email was sent.").
- Prototype mock: the failure path in the Schedule dialog (`fail`) can be shown only via preset state 18; real scheduling failure should set `modal.fail = true` and keep the dialog open with data intact.
- Recipient validation: `/^\S+@\S+\.\S+$/`.

### 5.5 The example report: text-rule algorithm (`data.js`)
There is no model in the prototype. The real build replaces this with a Gemini call (section 7) but must keep the same input fields and output structure.

**Inputs** `notes = {work, topics, progress, blockers, tomorrow}`, `user = {name, role}`, `date`, `template` (string).

**`polish(line, kind)`**, `kind` ∈ `tasks | progress | topics | plans`:
1. Trim. Strip a leading bullet (`-`, `•`, `*`) and following spaces. If empty return `null`.
2. Remove a leading `tomorrow ` (case-insensitive).
3. Replace first `criteria query` (case-insens.) → `criteria API queries`. Replace first `duplicate result` (word boundary after "result") → `duplicate query results`.
4. Apply the **first** matching rule (case-insensitive) only:
   - `^continue (.+)` → `continue work on the $1`
   - `^continued (.+)` → `continued work on the $1`
   - `^still having (an )?issues? with (.+)` → `investigating an issue with the $2`
   - `^finish (.+)` → `finish the $1`
5. If the line does **not** start with one of these verbs (case-insens., word boundary): worked, fixed, continued, studied, implemented, investigating, reviewed, learned, wrote, created, updated, tested, finish, continue, start, review, write, refactor, refactored, attended, set up, added → prefix by kind: `topics` → "studied ", `plans` → "continue work on ", otherwise → "worked on ".
6. Split on spaces; for each word, if its lowercase is in the dictionary replace it: hibernate→Hibernate, criteria→Criteria, api→API, hql→HQL, jdbc→JDBC, sql→SQL, java→Java, id→ID, crud→CRUD, office→Office, spring→Spring, postgresql→PostgreSQL, vs→vs. . Join with spaces; collapse "API API" → "API".
7. Uppercase the first character. Append "." if the line doesn't already end with `.`, `!` or `?`.

**`lines(text, kind)`** = split on `\n`, `polish` each, drop nulls.

**`buildVars`** → variables:
| Variable | Source |
|---|---|
| `{date}` | formatted `Month D, YYYY` |
| `{name}`, `{role}` | profile |
| `{tasks}` | `lines(work,"tasks")` followed by `lines(progress,"progress")` where each progress line is kept as is if it starts with "Investigating" or "Continued", otherwise prefixed `"Still working on: "` + the line with its first letter lowercased |
| `{topics}` | `lines(topics,"topics")` |
| `{weekly_plans}` | `lines(tomorrow,"plans")` |
| `{tomorrow}` | same as `{weekly_plans}` |
| `{blockers}` | `lines(blockers,"tasks")` |

So: **Task Today ← Today's Work + Still Working On; Plans for the Week ← Tomorrow; Topics ← Topics / Lessons; Blockers ← Blockers.**

**`render(template, vars)`** → blocks (`{type:"section", title, items[]}` or `{type:"text", text}`):
- Iterate template lines; trim; skip empty lines and lines made only of `─` or `-` (3+).
- A line that is exactly `{var}` where `vars[var]` is an array → push all items into the current section (ignored if there's no current section).
- A line with no braces, equal to its own uppercase and containing a letter → start a new section with that title.
- Anything else → close the current section; emit a text block with `{var}` replaced (arrays joined by ", "; unknown variables left as typed).
- Finally drop sections with zero items (this hides empty BLOCKERS etc.).

### 5.6 Editing semantics
On Edit, `draft[i] = section.items.join("\n")` for every section block index `i`. On Save, each section's items become `draft[i].split("\n")`, trimmed, empty lines removed. Text blocks (Regards, name, role) are not editable.

### 5.7 Persistence
Prototype: **nothing persists** (React state only). Real build must persist: history, schedule items (with approved blocks), template, settings, and ideally the in-progress notes (autosave so an error or crash never discards work). Data shapes in section 6.

### 5.8 Prototype state object `s` (reference)
```
page: "new"|"scheduled"|"history"|"templates"|"settings"
stage: "form"|"generating"|"error"|"review"|"editing"
notes: {work,topics,progress,blockers,tomorrow}
date: Date (today)
blocks: Block[]            // approved/generated report
draft: {[blockIndex]: string}   // edit buffers
digestStatus: "none"|"draft"|"ready"|"scheduled"|"prepared"|"sent"
schedule: {date: Date, time: "5:00 PM", to: string}   // current digest
items: ScheduleItem[]      // Scheduled list (seed: one for Oct 9, 5:00 PM)
history: HistoryItem[]
historySel: string|null
template: string
modal: null | {t, edit?, id?, fail?}
toast: null | {message, tone, id}
zimbra: boolean            // connected
genAt, savedAt, sentAt: string (display times, hard-coded in prototype)
genStep, prepStep: number  // progress step index (prepStep 3 = done)
testing, testingAI: boolean
```
Actions (`a`): `go, newDigest, resetDigest, setNotes, fillSample, generate, regenerate, editNotes, startEdit, setDraft, saveEdit, cancelEdit, openSchedule, confirmSchedule, cancelSchedule, openSend, confirmSend, loginZimbra, retryZimbra, testZimbra, openZimbra, setModal, closeModal, markSent, prepareMissed, dismissMissed, selectHistory, duplicate, saveTemplate, saveSettings, testAI`.

### 5.9 AI Provider (Settings)
Last card, plain, quiet: read-only "Provider: Gemini", "Model" select (Flash/Pro), "Test Connection". Nowhere else is the provider named. No sparkles/robot/"AI" wording in buttons ("Generate Digest" only), no "Generated with Gemini" tag in this version. Errors say "Unable to generate the digest." with technical text behind "View details".

---

## 6. DATA MODEL

### 6.1 Notes
```json
{ "work": "string", "topics": "string", "progress": "string", "blockers": "string", "tomorrow": "string" }
```
Multi-line plain text; one item per line.

### 6.2 Block (report content)
```ts
type Block = { type: "section"; title: string; items: string[] } | { type: "text"; text: string };
```

### 6.3 Digest
```ts
type Digest = {
  id: string; date: string /*ISO yyyy-mm-dd*/;
  status: "draft"|"generating"|"ready"|"scheduled"|"prepared"|"sent"|"failed"|"cancelled";
  notes: Notes; blocks: Block[];            // blocks = approved version once saved
  recipient: string; subject: string;        // "Daily Digest - October 8, 2026"
  generatedAt?: string; savedAt?: string; sentAt?: string;  // ISO datetimes
  edited: boolean;
}
```
### 6.4 Schedule item
```ts
type ScheduleItem = {
  id: string; digestId: string;
  date: string /*yyyy-mm-dd*/; time: string /*"5:00 PM" or "17:00"*/; recipient: string;
  status: "scheduled"|"prepared"|"missed"|"cancelled";
  blocks: Block[];            // snapshot of approved content at scheduling time
  createdAt: string;
}
```
### 6.5 History item
```json
{ "id": "h0", "date": "2026-10-07", "time": "5:02 PM", "status": "sent",
  "notes": {"work":"set up hibernate.cfg.xml\nmapped employee entity\nwrote first hql query","topics":"sessionfactory lifecycle","progress":"","blockers":"","tomorrow":"criteria queries"},
  "blocks": [{"type":"section","title":"TASK TODAY","items":["…"]}] }
```
Seed history: Oct 7 5:02 PM (above); Oct 6 4:59 PM — work "finished jdbc exercises⏎reviewed prepared statements", topics "transactions and rollback", blockers "local postgresql port conflict", tomorrow "start hibernate setup"; Oct 5 5:04 PM — work "wrote window function queries⏎created department summary view", topics "rank vs dense_rank", tomorrow "jdbc exercises". All "sent".
### 6.6 Template
```json
{ "id": "daily-digest", "name": "Daily Digest", "body": "TASK TODAY\n\n{tasks}\n\nPLANS FOR THE WEEK\n\n{weekly_plans}\n\nTOPICS\n\n{topics}\n\nBLOCKERS\n\n{blockers}\n\nRegards,\n{name}\n{role}",
  "variables": ["date","name","role","tasks","topics","weekly_plans","blockers","tomorrow"] }
```
### 6.7 Settings
```json
{ "general": {"defaultSendTime": "5:00 PM"},
  "profile": {"name": "Mark Justine Dela Cruz", "role": "CDP Trainee"},
  "email": {"defaultRecipient": "manager@company.com", "defaultSubject": "Daily Digest - {date}"},
  "zimbra": {"url": "https://mail.company.local"},
  "ai": {"provider": "gemini", "model": "flash", "apiKey": "<store in OS keychain, never in the renderer>"} }
```
Constants in the prototype: today = Oct 8, 2026; seed schedule item = Oct 9, 5:00 PM, manager@company.com.

---

## 7. IMPLEMENTATION GUIDANCE

### 7.1 Recommended stack (2-hour budget)
**Electron + Vite + React (JS or TS) + Playwright-core + a JSON file store.**
- The prototype is already React; the JSX in `screens*.jsx`, `Shell.jsx`, `TemplatesScreen.jsx` and the DS components in `design_system_source/components/**/*.jsx` can be ported almost line for line (replace `window.DD` / `window.ZimbraDigestDesignSystem_9514e4` globals with ES imports; the DS components are already ES modules using `import React`).
- Electron's main process (Node) gives you everything the mock cannot do in a browser: timers/scheduler, file storage, launching/attaching to a browser, secrets, calling Gemini without CORS/key exposure.
- Zimbra: use `playwright-core` `chromium.connectOverCDP("http://localhost:9222")` against the user's own Chrome started with `--remote-debugging-port=9222` and their normal profile, so the existing Zimbra login session is reused and no password is handled. (Alternative: open the Zimbra compose URL in the default browser with `to`, `subject`, `body` query parameters; verify the exact URL syntax for the company's Zimbra version, which varies.)
- Time plan: 0:00–0:20 scaffold Electron + Vite, copy tokens/fonts and DS components; 0:20–1:00 port the five screens + dialogs with the in-memory state; 1:00–1:20 JSON persistence (history, schedule, template, settings) via IPC; 1:20–1:45 Gemini call + Zimbra prepare via Playwright; 1:45–2:00 scheduler + missed-schedule check on launch + verify checklist.
- If time runs short, cut in this order: Templates editor highlight overlay (use plain textarea), DatePicker popover (use `<input type=date>` styled with tokens), Zimbra automation (open compose URL), Settings test buttons.
- Faster alternative if packaging isn't needed: a local Node server + the same React app opened in the browser. You lose reliable scheduling when the window is closed, so Electron (tray + `app.on('ready')`) is preferred.

### 7.2 Component breakdown (props as used)
- `WindowFrame({width,height,status,children})` — drop in Electron (use native frame; keep 40 px draggable title area only if frameless).
- `AppStatus({s})` → `{generating, scheduledTime|null, zimbraConnected}`.
- `PageHeader({title, meta?, right?, onBack?})`, `Overline({children})`.
- `DigestDocument({blocks, subject, to, editing?, draft?, setDraft?})`.
- `NewDigestScreen({s,a})` with `InputPane`, `NotesSummary`, `StatusPanel`, `Steps({title?, steps[], step})`, `Placeholder`.
- `ScheduledScreen`, `HistoryScreen`, `TemplatesScreen` (`TemplateEditor({value,onChange})`), `SettingsScreen`.
- Dialogs: `ScheduleModal({s,a})` (reads `s.modal.edit/id/fail`), `SendModal`, `PrepareModal` (reads `prepStep`), `LoginModal`, `ZimbraErrorDialog`, `ZimbraStatusModal`, `ConfirmCancel`, `ConfirmRegen`, `MissedDialog`, `ViewModal`.
- DS (props): `Button{variant,size,icon,iconRight,loading,disabled,kbd,full,onClick,style}`; `IconButton{icon,variant,size,label,onClick,active,dot}`; `Icon{name,size,strokeWidth,color}`; `Kbd{tone}`; `StatusBadge{status,label,detail,size}`; `Badge{tone}`; `Tag{mono,tone,onClick}`; `Field{label,helper,error,hint}`; `Input{label,helper,error,hint,icon,placeholder,value,onChange,type,disabled,readOnly}`; `Textarea{label,helper,error,hint,placeholder,value,onChange,rows,disabled,mono,autoFocus}`; `Select{label,helper,value,options,onChange}`; `DatePicker{label,helper,value,onChange,minDate}`; `TimePicker{label,helper,value,onChange,step}`; `Modal{open,title,description,onClose,width,footer,fixed}`; `ConfirmDialog{tone,icon,title,description,confirmLabel,cancelLabel,onConfirm,onCancel,loading}`; `Toast{tone,message,action,onAction,onClose}`; `Banner{tone,title,details,actions}`; `EmptyState{icon,title,action}`; `Card{title,subtitle,actions,padding,onClick,selected}`; `AppSidebar{items,value,onChange,connected,onConnectionClick,footer}`; `ConnectionStatus{connected,label,onClick}`. Icons are Lucide 0.454.0 names: `square-pen clock history layout-template settings copy pencil refresh-cw send check external-link lock mail loader-circle circle arrow-left chevron-down chevron-up chevron-left chevron-right calendar x info circle-alert circle-check triangle-alert ban`.
- Load Lucide as a global (`window.lucide`, UMD) or adapt `Icon` to `lucide-react`.

### 7.3 What is mocked and needs a real implementation
| Mock in prototype | Real implementation |
|---|---|
| Report "generation" via `polish/buildVars/render` | Call Gemini from the main process with the five note fields + template text; ask for JSON `{tasks[], topics[], weekly_plans[], blockers[]}` (one past-tense sentence ending in a period per item, no invention) and still run `render(template, vars)` to get blocks. Keep a fallback to the local rules so an API failure shows the error state (3.1 A) without losing notes. |
| Generation error | Real network/API error; show `Banner`, keep notes. |
| Zimbra connection ("connected" boolean, tests, login) | Check by attaching over CDP and loading the Zimbra URL; logged-in if the mail UI loads (not the login page). Never ask for a password. |
| "Prepare in Zimbra" 3 steps | Step 1 open/focus Zimbra tab; step 2 verify session; step 3 open New Message, fill To, Subject, Body, **stop**. Update the dialog per real step. Never click Send. |
| Scheduling | Persist items; in main process run a timer (check every 30 s) that, at the due time, runs the same Prepare flow and marks `prepared`, plus a notification/toast. On launch, any item whose time passed and status is still `scheduled` becomes `missed` → show the Missed dialog. Never send. |
| "I've Sent It" | User confirmation; write the history entry with the real time. |
| Storage | JSON files in the app data directory (or SQLite): `history`, `schedule`, `template`, `settings`, `draftNotes`. |
| Hard-coded times ("4:36 PM", "4:38 PM", "4:41 PM"), today = Oct 8, 2026, user name | Use real clock and the Profile settings. |
| Settings not wired | Profile → `{name}`/`{role}` in the report; Email defaults → Schedule dialog + Send dialog + subject; Default send time → Schedule dialog default; Zimbra URL → connection tests; Model → Gemini call. |
| State switcher, scale-to-fit, mock traffic lights, stage background | Prototype-only; remove. |
| Email body | Convert blocks to plain text (headings uppercase, `- ` bullets) or simple HTML for Zimbra. |
| Missed badge | The scheduled row in the missed state uses the "Scheduled" badge; in the real build use `StatusBadge status="missed"` (DS supports it). |

### 7.4 Accessibility
- **Tab order** (New Digest, form): sidebar items (New Digest → Scheduled → History → Templates → Settings → Zimbra status) → Today's Work → Topics / Lessons → Still Working On → Blockers → Tomorrow → Use example notes → Generate Digest. Review: Edit notes → Edit → Regenerate → Send Now → Schedule Send. Put main content before the title bar controls; keep DOM order = visual order.
- **Labels**: every field is wrapped in a `<label>` (the DS `Field`), so clicking the label focuses the field and screen readers announce "Today's Work". "Optional" is inside the label text. Icon-only buttons have `aria-label` (IconButton uses `label`). Icons are `aria-hidden`.
- **Focus styles**: fields get the orange 1 px border + 3 px ring `rgba(246,162,58,.28)`. Buttons, nav items and rows have **no** visible focus style in the DS: add `:focus-visible { outline: none; box-shadow: var(--focus-ring); }` to Button, IconButton, nav items, ConnectionStatus, History rows (make rows focusable with `tabindex=0`, Enter opens), Tags (buttons).
- **Dialogs**: `role="dialog" aria-modal="true"`; Esc closes closable dialogs. Add: label via `aria-labelledby` on the title, focus the first control on open, trap focus, restore focus on close. Preparing dialog is intentionally not closable.
- **Live regions**: `Toast` has `role="status"`; `Banner` has `role="alert"`. Announce generation progress by making the Steps container `aria-live="polite"`.
- **Contrast**: `--fg-3` (#8e8e8e) on `#0c0c0c` ≈ 6:1; orange `#f6a23a` on near-black passes; primary button text `#0c0c0c` on orange passes. Document text `#1b1b1b` on white passes. Status text colors sit on 14% tints of themselves over dark surfaces.
- Don't convey status by color alone: each badge has an icon or text label.

---

## 8. OUTPUT FORMAT
This README plus the raw project files (`prototype/` and `design_system_source/`) are the full handoff.

### Verification checklist (build vs. prototype)
**Shell**
- [ ] Window 1440×900 and 1280×800 both usable; title bar 40 px; sidebar 208 px; page header 60 px
- [ ] Sidebar shows exactly New Digest, Scheduled, History, Templates, Settings; active item styled (bg `#262626`, orange icon)
- [ ] Scheduled count badge appears only when ≥1 scheduled item
- [ ] "Zimbra Connected/Disconnected" pinned bottom, opens status dialog
- [ ] Title-bar status: Ready / Offline / Generating… / Scheduled · {time}
- [ ] ⌘N, ⌘↵, ⌘⇧S, ⌘S shortcuts

**New Digest**
- [ ] Empty form, header "New Daily Digest", date "October 8, 2026"-style, badge "Draft"
- [ ] Five labeled textareas, four marked Optional, placeholders as specified
- [ ] "Use example notes" visible only when empty; fills exact sample text
- [ ] Generate Digest disabled when empty; partially filled and filled states enable it
- [ ] Preview placeholder skeleton + caption before generation
- [ ] Generating: form dimmed, 3-step progress, "Generating…" on the button, title-bar pulse
- [ ] Generation error: Banner, "View details", Try Again, notes preserved
- [ ] Review: 320 px notes column + white document; header strip To/Subject; sections uppercase; Regards block
- [ ] Action bar: Edit, Regenerate (ghost), Send Now (outline), Schedule Send (only orange button)
- [ ] Edit: per-section textareas, helper text, Cancel, Save Changes; toast "Saved"; "Edited · Saved {time}"
- [ ] Regenerate confirms only when saved edits exist
- [ ] Notes column "Edit notes" returns to form with notes intact

**Sending**
- [ ] Send dialog with recipient + subject; button reads "Prepare in Zimbra"
- [ ] Disconnected Zimbra → login-required dialog (no password field anywhere)
- [ ] Preparing dialog with 3 steps, not closable; then "Email ready in Zimbra" with Open Zimbra
- [ ] Prepared panel: "Prepared in Zimbra", Open Zimbra, I've Sent It; header badge "Prepared in Zimbra"
- [ ] I've Sent It → Sent panel with time, History entry added at top
- [ ] Connection error dialog with Retry / Open Zimbra and "Nothing was sent."
- [ ] The app never clicks Send in Zimbra

**Scheduling**
- [ ] Schedule dialog: date, time, recipient (validation), approved-version note with "You press Send."
- [ ] Failure banner "Unable to schedule the digest." / "No changes were made."
- [ ] After scheduling: toast, locked panel (LED time, date, recipient, Approved version note), document read-only
- [ ] Edit Schedule changes date/time/recipient only; toast "Schedule updated."
- [ ] Cancel confirm → "Cancelled" row (60% opacity), toast "Digest cancelled."
- [ ] Scheduled list: grouping, 6 columns, badges, View/Edit/Cancel, helper line, empty state
- [ ] Missed dialog: "No email was sent." with Prepare Now / Cancel; nothing auto-sent

**Supporting**
- [ ] History list (Date, Subject, Recipient, Status, View/Duplicate), detail view with back + Duplicate, empty state
- [ ] Duplicate loads notes only and requires generate + review
- [ ] Templates: editor with orange variable highlighting, 8 clickable variable tags, live preview, Save/Cancel enabled only when dirty, toast "Template saved."
- [ ] Settings: General, Profile, Email, Zimbra, AI Provider (last, quiet); Save toast
- [ ] No sparkle/robot/AI wording in the UI outside the AI Provider card
- [ ] Toast copy matches section 3.7
- [ ] LED Dot-Matrix only for scheduled/sent times; JetBrains Mono only for raw notes, template editor and error details
