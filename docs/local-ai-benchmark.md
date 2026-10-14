# Local AI benchmark

Machine: Intel i5-1135G7, 4 cores, 15.7 GB RAM, CPU only. Model: qwen2.5:3b-instruct, already loaded in memory for every run. Run with `node scripts/try-local.mjs` (set `TRY_HISTORY` to your `history.json` to use your own sent reports as examples).

## Results

| Run | Items | Total time | First sentence | Items using built-in rule |
|---|---|---|---|---|
| Before (run 1) | 9 | 13.1 s | n/a | n/a |
| Before (run 2) | 9 | 15.9 s | n/a | n/a |
| After, built-in examples only | 9 | 40.9 s | 12.1 s | 0 |
| After, own history as examples | 9 | 34.2 s | 10.4 s | 0 |
| After, own history, 13 items | 13 | 38.1 s | 7.5 s | 0 |
| After, own history, 13 items (again) | 13 | 41.3 s | 3.5 s | 0 |

Success criteria: a typical report in under 60 s (met, 34-41 s), and at most 1 in 10 items using the built-in rule (met, 0 of 9 and 0 of 13).

## What the numbers do not say

- The new version is **slower in total** than the old one (about 35-40 s against 13-16 s). The old version was fast because it did not do what was asked: it merged several items into one sentence, so there were fewer sentences than items and the report lost items. The new version writes one full sentence per item, and it writes the note before each sentence so the sentence stays on the right item. That is more text to produce on a CPU.
- The first sentence appears on screen after about 3-12 s, so the report fills in while it is generated.
- Times vary by several seconds from run to run on this machine.

## Findings that shaped the design

- Examples written into the system prompt were followed weakly: topics often came back as bare phrases (for example "Criteria API projections") and the output changed from run to run. The same examples shown as an earlier chat turn gave a full sentence for every item.
- Forcing the number of sentences with the reply schema is not enough. Without anchoring, 1-3 of 9 sentences per run were about a different item than their own (a dropped item shifted the rest, or an example sentence was copied into the wrong item). Having the model copy the note before each sentence brought that to 0 of 27 in a scratch test.
- The checks cannot catch every added detail. In the 13-item run a few sentences add generic reasons ("to improve performance", "to ensure data integrity") that the notes did not state. The checks catch invented numbers and names and sentences about the wrong item, not general filler. Read the report before sending it.
