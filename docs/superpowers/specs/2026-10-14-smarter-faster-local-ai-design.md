# Smarter, faster local AI

Date: 2026-10-14. Builds on `2026-10-13-local-ai-with-cloud-fallback-design.md`.

## Goal

Each item becomes a well-structured formal sentence in the user's own tone, and a typical report (8-12 items) generates in under 60 seconds on the user's machine. The local AI stays local-first and never invents facts.

## Context

- Hardware: Intel i5-1135G7, 4 cores, 15.7 GB RAM, no usable GPU. Generation is CPU-bound, so speed depends on how many tokens are read and written.
- Model: `qwen2.5:3b-instruct` via Ollama. A larger model is out of scope: about 2x slower, which conflicts with the target.
- Today: one request carries all five note fields and returns one JSON object; a long rule-based prompt; one retry on an unusable reply.
- The glossary already defines **Example pair** (a past item and the sentence the user sent). It is not built yet.

## Approach

Tune the single call. One request per report stays; the inputs and output handling change. A per-item-call design was considered and rejected for now: more calls on a CPU put the 60 s target at risk. It is the documented follow-up if the benchmark misses the target.

## Components

### `src/main/examples.js` (new)
- Reads sent digests from history. For each section, pairs the n-th note item with the n-th report sentence.
- Uses a section only when its item count equals its sentence count. Hand-edited reports are skipped, never mismatched.
- "Still Working On" items merge into `tasks`, matching how the report is built today.
- Tops up with built-in example pairs when fewer than 6 exist.
- Ranks candidates by keyword overlap with today's items and returns the best 4-6.

### `src/main/reply.js`
- `PROMPT` shrinks to a short instruction plus the example pairs. The rules are cut to the four that matter: one sentence per item, start with a verb in the right tense, fix technical names, never invent facts.
- Sentence length asked for: 12-20 words (was 12-25).
- Order: fixed text and examples first, today's notes last, so Ollama can reuse its prompt cache.
- `parseReply` is unchanged and still used by the cloud path.

### `src/main/localai.js`
- Sends a JSON schema in `response_format` so the reply shape is always valid.
- Sets `keep_alive`, a fixed `num_ctx` (so the context size never changes between runs) and a capped `num_predict`.
- Streams the reply and calls an `onSentence` callback for each finished sentence.
- The retry on an unusable reply remains but becomes rare. The 120 s timeout is unchanged.

### `src/main/check.js` (new)
- Checks each sentence against its item: digits, capitalised names and tool names that do not appear in the item (after the technical-name fix list) cause a failure.
- A failing sentence uses the **Built-in rule** for that item only. The rest of the report keeps the AI sentences.

### `src/main/generate.js`
- Remains the orchestrator. Calls `examples`, builds the prompt, runs local, runs `check`, renders. The cloud path, consent flow and sanitising are untouched.
- Optional warm-up: a tiny request at app start so the first report does not pay the model load time.

## Data flow

notes -> pick examples -> prompt (fixed prefix + notes) -> streamed schema-valid JSON -> per-item check -> report.

## Errors

- A sentence failing the check: built-in rule for that item; the report notes which items did.
- Local call fails entirely: existing path (cloud fallback with consent, then built-in rules).
- Stream breaks midway: sentences already received are kept; the remaining items use built-in rules.
- Too few examples never blocks generation; built-in examples fill the gap.

## Testing

- Unit tests with a fake `fetch` (no Ollama): example alignment and the skip rule, similarity ranking, the invented-fact check, schema and prompt shape, stream parsing. Same style as the existing tests.
- `scripts/try-local.mjs` extended to print time to first sentence, total time, and the number of items that fell back. Run before and after on the user's own notes.

## Success criteria

- Total time under 60 s on a typical report on the user's machine.
- At most 1 in 10 items falls back to the built-in rule.
- No sentence contains a fact absent from its item.

## Out of scope

Bigger models, per-item calls, GPU setup, changes to the cloud providers.

## Revisions after probing Ollama 0.40.2 (2026-10-14)

- `num_ctx` is dropped: `/v1` cannot set it and the default of 4096 is stable between runs.
- `keep_alive` is sent in the `/v1` request body and Ollama honours it.
- The JSON schema fixes each array's length to the number of note items (`minItems == maxItems`), so sentence N is item N. A reply with the wrong count makes that whole section use the built-in rules; a stream that drops part-way is aligned by prefix.
- Live sentences in the UI use a new `ai:progress` event.
- If every sentence is rejected by the check, the result is reported as source `template`.
