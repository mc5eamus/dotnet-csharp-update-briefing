# What's New in .NET 10 / C# 14 and .NET 11 / C# 15 — 2-day workshop

A complete, self-contained workshop package: an offline HTML presentation site (a replacement
for slides), nine hands-on labs with starter and solution projects, a facilitator guide, and a
vetted bibliography of community material.

> **Verified against:** .NET 10.0.12 (GA, LTS) and .NET 11.0.100-rc.1.26425.128 (RC 1).
> .NET 11 is a release candidate — GA is expected November 2026 — so Day 2 content carries a
> verification stamp and should be re-checked after GA.

📋 **[BRIEFING.md](BRIEFING.md)** — one-page status, scope and verification summary. Start there
if you are deciding whether to schedule this rather than preparing to deliver it.

## The two days

| | Day 1 — "Adopt now" | Day 2 — "Prepare & decide" |
|---|---|---|
| **Covers** | .NET 10 / C# 14 | .NET 11 / C# 15 |
| **Status** | GA, **LTS** to 14 Nov 2028 | **RC 1**, GA ~Nov 2026, **STS** (24 months, so also ~Nov 2028) |
| **Modules** | Platform &amp; runtime → C# 14 → Libraries (PQC, System.Text.Json) → ASP.NET Core 10 (OpenAPI 3.1) → EF Core 10 → Wrap-up | Runtime-native async → C# 15 (unions, closed hierarchies) → Libraries → ASP.NET Core 11 (OpenAPI 3.2) → EF Core 11 → .NET 12 outlook |
| **Length** | 84 slides, **4 h** content + 2 h 10 labs | 37 slides, ~3 h 45 content + 2 h 15 labs |

Day 2's ASP.NET Core and EF Core labs are **upgrades of the Day 1 labs**, so attendees migrate
their own application from .NET 10 to .NET 11 and hit the OpenAPI 3.1 → 3.2 breaking change
themselves rather than reading about it.

## Getting started

Open **`site/index.html`** in any browser. No web server, no network, no build step — the site
is fully self-contained and works from `file://`.

For a single-file version to hand to attendees:

```powershell
npm install --prefix tools        # once per clone — jsdom, for the page tests
pwsh tools/build-standalone.ps1   # emits dist/*.html with CSS and JS inlined
```

`node_modules` is not committed, so the `npm install` is needed once after cloning. It is a
tools-only dependency — nothing shipped to attendees depends on it, and the presentation site
itself needs no build at all.

The build refuses to publish pages that fail the headless checks, so a green run means the
bundled files were actually booted and verified, not just concatenated.

## Opening the deck any time

To keep the deck one click away without the repo, a build step or a network:

```powershell
pwsh tools/publish-local.ps1
```

That runs the gated build, installs the single-file pages to
`%LOCALAPPDATA%\dotnet-csharp-update-briefing\` and adds a **.NET 10-11 Workshop** entry to the
Start Menu. Bookmark the printed `file://` URL, or just search the Start Menu for *workshop*.
Pass `-Destination` for a different folder, `-NoShortcut` to skip the Start Menu entry.

The installed copy is a **snapshot**, not a live view — re-run the script after editing slides.
It records `installed.json` with the commit it came from, so a copy found later can be traced
back. Removing it is a matter of deleting that folder and the shortcut.

