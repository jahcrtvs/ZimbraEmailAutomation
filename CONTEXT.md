# Daily Digest

A desktop app that turns a trainee's rough daily notes into a formal status email, which is prepared in Zimbra for the user to send.

## Language

**Note field**:
One of the five boxes the user types rough notes into: Today's Work, Topics / Lessons, Still Working On, Blockers, Tomorrow.
_Avoid_: Input, category, textbox

**Item**:
One non-empty line in a note field. An item always becomes exactly one sentence; the user presses Enter to make a new item.
_Avoid_: Bullet, entry, note (as a unit), task

**Sentence**:
The formal, complete rewording of one item that appears in the report.
_Avoid_: Line, bullet, output

**Section**:
A titled group of sentences in the report (for example TASK TODAY). Which section an item lands in is decided by its note field and the template, never by the AI.
_Avoid_: Block, category

**Report**:
The finished text of a digest: sections of sentences plus the sign-off. What the user reviews, edits and sends.
_Avoid_: Digest (for the text), email body, output

**Digest**:
The whole piece of work for one date: notes, report, and where it is in its life (draft, scheduled, prepared, sent).
_Avoid_: Report (for the whole thing), entry

**Local AI**:
The language model running on the user's own computer that writes sentences by default.
_Avoid_: Offline model, Ollama (that is one way to run it)

**Cloud fallback**:
The one optional online provider used only when the local AI fails, and only with the user's consent or opt-in.
_Avoid_: Backup AI, remote model

**Built-in rule**:
The app's fixed text rules that turn an item into a sentence with no AI. Used when no AI result is available for an item.
_Avoid_: Template (that word means the report layout), fallback text

**Invented fact**:
Anything in a sentence that the item did not state or clearly imply: a number, a result, a cause, a person, a tool. Never allowed.
_Avoid_: Hallucination, extra detail

**Example pair**:
A past item and the sentence the user sent for it, shown to the local AI so it copies the user's tone and vocabulary.
_Avoid_: Training data, few-shot sample
