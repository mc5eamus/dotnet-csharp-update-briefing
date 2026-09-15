# Briefing — .NET 10/11 & C# 14/15 workshop

**Status: complete and verified. Ready to schedule.**

A two-day customer workshop, built to the pre-workshop survey, delivered as an offline
presentation site plus nine hands-on labs. Everything in this repository has been compiled,
run, or tested on the machine that produced it.

---

## The split

Version-based, one release per day. The split maps onto a *decision*, not onto a topic list.

| | Day 1 | Day 2 |
|---|---|---|
| Covers | .NET 10 / C# 14 | .NET 11 / C# 15 |
| Status | **GA, LTS** — supported to 14 Nov 2028 | **RC 1**, GA Nov 2026 — **STS** to ~Nov 2028 |
| The question | "How do we adopt this?" | "*Should* we take this at all?" |
| Content | 6 modules, 83 slides (4 h) | 6 modules, 37 slides (~3 h 45) |
| Labs | 4 (130 min) | 5 (135 min) |

Day 1 runs **four hours of content plus two hours ten of labs** — a full day with breaks. Day 2 is
comparable. Day 1 is the deeper of the two because it is the one the customer will act on: .NET 10
is GA and LTS, so every minute spent there converts into work they can schedule.

The two days are deliberately coupled: **Labs 08 and 09 migrate the exact applications attendees
build in Labs 03 and 04.** The upgrade is experienced rather than described, which is the only way
the Day 2 question gets an honest answer.

A legitimate outcome of Day 2 is that a team decides to **skip .NET 11 and wait for .NET 12**. The
material is built to support that conclusion rather than to sell against it.

## Survey alignment

| Survey response | How it was handled |
|---|---|
| **High interest** — EF Core, ASP.NET Core (OpenAPI 3.1), .NET libraries (PQC, System.Text.Json) | Carry the weight of both days, including 5 of the 9 labs |
| **No interest** — MAUI, WinForms, WPF, Blazor, F#, VB.NET | Deliberately absent, zero slides |
| **.NET 12 outlook** (optional) | 15 minutes, directional only, and the first thing to cut if running late |

On .NET 12: no documentation or preview exists yet. The material says so plainly rather than
hedging, and the customer's own fallback of a separate 2027 session remains the honest answer.

---

## What makes this different from the release notes

Every claim was **compiled and run**, not read. That produced ten documented findings, recorded in
`FACILITATOR.md` section 3, in three groups:

**Widely-repeated claims that are simply wrong**
- Runtime async is **opt-in** on RC 1. Targeting `net11.0` is not enough, despite nearly every
  write-up saying so. Measured by reflection: 3–4 state machine types remain until you switch it on.
- The "cleaner stack traces" demo **does not work**. Traces are identical across .NET 10, default
  .NET 11, and runtime-async .NET 11. Attempting it live would cost the presenter the room.
- The **OpenAPI version string is wrong everywhere**, including when you pin it. Pinning 3.1 yields
  `3.1.2`, not `3.1.0` — pinning does not freeze the patch digit.

**Correct in the docs, but routinely misread**
- `CS8509` union exhaustiveness is a **warning**, not an error, until you promote it.
- The PQC experimental boundary is **per-member**, not per-type — every standard key-interchange
  format is experimental, and `SYSLIB5006` is an error.
- **STS is now 24 months.** .NET 10 (LTS) and .NET 11 (STS) therefore expire in the *same week*,
  which removes the usual "LTS lasts longer" argument. .NET 8 and .NET 9 both end on 10 Nov 2026.
- Unions **serialize** with default options and **never deserialize** — the write side looks
  healthy and the failure surfaces at a downstream consumer. The likeliest of these to cost
  someone a production incident.

**Slides we got wrong ourselves and fixed by measuring**
- Collection-expression capacity is exact; an early slide claimed otherwise.
- User-defined `operator +=` is an **instance** member, and extension operators need an **unnamed**
  receiver. Both original snippets failed to compile.
- A slide shipped with placeholder text where its expected output should have been.

That third group is stated openly in the facilitator guide. It is the evidence for the claim that
the rest was checked.

---

## Deliverables

| | |
|---|---|
| `site/` | Source of the presentation site — 4 pages, 66 content slides |
| `dist/` | Built output: 4 self-contained HTML files, 540 KB, **generated — run `tools/build-standalone.ps1`** |
| `labs/` | 9 labs, each with `start/`, `solution/` and a `README.md` |
| `FACILITATOR.md` | Pre-flight, day shapes, the ten corrections, per-lab guidance |
| `content/sources.json` | 37 vetted sources with provenance and drift verdicts |
| `tools/` | Build, validation and test scripts |

The presentation site needs **no server, no build step and no network**. Each `dist/` page opens
straight from disk or a USB stick. `N` toggles speaker notes, `P` enters presenter mode.

### Opening it any time

`pwsh tools/publish-local.ps1` installs the deck to `%LOCALAPPDATA%\dotnet-csharp-update-briefing\`
and adds a **.NET 10-11 Workshop** Start Menu entry — one click, offline, no repo needed. The
`workshop-deck.zip` on the [latest release](https://github.com/magro_microsoft/dotnet-csharp-update-briefing/releases/latest)
does the same job on any other machine: unzip, open `index.html`.

There is no hosted URL by design. GitHub Pages is not available for private repositories on this
account's plan, and the repository stays private because this is customer material. Building the
deck to run from `file://` was the point.

## Sourcing

The decks contain **zero hardcoded URLs**. Every link an attendee can click comes from the vetted
registry, so a single validated file governs what the workshop points at.

Each record carries the build it was written against, a preview-drift verdict, and a reuse tier.
Un-vetted material enters at tier 1 (link only) and **cannot reach a slide until a human vets it**.
Third-party articles are referenced and summarised in our own words; fetched copies stay local and
are never redistributed.

## Verification

All green as of the last run:

| Check | Result |
|---|---|
| Source registry | 37 records, all verified, 0 warnings |
| External links | 37/37 resolve |
| Page structure | 4 pages, 0 errors, 0 warnings |
| Headless page tests | 71/71 on source **and** built output |
| Syntax highlighter | 62/62 |
| Day 1 solutions | 0 errors, 2 warnings (both intentional — the Lab 01 `field` trap) |
| Day 2 solutions | 0 errors, 0 warnings |

Re-run everything with the commands in `README.md`. `tools/build-standalone.ps1` refuses to
publish if any structural check fails.

## Known constraints

- **Day 2 runs against .NET 11 RC 1.** Behaviour can still change before GA in November 2026.
  Re-run the labs and `tools/check-links.ps1` before any delivery after that date.
- **Day 2 is the heavier day**; the C# 15 module alone is 85 minutes. Safe cuts are listed in
  `FACILITATOR.md`.
- Two Day 2 features need explicit opt-in (`runtime-async=on`, `<LangVersion>preview</LangVersion>`)
  and will not behave as documented without it.
- The .NET 11 SDK is not on `PATH` by default on the build machine; `tools/dotnet11.ps1` resolves it.
