# Interaction map

One page, so every control either moves you to a section, changes a demo's state, or leaves for GitHub.
The nav stays pinned, so the way back from anywhere is the nav or the wordmark (top of page).
Demo data is real app output or the same sample notes the screenshots use; nothing is sent anywhere.

| Control | Where | Does | States | Motion | Way back |
| --- | --- | --- | --- | --- | --- |
| Wordmark | nav, footer | scrolls to the top | hover, focus | smooth scroll | itself |
| How it works, Privacy, Setup | nav | scrolls to the section | hover, focus, current section | one orange bar slides under the current link | nav |
| Download (3) | nav, hero, close | opens the GitHub release page | hover, pressed, focus | the arrow drops, like a file landing | browser back |
| Report capture | hero | none, a picture | loading | resolves through an ordered-dither pixel reveal, then the two chips dock onto its corners | n/a |
| Rough line rows | How it works | rewrites that row's sentence | idle, selected, writing, written | sentence lights up column by column like an LED sign | pick another row |
| Confirm / Ready in Zimbra | Zimbra section | moves the dialog rail to that step | selected, focus | dialogs travel along a horizontal rail | the other step |
| Prepare in Zimbra / Start again | Zimbra section | next step, back to step 1 | hover, pressed, focus | same rail | Start again |
| Your notes / What a cloud service sees | Privacy | swaps emails and links for placeholders | selected, focus, redacting | an orange bar wipes each private word, then the placeholder is printed | the other tab |
| Copy | Setup | copies the `ollama pull` command | idle, copied, failed (select the text) | icon flips to a check | resets after 2 seconds |
| Setup steps | Setup | none | dim, lit | numbers light one after another when the list is on screen | n/a |
| FAQ questions | Questions | opens the answer | closed, open, hover, focus | plus turns to a cross, answer slides down | click again |
| Release notes, Chrome, Ollama | footer, setup | external page | hover, focus | none | browser back |

Without JavaScript every section is still readable: all three sentences, both dialogs and the report show as plain content.
With reduced motion the reveals, rail and wipes become instant changes; the states still work.
