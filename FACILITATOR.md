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

npm install --prefix tools                        # once per clone (jsdom, page tests)

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

To keep the deck permanently to hand, run `tools\publish-local.ps1` once. It installs the
single-file pages to `%LOCALAPPDATA%\dotnet-csharp-update-briefing\` and adds a
**.NET 10-11 Workshop** Start Menu entry, so you can open it on the morning of the workshop
without the repo, a build or a network. It is a snapshot — re-run it if you edit a slide.
For a machine that has never seen the repo, take `workshop-deck.zip` from the repository's
releases page, unzip it anywhere and open `index.html`.

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

Day 1 is **6 modules / 88 slides** (84 content + 4 lab markers): **4 hours of content** plus 2 h 10
of labs. Every module below was timed against its actual slide count, not estimated. Full timings
are on `index.html`.

Day 1 module budget:

| Module | Slides | Minutes |
|---|---|---|
| 1 · Platform, runtime & tooling | 13 | 40 |
| 2 · C# 14 | 19 | 53 |
| 3 · .NET 10 libraries | 16 | 45 |
| 4 · ASP.NET Core 10 | 17 | 50 |
| 5 · EF Core 10 | 16 | 45 |
| 6 · Wrap-up | 3 | 10 |
| **Total** | **84** | **243 ≈ 4 h 03** |

That is roughly **three minutes per slide**, which is the pace the material is written for. If you
are running faster than that you are reading the slides out rather than working them.

**If Day 1 runs late**, cut in this order:

1. Lab 02 — becomes a demo; the PQC measurements are on the slides anyway.
2. The breadth slides at the end of module 3, not the PQC or `Strict` ones.
3. Module 1's measuring-it-yourself slide, if the room is not performance-minded.

Do **not** cut the span overload-resolution slides (3.11), the `net8.0` `LangVersion` demo (3.16),
the `field` shadowing slide (3.12), or
the OpenAPI before/after diff. Those are the ones attendees cannot get from the release notes, and
they are the reason the day is worth attending.

**Day 2 currently runs about two hours of content, not four.** Its 37 slides have not yet had the
expansion Day 1 received, so at Day 1's measured pace the module budget is roughly:

| Module | Slides | Realistic |
|---|---:|---:|
| 1 · .NET 11 runtime | 6 | 20 min |
| 2 · C# 15 | 9 | 25 min |
| 3 · Libraries | 6 | 20 min |
| 4 · ASP.NET Core 11 | 6 | 20 min |
| 5 · EF Core 11 | 6 | 20 min |
| 6 · .NET 12 outlook & the decision | 4 | 15 min |
| **Total** | **37** | **120 min** |

With 2 h 15 of labs that is a little over four hours — a short day. Plan to either finish early,
expand the day the way Day 1 was expanded, or run the C# 15 and EF Core modules as longer
discussion sessions. Do not promise a full day from the current slide count.

If you are nonetheless running late on Day 2, the safe cuts are, in order:

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

Every code sample here was compiled and run on the machine that built this workshop. Sixteen
findings came out of that, and they fall into four groups:

- **Widely-repeated claims that are wrong** — runtime async being on by default (3.1), the cleaner
  stack traces demo (3.2), the OpenAPI version string (3.6), and the panic about `Reverse()`
  silently becoming a span call, which is unfounded on `net10.0` and entirely real on `net8.0`
  (3.11, 3.16).
- **Things the docs state correctly but nobody reads carefully** — `CS8509` being only a warning
  (3.3), the per-member PQC experimental boundary (3.4), the support arithmetic (3.5), unions
  serializing happily while never deserializing (3.9), `CS9258` also being only a warning (3.12),
  and exactly what `JsonSerializerDefaults.Strict` does and does not change (3.13).
- **Silent behaviour changes that produce no diagnostic at all** — overload resolution moving to
  spans, which can turn a thrown exception into a silent no-op (3.11), an array reversing itself in
  place on `net8.0` with zero warnings (3.16), enums disappearing from OpenAPI documents (3.14), and
  an allocation optimisation that comes and goes between runs of the same binary (3.15).
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

`SYSLIB5006` is emitted as an **error**, not a warning, so suppression must be deliberate. Compiled
with no suppression at all, this is what a team adding an ML-KEM key exchange actually sees:

```text
error SYSLIB5006: 'MLKem.ExportSubjectPublicKeyInfo()' is for evaluation purposes only...
error SYSLIB5006: 'MLKem.ImportSubjectPublicKeyInfo(byte[])' is for evaluation purposes only...
  0 Warning(s)
  2 Error(s)