On a machine without the repo, download `workshop-deck.zip` from the
[latest release](https://github.com/magro_microsoft/dotnet-csharp-update-briefing/releases/latest),
unzip anywhere and open `index.html`.

There is deliberately no hosted version. GitHub Pages is not offered for private repositories on
this account's plan, and the repository stays private because this is customer engagement
material. The deck was built to work from `file://` precisely so that hosting is not required.

## Prerequisites for running the labs

| | Why |
|---|---|
| **.NET 10 SDK** | Day 1 labs (`net10.0`). Required for scaffolding — see the note below. |
| **.NET 11 SDK (RC 1 or later)** | Day 2 labs (`net11.0`) |
| An editor | Visual Studio 2026, VS Code + C# Dev Kit, or Rider |

> **Install both SDKs.** The .NET 11 SDK's templates only offer `net11.0`, so
> `dotnet new console --framework net10.0` fails on an 11-only machine. The 11 SDK can *build*
> an existing `net10.0` project, but it cannot *scaffold* one.

SDKs install side-by-side and do not interfere with each other. If you installed .NET 11 to a
user-local root, `.\tools\dotnet11.ps1` invokes the right `dotnet.exe`.

### Optional, for full coverage
- **Post-quantum cryptography (Lab 02)** needs OpenSSL 3.5+ or Windows CNG with PQC support.
  The lab gates every path on `IsSupported` and still teaches if an algorithm is unavailable —
  which is realistic: on Windows 11 25H2, ML-KEM and ML-DSA are available but **SLH-DSA is not**.
- **SQL Server vector search / JSON indexes** need Azure SQL or SQL Server 2025. The runnable
  EF labs use **SQLite**; vector and JSON-index topics are code walkthroughs, clearly flagged.

## Running the labs

```powershell
dotnet build labs/Day1.sln     # all Day 1 labs
dotnet build labs/Day2.sln     # all Day 2 labs (needs the .NET 11 SDK)
```

Each lab folder has a `README.md` with the exercise brief, a `start/` project to work in, and a
`solution/` project to compare against.

| Day 1 | Day 2 |
|---|---|
| `01-CSharp14` | `05-RuntimeAsync` |
| `02-Libraries-Pqc-Json` | `06-CSharp15-Unions` |
| `03-AspNetCore-OpenApi` | `07-Libraries11` |
| `04-EfCore10` | `08-AspNet11-Migration` — upgrades Lab 03 |
| | `09-EfCore11-Migration` — upgrades Lab 04 |

## Repository layout

```
site/         Presentation site (open index.html)
labs/         Nine labs, each with README + start/ + solution/
content/      Sources pipeline — inbox/, cache/, sources.json + schema
tools/        Page checks, source intake/validation, solution generation, dotnet helper
verify/       Runnable harnesses behind the "verified by measurement" claims
dist/         Generated single-file pages
FACILITATOR.md
```

### Verifying the package

```powershell
pwsh tools/validate-sources.ps1          # schema-checks the source registry
node tools/check-pages.mjs               # static checks on the HTML
node tools/find-placeholder-output.mjs   # catches un-replaced expected-output stubs
node tools/test-pages.mjs                # boots every page headlessly (71 checks)
node tools/test-highlighter.mjs          # syntax highlighter (62 checks)
pwsh tools/check-links.ps1               # every registry URL still resolves (needs network)
```

`tools/build-standalone.ps1` runs the first three plus a headless test of the bundled
output, and refuses to publish if any of them fail.

`check-links.ps1` is deliberately *not* in that gate: the package has to build on a
machine with no network, and a flaky proxy must never block a rebuild. Run it by hand
before handing the material over.

## Scope

Driven by the customer's survey. **In focus:** EF Core, ASP.NET Core / OpenAPI, and .NET
libraries (post-quantum cryptography, System.Text.Json).

**Deliberately out of scope:** MAUI, Windows Forms, WPF, Blazor, F#, VB.NET. This matters when
reading the source material — the ASP.NET Core release notes are roughly half Blazor content,
and all of it has been filtered out here.

## Sources

Every module links its own *Further reading*, drawn from `content/sources.json` (77 entries).
Each is tagged with how far it has been verified, what build it was written against, and how far
we are allowed to reuse it under copyright.

First-party documentation — the Microsoft Learn "what's new" pages for .NET 10/11, C# 14/15,
ASP.NET Core, EF Core, and the support policy — is marked **first-party** so attendees can tell
at a glance what carries vendor authority and what is community commentary.

Community articles are an **enrichment layer**: cross-checked against first-party docs, and
carrying an explicit drift note where preview-era advice no longer matches what we measured.
See [`content/inbox/README.md`](content/inbox/README.md) to add material — including the
copyright rules that govern how it's used.

## A note on accuracy

Every marquee claim in this package was verified by compiling and running it, not by reading
about it. That process found errors in published documentation, in community posts, and in our
own early drafts — including the runtime-async default, the OpenAPI version strings, collection
expression capacity, overload resolution silently moving from `IEnumerable<T>` to
`ReadOnlySpan<T>`, and the STS support window. Those corrections are collected in
**[`FACILITATOR.md`](FACILITATOR.md) § 3** (sixteen findings) and flagged in the deck with a
✓ *verified* callout.

Where a finding is worth re-running rather than just reading, the harness ships too — see
**[`verify/`](verify/README.md)**. The escape-analysis benchmark builds one source file against
.NET 8, 9 and 10 and reproduces the headline result live:

```powershell
cd verify/EscapeAnalysis
./run.ps1 -Repeat 3
```

Re-run them after .NET 11 GA. The method matters more than any individual finding.

