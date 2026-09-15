# Facilitator guide

Everything the person at the front of the room needs that isn't on a slide.

Read [Setup](#1-setup) before the day. Read [Corrections we found](#3-corrections-we-found-by-testing)
before you present Day 2 — several widely-repeated claims about .NET 11 are wrong, we can prove it,
and that is one of the most valuable things this workshop delivers.

---

## 1. Setup

### The machine you present from

| Component | Version used to build and verify this material |
|---|---|
| .NET SDK (Day 1) | `10.0.300` (system install, `C:\Program Files\dotnet`) |
| .NET SDK (Day 2) | `11.0.100-rc.1.26425.128` (**user-local**, `%LOCALAPPDATA%\Microsoft\dotnet`) |
| .NET runtimes | 10.0.12 and 11.0.0-rc.1 |
| OS | Windows 11 25H2 |

**The two SDK roots do not discover each other.** A user-local SDK install is invisible to the
`dotnet` on `PATH`. Every Day 2 command must go through the user-local executable:

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
& $dotnet --version      # 11.0.100-rc.1.26425.128
```

`tools\dotnet11.ps1` resolves this for you. The .NET 10 runtimes were deliberately installed into
the same root, so that one executable builds and runs **both** days.

### What attendees need

Both SDKs. This is not optional and it is the single most common way a hands-on day goes wrong.

> **The .NET 11 SDK cannot scaffold .NET 10 projects.**
> `dotnet new console --framework net10.0` **fails** on the .NET 11 SDK — the templates only
> offer `net11.0`. It *can* build and run a `net10.0` project that already exists, which is why
> the migration labs work. But an attendee with only the .NET 11 SDK cannot start Day 1.

Check the room before you begin:

```powershell
dotnet --list-sdks
& (Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe') --list-sdks
```

There is deliberately **no `global.json`**. Pinning an SDK would break the other day. The target
framework in each `.csproj` does the work instead — that is also the honest way to explain it.

### Pre-flight, the morning of

```powershell
cd <repo-root>

pwsh -NoProfile -File tools/make-solutions.ps1     # regenerate the .sln files

# --no-incremental matters: MSBuild does not replay warnings for an
# up-to-date project, so a second plain build reports 0 warnings and
# you would wrongly conclude the Lab 01 trap had been fixed.
& $dotnet build labs\Day1.sln --no-incremental             # expect 2 warnings, 0 errors
& $dotnet build labs\Day1-Solutions.sln --no-incremental   # expect 2 warnings, 0 errors
& $dotnet build labs\Day2.sln --no-incremental             # expect 0 warnings, 0 errors
& $dotnet build labs\Day2-Solutions.sln --no-incremental   # expect 0 warnings, 0 errors

node tools/check-pages.mjs                         # 0 errors, 0 warnings
node tools/test-pages.mjs                          # all checks pass
```

> **Those 2 warnings on Day 1 are deliberate.** They are `CS9258` in
> `Day1\01-CSharp14\start\DispatchCounter.cs` — the `field` keyword trap, which is the point of
> Lab 01. If they disappear, someone has "fixed" the lab.

### While you still have good connectivity

```powershell
pwsh -NoProfile -File tools/check-links.ps1        # 37 URLs, expect 0 broken
```

Every link an attendee can click comes from `content\sources.json`, so this one file is where
link rot shows up. It has already caught a real one: the ASP.NET Core 11 release notes live at
`.../aspnetcore-11`, and the plausible-looking `.../aspnetcore-11.0` is a 404.

This check is not part of `build-standalone.ps1` on purpose — the package must build with no
network at all, and a corporate proxy should never be able to block a rebuild.

Restore NuGet packages at the same time. Most labs are deliberately
zero-dependency and restore instantly; the ASP.NET Core and EF Core labs are not.

### The site

`site\index.html` opens directly from disk. No server, no build step, no network.

- **Present** switches to one-slide-at-a-time. `←` / `→` or `Space` to move.
- **Notes** reveals the speaker notes — the boxed asides written for you, not the room.
- **Theme** toggles light/dark. Use light for a projector in a bright room.
- The table of contents on the left has a search box; `/` focuses it.

Everything is relative-path and offline. If you need a single-file handout, run
`tools\build-standalone.ps1` to inline the CSS and JS into `dist\`.

---

## 2. Shape of the two days

The split is by **release**, and it maps onto a decision rather than onto a topic list:

| | Day 1 | Day 2 |
|---|---|---|
| Covers | .NET 10 / C# 14 | .NET 11 / C# 15 |
| Status | **GA, LTS**, supported to 14 Nov 2028 | **RC 1**, GA Nov 2026, **STS** (24 months, to ~Nov 2028) |
| The question | "How do we adopt this?" | "*Should* we take this at all?" |

Say that framing out loud at the start of Day 2. It is the difference between a feature tour and
a useful day. Several teams in the room should conclude they will **skip .NET 11 and wait for
.NET 12**, and that is a legitimate, well-supported outcome — not a failure of the workshop.

> **Know the support arithmetic before you present either day.** STS moved from 18 to 24 months
> with .NET 9, which means .NET 11 and .NET 10 reach end of support in the *same week* of
> November 2028, and .NET 8 and .NET 9 both expire on **10 November 2026** — about eight weeks
> from now. See [section 3.5](#35-support-windows-the-arithmetic-changed).

### Timing

Day 1 is 5 modules / 29 slides, Day 2 is 6 modules / 37 slides. Both run about 6 hours of content
plus breaks. Full timings are on `index.html`.

**Day 2 is heavier and the C# 15 module is 85 minutes.** If you are running late, the safe cuts
are, in order:

1. The .NET 12 outlook (15 min) — there is genuinely nothing to say yet, see below.
2. Memory safety in C# 15 — the one feature needing `<LangVersion>preview</LangVersion>`.
3. Lab 07, which can be a demo rather than hands-on.

Do **not** cut the CS8509 slide or the runtime-async correction. They are the parts attendees
cannot get from the release notes.

### What the customer asked for

From the pre-workshop survey. This drove the entire content split, so honour it:

**High interest — spend the time here:** EF Core, ASP.NET Core (OpenAPI 3.1), .NET libraries
(post-quantum cryptography, System.Text.Json).

**No interest — deliberately absent:** MAUI, WinForms, WPF, Blazor, F#, VB.NET. If asked, say it
was scoped out by their own survey rather than improvising coverage.

**.NET 12 outlook** was explicitly optional, with a separate 2027 session as the fallback. Keep it
short and directional — **no .NET 12 documentation or preview exists**, so anything specific you
say is speculation. Say that plainly; it lands better than hedging.

---

## 3. Corrections we found by testing

Every code sample here was compiled and run on the machine that built this workshop. Ten findings
came out of that, and they fall into three groups:

- **Widely-repeated claims that are wrong** — runtime async being on by default (3.1), the cleaner
  stack traces demo (3.2), and the OpenAPI version string (3.6).
- **Things the docs state correctly but nobody reads carefully** — `CS8509` being only a warning
  (3.3), the per-member PQC experimental boundary (3.4), the support arithmetic (3.5), and unions
  serializing happily while never deserializing (3.9).
- **Slides we got wrong ourselves and fixed by measuring** — collection-expression capacity (3.7),
  the extension-operator receiver and instance `operator +=` (3.8), and placeholder text shipping
  as expected output (3.10).

That last group is not an embarrassment to hide. Say it in the room: this material was checked by
running it, which is exactly why you can trust the rest.

Know these cold. They are where your credibility is won.

### 3.1 Runtime async is opt-in on RC 1 — not default

Almost every write-up says targeting `net11.0` is enough. It is not. Measured by reflection over
the test assembly's own types:

| Configuration | types implementing `IAsyncStateMachine` |
|---|---|
| `net10.0` | 4 |
| `net11.0`, default | **4** |
| `net11.0` + `<Features>$(Features);runtime-async=on</Features>` | **0** |

The Roslyn feature flag is the switch. Nothing else was required — no `EnablePreviewFeatures`, no
environment variable.

### 3.2 The "cleaner stack traces" demo does not work

**Do not attempt it.** We ran the same four-deep failing async chain on .NET 10, on default
.NET 11, and on .NET 11 with runtime async enabled. All three produced **byte-identical** stack
traces: four frames, real method names, no `MoveNext()`, no builder noise.

The reason is that the runtime has reconstructed async frames for years. The ugly
`<LoadAsync>d__4.MoveNext()` traces everyone remembers are **.NET Framework era**.

If you demo this expecting a difference you will be standing in front of two identical screens.
Instead, demo the state-machine count going to zero — that is real, and Lab 05 asserts on it.

The honest benefit is **allocation and throughput**, plus enabling the framework libraries
themselves to be compiled runtime-async. Not developer experience.

### 3.3 Union exhaustiveness is a *warning* by default

The feature is routinely sold as "add a case and every stale switch fails to compile." It does
not. Verified: a `union` switch and a `closed` switch each missing one arm compile with
**`2 Warning(s), 0 Error(s)`** — diagnostic `CS8509` — and the program runs happily until it
meets the unhandled case, then throws `SwitchExpressionException`.

One line makes the promise real:

```xml
<WarningsAsErrors>$(WarningsAsErrors);CS8509</WarningsAsErrors>
```

Verified: the same project then fails with `error CS8509`.

Ask the room who already runs `TreatWarningsAsErrors` — they get this for free. Everyone else
would have adopted unions, never set the flag, and concluded the feature does not do what it was
sold as doing.

### 3.4 PQC: the experimental boundary is per-*member*, not per-type

The usual summary — "ML-KEM and ML-DSA are stable, SLH-DSA is not" — is half the story, and the
missing half is the half that stops the build. Enumerated by reflection on .NET 10.0.12:

| Type | Type-level | Stable members | Experimental members |
|---|---|---|---|
| `MLKem` | stable | 12 | 14 |
| `MLDsa` | stable | 12 | 18 |
| `SlhDsa` | **experimental** | — | whole type |
| `CompositeMLDsa` | **experimental** | — | whole type |

The split inside `MLKem` and `MLDsa` is perfectly consistent:

- **Stable** — the cryptography itself, plus algorithm-specific raw key formats: `GenerateKey`,
  `SignData`, `VerifyData`, `Encapsulate`, `Decapsulate`, `ExportMLDsaPublicKey`, …
- **Experimental** — *every standard key-interchange format*: `ExportSubjectPublicKeyInfo`,
  `ImportSubjectPublicKeyInfo`, all `Pkcs8` variants, everything `…Pem`.

**The line to deliver:** you can do post-quantum crypto today, but you cannot yet persist or
interchange the keys without opting into an unstable API — and key storage and distribution is
exactly where a migration project integrates.

`SYSLIB5006` is emitted as an **error**, not a warning, so suppression must be deliberate.

### 3.5 Support windows: the arithmetic changed

This one was wrong in our own research digest and is wrong in a great deal of published material,
because it was true until September 2025. Verified against the
[.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
(last updated 8 September 2026) and the
[.NET Blog announcement](https://devblogs.microsoft.com/dotnet/dotnet-sts-releases-supported-for-24-months/):

**STS support went from 18 months to 24 months**, effective from .NET 9. STS now gets 12 months
past its successor — the same rule as LTS.

| Version | Type | End of support | Phase today |
|---|---|---|---|
| .NET 8 | LTS | **10 November 2026** | Maintenance |
| .NET 9 | STS | **10 November 2026** | Maintenance |
| .NET 10 | LTS | **14 November 2028** | Active |
| .NET 11 (expected) | STS | ~November 2028 | RC 1 — go-live to 13 Oct 2026 |

Three things follow, and all three change what you say in the room:

1. **.NET 9 is still supported.** It did not expire in May 2026. Do not tell anyone they are
   already unsupported.
2. **.NET 8 and .NET 9 end on the same day**, about eight weeks out. Whichever a team is on, the
   deadline is identical and imminent.
3. **.NET 10 LTS and .NET 11 STS end in the same week.** The reflex that "LTS is supported longer"
   no longer holds for this pair, which removes the usual reason to skip .NET 11 and reframes
   Day 2's closing decision entirely — see [section 2](#2-shape-of-the-two-days).

Expect pushback. Plenty of experienced people "know" STS is 18 months. `sources.html` links the
announcement; show it rather than arguing.

### 3.6 The OpenAPI version string is wrong everywhere, including when you pin it

OpenAPI was named as a top-interest topic in the customer survey, so this one is worth getting
exactly right. We registered three documents in one minimal API on
`Microsoft.AspNetCore.OpenApi` 11.0.0-rc.1 and read back what each actually served:

| Registration | Emitted `openapi` |
|---|---|
| `AddOpenApi("v1")` — default on .NET 11 | `3.2.0` |
| `o.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1` | `3.1.2` |
| `o.OpenApiVersion = OpenApiSpecVersion.OpenApi3_0` | `3.0.4` |

.NET 10's default, verified separately, is `3.1.1`.

The trap is the patch number. Nobody writes `3.1.1` in a blog post — they write "3.1" or "3.1.0".
So a contract test asserting `"3.1.0"` has been wrong since .NET 10 GA and nobody noticed. On
upgrade it fails, the team pins the version back to 3.1 to fix it, and **it still fails**, because
pinned 3.1 on .NET 11 is `3.1.2`. Lab 08 walks them into this deliberately.

The fix is to compare the `major.minor` prefix, or to stop asserting on it.

### 3.7 Collection expression capacity is exact — our own slide said otherwise

An early draft claimed `[with(capacity: 4), .. threeValues]` produced a capacity of `6`, and used
that as a "constructor arguments are advisory" humility moment. A lab agent flagged it. We
compiled it, and the agent was right:

| Expression (3 elements) | `Capacity` |
|---|---|
| `[with(capacity: 4), .. values]` | `4` |
| `[with(capacity: 8), .. values]` | `8` |
| `[.. values]` | `3` |

The argument is passed through precisely. The genuinely useful detail is the last row: the
no-argument form sizes the list to exactly the element count, so the next `Add` reallocates.
That is the real reason to reach for `with(capacity:)`.

### 3.8 Smaller verified details

- **ML-DSA-65 signatures are 3309 bytes** — roughly 13× an RSA-2048 signature. Good for a reaction
  when the conversation turns to payload size and token bloat.
- **`FullJoin` surfaces unmatched sides as `default(T)`**, not as a nullable projection. With
  `int` that means a real `0` is indistinguishable from "no match". Lab 07 makes attendees hit
  this deliberately.
- **`dotnet new sln` defaults to `.slnx` on the .NET 11 SDK.** Pass `--format sln` if you need the
  classic format, which the lab solutions do for IDE compatibility.
- **`dotnet new web` writes a `launchSettings.json` that overrides `ASPNETCORE_URLS`.** If you are
  demoing against a fixed port and the app appears not to respond, read the port from the startup
  log rather than assuming your environment variable won.
- **User-defined `+=` is an *instance* member.** The shape catches everyone, including us:
  `public void operator +=(Money right)`. No `static`, no left-hand parameter, returns `void`.
  Write the static form and you get **CS1020: Overloadable binary operator expected**, which does
  not hint at the real problem. The feature needs `LangVersion` 14.0 — under 13.0 you get CS9260.
- **Extension operators need an *unnamed* receiver.** `extension(Vec left)` wrapped around
  `static operator +(Vec left, Pt right)` fails with **CS9290** — the operator's parameters and the
  extension receiver share one scope. Use `extension(Vec)`. Our own slide had this wrong until we
  compiled it. A `ref` receiver (`extension(ref Vec target)`) gives you an in-place `+=` for a type
  you do not own; that combination does work.
- **MSBuild does not replay warnings on an incremental build.** Build Lab 01 twice and the second
  run reports 0 warnings, because the project was already up to date. Anyone spot-checking "did the
  trap get fixed?" needs `--no-incremental`. This bites during pre-flight, not during the lab.

### 3.9 Unions serialize without a classifier — but never deserialize

Directly on the customer's System.Text.Json interest, and the most likely of these to cost someone
a production incident.

With a plain `JsonSerializerOptions`, serializing a `union` **succeeds** and writes the case's own
shape with **no discriminator**. Deserializing the exact same string throws:

```text
JsonException: JSON value type 'Object' is ambiguous for union type 'CatalogItem'
because multiple case types can use this value type. Specify a custom type
classifier to support deserialization.
```

The write side is the one that looks healthy. A union persisted to a queue, a cache or a `jsonb`
column fails at the *consumer*, which may be a different service and a different deployment.

Fix — register on both sides, and note it needs `using System.Text.Json.Serialization;`:

```csharp
var options = new JsonSerializerOptions();
options.TypeClassifiers.Add(new JsonUnionTypeStructuralClassifier());
```

Three things worth saying out loud:

1. **The payload does not change.** The classifier infers the case from the object's shape, so JSON
   written with and without it is byte-identical. It is a read-side capability only.
2. **It refuses to guess.** Two structurally indistinguishable cases produce a
   `NotSupportedException` when the contract is built — on the *first serialize*, not on a later
   read: *"the case type 'Circle' can never be selected uniquely… 'Square' recognizes every property
   name recognized by 'Circle'"*. That is a good failure mode, and it is also the feature's real
   constraint: **structural classification requires your cases to differ in shape.**
3. **Primitive cases are fine.** `union Payload(int, Note)` round-trips, because the JSON value
   types already differ.

If two cases genuinely carry the same fields, structural classification cannot help — you need a
discriminator and a custom classifier. Expect that question; it is the first thing anyone modelling
`Success`/`Failure` payloads will hit.

### 3.10 `continue outer` skips the rest of the inner loop — our slide had placeholder output

The labeled-loops slide shipped with an expected-output block reading `labeled continue: none`,
which is not output at all — it was a placeholder nobody replaced. We compiled the snippet against
SDK `11.0.100-rc.1.26425.128` and captured what it actually prints:

```text
A
  processed a1
B
  processed b1
```

Customer `A` has three orders — `a1`, a fraudulent `a2`, and a perfectly good `a3`. `a3` never
gets processed, because `continue outer` abandons the **entire remaining inner loop** and advances
the outer one.

That is the correct meaning of the feature and the easiest thing to get wrong when reaching for it.
Ask the room what the output will be before you reveal it; a good proportion will expect `a3`. If
you only want to skip the bad order, an unlabelled `continue` is still the right tool. The reach
for a label is a claim about the *outer* loop, not the inner one.

`IDE0410` ("Use labeled jump statement") is the analyser rule that suggests this over bool-flag and
`goto` workarounds — verified against the rule page, and in the source registry under `day2-m2`.

---

## 4. Running the labs

Nine labs. Each has `start/` (with numbered `// TASK n:` comments), `solution/`, and a `README.md`.

| # | Day | Lab | Time |
|---|---|---|---|
| 01 | 1 | C# 14 — refactor a legacy type | 30 min |
| 02 | 1 | PQC & JSON hardening | 30 min |
| 03 | 1 | Minimal API & OpenAPI — **builds the app migrated on Day 2** | 40 min |
| 04 | 1 | EF Core 10 — **the model migrated on Day 2** | 30 min |
| 05 | 2 | Runtime async | 20 min |
| 06 | 2 | Unions & closed hierarchies | 40 min |
| 07 | 2 | .NET 11 libraries | 25 min |
| 08 | 2 | Migrate Lab 03 → .NET 11, and the OpenAPI break | 25 min |
| 09 | 2 | Migrate Lab 04 → EF Core 11 | 25 min |

**Labs 08 and 09 are upgrades of Labs 03 and 04.** Attendees who skipped or abandoned those on
Day 1 cannot start the Day 2 migration labs. Either make sure everyone lands Labs 03 and 04, or
tell people up front they can start Day 2 from the provided `solution/` folders. Say this at the
*end of Day 1*, not the start of Day 2.

Most labs use a zero-dependency `Check.cs` harness rather than a test framework, so they restore
instantly and work offline. A lab is finished when it prints `N passed, 0 failed` and exits 0.

`start` projects are built to compile and run as given — incomplete tasks show up as **failing
checks**, not as build errors. That is deliberate: an attendee always has a running program and a
specific list of what is not done yet. If a `start` project fails to *build*, something is wrong;
check the attendee's SDK first.

---

## 5. Questions you should expect

**"Should we go to .NET 11 at all?"**
Check the arithmetic before answering, because it changed. STS support went from 18 to **24
months** with .NET 9, so .NET 11 (Nov 2026) runs to **around November 2028** — and .NET 10 LTS
runs to **14 November 2028**. The same week. Taking .NET 11 costs essentially no support runway.

That means the decision is *not* about support duration, which is how most rooms will frame it.
It is about whether the upgrade work is worth doing twice: .NET 10 → 11 → 12, versus .NET 10 → 12.
Both paths converge on .NET 12 LTS in late 2027. Let the room reach that themselves; several will
still choose to wait, and that remains a legitimate outcome.

**"Is .NET 9 still supported?"**
Yes — until **10 November 2026**, in Maintenance phase. This surprises people, including anyone
who read the old 18-month figure and assumed it expired in May 2026. .NET 8 ends on the *same
day*. So whichever of the two a team is on, they have roughly **eight weeks** — check the room
early on Day 1, because for some attendees this is the most urgent thing they will hear all day.

**"What's in .NET 12?"**
No documentation and no previews exist. Expected November 2027, expected LTS. Anything more
specific is speculation — say so. The customer already agreed a separate 2027 session for this.

**"Can we use unions in our public API?"**
Be careful. C# 15 unions are new, the RC has known gaps versus the original proposal, and
serialization needs explicit configuration. Internal domain modelling first; public contracts
later.

**"Why doesn't `dotnet new` offer net10.0?"**
Because they are on the .NET 11 SDK. See [Setup](#1-setup). This comes up on Day 2 constantly.

---

## 6. Sources and reuse

`site\sources.html` lists every community source with its verification status, the build it was
written against, and the reuse tier that governs how much of it may appear in the material.

The operating principle is **first-party first**: Microsoft Learn, the .NET Blog, the language
design notes and the runtime repositories are the only sources used for factual claims. Community
material explains and pressure-tests those facts; it is never the origin of them.

**Preview drift is the main hazard on Day 2.** Much of what has been written about .NET 11 dates
from Previews 1–5, and both union syntax and the memory-safety rules changed before RC 1. If an
attendee cites a blog post that contradicts the slides, check its date before conceding — as
[section 3](#3-corrections-we-found-by-testing) shows, the slides are the ones that were compiled.

To add a source the customer sends you:

```powershell
pwsh -NoProfile -File tools/add-source.ps1 -Url '<url>' -Modules day1-m5 -Summary '<why it is worth reading>'
pwsh -NoProfile -File tools/validate-sources.ps1
pwsh -NoProfile -File tools/build-sources.ps1
```

`build-sources.ps1` refuses to emit anything if validation fails, so a broken registry cannot
silently reach the deck.