```

`GenerateKey`, `Encapsulate`, `Decapsulate`, `ExportEncapsulationKey`, `SignData` and `VerifyData`
all built clean in that same project. It is a broken build, not a squiggle.

**The reframing that makes this land.** The algorithms are finished — FIPS 203, 204 and 205 are
published standards. What is still moving is how .NET **encodes keys on the wire and on disk**;
`CompositeMLDsa`'s format changed *after RC 2*. So the honest design-review answer is not "wait,
it's experimental", it is: **use it, but do not persist .NET-encoded PQC keys yet.** Those are very
different pieces of advice, and only one of them is actionable.

Tell people to scope `#pragma warning disable SYSLIB5006` to the serialisation lines. A
project-wide `<NoWarn>` hides exactly the call sites they will need to find again at the next major
upgrade.

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

### 3.11 Upgrading to C# 14 can turn "throws" into "silently does nothing"

This is the most dangerous finding in the workshop, and it produces no diagnostic at all.

C# 14 makes spans first-class in overload resolution. Given a type that offers both
`IEnumerable<T>` and `ReadOnlySpan<T>` overloads, passing an array changes which one you call:

| Language version | `M(someArray)` binds to |
|---|---|
| 13.0 | `M(IEnumerable<int>)` |
| 14.0 | `M(ReadOnlySpan<int>)` |

No warning. No error. Verified for both direct calls and extension-method calls.

Now pass `null`:

| Language version | What the callee sees |
|---|---|
| 13.0 | `IEnumerable<int>` parameter is `null`, so the `ArgumentNullException` guard fires |
| 14.0 | `ReadOnlySpan<int>` with `Length 0`, `IsEmpty True` — the guard never fires |

A null array used to throw. After the upgrade it is an empty span, and the method quietly does
nothing. If that method was "delete the records I give you" the failure mode is loud; if it was
"validate these", it is silent and wrong.

**Two reassurances, also measured**, because the internet is confidently wrong about both:

- `int[].Reverse()` does **not** silently switch to a span overload **on `net10.0`**. It still binds
  to `Enumerable.Reverse` and still returns a lazy `ReverseIterator`; the array is not mutated in
  place. The widely repeated fear is unfounded *in the configuration almost everyone will be in*.
- An exact `T[]` overload still beats `ReadOnlySpan<T>` under **both** language versions. Only the
  `IEnumerable<T>` case moves.

So the search you actually want, before upgrading, is for API pairs that offer `IEnumerable<T>`
*and* `ReadOnlySpan<T>` — not for every call to a span-capable method.

**But read the first reassurance's qualifier again — it is load-bearing.** See 3.16.

### 3.12 The `field` keyword can shadow a real member — and it is only a warning

If a type already has a member literally named `field`, C# 14's new contextual keyword wins inside
property bodies. The same source produces different values:

```text
LangVersion 13.0 ->  100, 100, then 7, 7
LangVersion 14.0 ->    0,   0, then 7, 0
```

The compiler does tell you, with `CS9258`:

> In language version 14.0, the 'field' keyword binds to a synthesized backing field for the
> property. To avoid generating a synthesized backing field, and to refer to the existing member,
> use 'this.field' or '@field' instead.

`CS9258` is a **warning**. A build with `TreatWarningsAsErrors` off will ship this, and the symptom
is reads returning `0` instead of the stored value — a data-corruption-class bug from a
warning-level diagnostic.

Writing `@field` or `this.field` restores the C# 13 behaviour exactly and clears the warning
(verified). `Day1.sln` in this workshop deliberately carries two `CS9258` warnings so you can show
a real build emitting them.

### 3.13 `JsonSerializerDefaults.Strict` changes exactly four things

Useful because "strict" invites speculation about what else it might tighten. Measured by diffing
the two options objects:

| Property | `General` | `Strict` |
|---|---|---|
| `AllowDuplicateProperties` | `True` | `False` |
| `RespectNullableAnnotations` | `False` | `True` |
| `RespectRequiredConstructorParameters` | `False` | `True` |
| `UnmappedMemberHandling` | `Skip` | `Disallow` |

Nothing else differs.

The first row is the one to demo. Deserialising `{"A":1,"A":2}` with the default options **silently
succeeds with `A = 2`** — last one wins, no error, no warning. Under `Strict`:

```text
JsonException: Duplicate property 'A' encountered during deserialization of type 'Item'.
```

Duplicate keys are a real request-smuggling and policy-bypass vector, so this is a security slide
as much as a serialisation one. Note that both `JsonSerializerOptions.Strict` (a ready-made static
instance) and `JsonSerializerDefaults.Strict` (the enum member you pass to the constructor) exist.

### 3.14 Your enums are invisible in the OpenAPI document by default

With no converter configured, an enum parameter or property emits as exactly this — in **both**
OpenAPI 3.0 and 3.1:

```json
{ "type": "integer" }
```

