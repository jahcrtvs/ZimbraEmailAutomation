# Local AI benchmark

Machine: Intel i5-1135G7, 4 cores, 15.7 GB RAM, CPU only. Model: qwen2.5:3b-instruct. Notes: the built-in SAMPLE_NOTES (10 items).

| Run | Total time | First sentence | Items using built-in rule |
|---|---|---|---|
| Before, warm (run 1) | 13.1 s | n/a | n/a |
| Before, warm (run 2) | 15.9 s | n/a | n/a |

The model was already loaded in memory for both "before" runs, so no cold start was measured. In the "before" output the model merged several items into one sentence (for example three work items became one "Completed working on Hibernate, ..." line), so it returned fewer sentences than there were items. Speed was already inside the 60 s target; sentence quality and one-sentence-per-item were the real problems.
