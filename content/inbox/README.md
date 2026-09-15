# Community publications — inbox

Drop material here that you want folded into the workshop. Anything in this folder gets
picked up on the next intake pass, registered in [`../sources.json`](../sources.json),
vetted against Microsoft Learn, and mapped to a workshop module.

## Accepted formats

| What | How |
|---|---|
| **A list of links** | Add lines to `links.md` (one URL per line; an optional `— note` after the URL is kept as context) |
| **A saved article** | Drop a `.md`, `.html`, `.pdf` or `.txt` file straight into this folder |
| **A Windows shortcut** | Drop a `.url` file |
| **A GitHub repo / talk / video** | Just the URL in `links.md` — it's recorded as `kind: repo` / `talk` / `video` |

You can also simply paste links into the chat; they go through exactly the same pipeline.

## What happens to each item

```
intake  →  fetch to ../cache/  →  vet against Microsoft Learn  →  map to module  →  surface in site
```

1. **Register** — one record in `sources.json` with title, author, publisher, dates, origin.
2. **Fetch** — the page is converted to markdown in `../cache/` so it can be vetted offline.
   Paywalled or unfetchable items are kept as *link-only* and marked `unverifiable`; their
   content is never reconstructed or guessed at.
3. **Vet** — every factual claim is cross-checked against Microsoft Learn. Crucially, we
   record which build the post was written against (`writtenAgainst`). A lot of
   .NET 11 / C# 15 writing dates from Previews 1–5, and **union types and memory safety
   changed materially by RC 1** — so posts that were correct when published are wrong now.
   Those get flagged `outdated` rather than quietly propagating stale syntax.
4. **Map** — tagged to one or more of the 11 workshop modules (`day1-m2`, `day2-m5`, …).
5. **Surface** — appears in that module's *Further reading* block and in `site/sources.html`.

## Verification statuses

| Status | Meaning |
|---|---|
| `verified` | Claims check out against first-party docs |
| `partially-verified` | Mostly sound; specific caveats recorded in `verificationNotes` |
| `contradicts-learn` | Conflicts with first-party docs — kept deliberately, these make good "spot the outdated advice" discussion moments |
| `outdated` | Was correct when written, superseded since (usually pre-RC .NET 11 content) |
| `unverifiable` | Couldn't be fetched (paywall, dead link) — link-only, Tier 1 |

## How community material is used (copyright)

Community posts are copyrighted. Three tiers, and nothing else:

| Tier | What we do |
|---|---|
| **1 — Reference** | Link + our own one-line description of why it's worth reading. The default. |
| **2 — Attributed insight** | We restate an idea, benchmark or finding **in our own words**, with a visible citation. |
| **3 — Short quote** | A brief quoted passage with explicit attribution, only where the exact wording matters. |

We never bulk-copy prose, reproduce figures or images without permission, or lift code
samples wholesale. Workshop code is ours, or comes from permissively-licensed sources with
the license recorded. Where a post inspires a lab, the lab is our own implementation with an
"inspired by" credit.