No names, no values, no `enum` array. Every generated client gets a bare integer and loses the
type entirely. Adding a `JsonStringEnumConverter` through `ConfigureHttpJsonOptions` changes it to:

```json
{ "enum": ["Low", "High"] }
```

This is not a .NET 10 regression — it is long-standing behaviour that the move to 3.1 does not fix,
which is precisely why it is worth saying out loud while everyone is looking at their documents.

### 3.15 Stack allocation of small arrays is real, and not deterministic

.NET 10's JIT can prove a small array never escapes its method and skip the heap allocation. The
same source, run on three runtimes, measuring `GC.GetAllocatedBytesForCurrentThread()` over two
million calls:

| Runtime | non-escaping `int[4]` | array returned (escapes) |
|---|---|---|
| 8.0.31 | 40.00 bytes/call | 40.00 bytes/call |
| 9.0.20 | 40.00 bytes/call | 40.00 bytes/call |
| 10.0.12 | **0.00 bytes/call** | 40.00 bytes/call |

Then the same binary, three consecutive runs, nothing changed:

```text
run 1   0.00 bytes/call
run 2  40.00 bytes/call
run 3   0.00 bytes/call
```

Whether the optimisation applies depends on tiered compilation having promoted the method to
optimised code before the measured loop runs. Nothing in the source decides it.

Present both halves. The win is real and worth having; the non-determinism is what stops someone
going home, writing a micro-benchmark, seeing 40 bytes and concluding the workshop was wrong.

> **Run it in the room.** The harness ships in [`verify/EscapeAnalysis`](verify/README.md):
> `cd verify/EscapeAnalysis; ./run.ps1 -Repeat 3`. It builds one source file against all three
> runtimes and prints the table above live. Doing this on the projector is worth more than the
> slide, and it re-validates the claim against whatever SDK you are standing on — which is the
> whole argument of section 3.

### 3.16 `LangVersion 14` on `net8.0` compiles, and silently reverses your arrays

Someone always asks whether they can have C# 14 without retargeting. Target framework and language
version *are* separate dials, and every C# 14 feature tested — extension members, `field`,
null-conditional assignment, unbound `nameof` — compiles and runs on `net8.0` with
`<LangVersion>14.0</LangVersion>`, with zero errors and zero warnings.

Then this happens. Same source, same TFM, same SDK; only the dial moved:

```text
int[] nums = [3, 1, 2];
nums.Reverse();          // bare statement, result discarded

net8.0 + LangVersion 13.0  ->  [3,1,2]
net8.0 + LangVersion 14.0  ->  [2,1,3]

  0 Warning(s)
  0 Error(s)
```

Under C# 13 that is lazy `Enumerable.Reverse` with the result thrown away — a no-op. Under C# 14 the
array converts to `Span<int>` and binds to `MemoryExtensions.Reverse`, which **mutates in place and
returns `void`**. No diagnostic of any kind.

**Why `net10.0` escapes it.** The compensating overloads that keep array receivers on the LINQ
operators shipped in the **.NET 10 BCL**. New compiler + old BCL is precisely the unguarded
combination. C# 14 is not dangerous; C# 14 *without .NET 10* is.

Assigning the result is the lucky case — `var x = nums.Reverse();` fails with
`error CS0815: Cannot assign void to an implicitly-typed variable`, which at least stops the build.
It is the discarded-result statement that goes through silently.

**The answer to give:** retarget to `net10.0` to get C# 14. Microsoft's *Configure the language
version* page states that a language version newer than the TFM default is unsupported and is not
an upgrade path, so this is not even a trade-off. If a library must stay on `net8.0`, pin
`<LangVersion>13.0</LangVersion>` explicitly instead of relying on the default.

This is the best two-build demo in the workshop, and it takes ninety seconds. Run it live.

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

**"Can't we just run Upgrade Assistant?"**
No — `dotnet-upgrade-assistant` is **officially deprecated**. Microsoft Learn carries the notice
on the tool's own overview page and redirects to the **GitHub Copilot upgrade** agent.

Expect resistance, for a good reason: the tool was the standard answer for years, it is still
installable, and nothing in the tooling itself tells you it has been retired. Practically every
blog post about .NET upgrades recommends it. Show the Learn page rather than asserting it — the
notice is right at the top, and the source is registered as
`learn-core-porting-upgrade-assistant-overview` precisely so you can pull it up offline.

One detail worth having ready, because it changes who in the room is affected: the deprecation
notice describes the replacement as a Visual Studio feature, but the agent's **own** documentation
is more recent (updated 2026-08-04 versus 2026-03-23) and lists Visual Studio, VS Code, the GitHub
Copilot CLI and GitHub.com. If someone objects that their team is not on Visual Studio, the
broader page is the accurate one. Two first-party pages, different scope, and the one people land
on first is the staler of the two.

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

