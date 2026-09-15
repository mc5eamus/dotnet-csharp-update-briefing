# `verify/` — the measurements, as runnable code

Every slide in this workshop marked **"Verified by measurement"** corresponds to something we
actually ran, rather than something we read. This folder ships the harnesses for the claims
that are worth re-running, so the material can be re-validated against a future SDK instead of
quietly rotting.

If you are delivering the workshop: run these before the session. If a number has moved, the
slide is wrong and you now know it before the room does.

---

## Why this folder exists

The single most useful thing this workshop does is show attendees where the documentation,
the community and their own intuition disagree with the compiler. Section 3 of
[`FACILITATOR.md`](../FACILITATOR.md#3-corrections-we-found-by-testing) lists fifteen such
findings. Shipping prose about a measurement is weak; shipping the measurement is not.

It also keeps us honest. A claim that cannot be re-run is a claim nobody will ever check.

---

## EscapeAnalysis

The benchmark behind the stack-allocation slides in **Day 1, module 1** — and the strongest
result in the workshop.

```powershell
cd verify/EscapeAnalysis
./run.ps1 -Repeat 3
```

**What it does.** A `[MethodImpl(NoInlining)]` method allocates a local `int[4]`, fills it, sums
it and returns an `int` — the array never leaves the method. A sibling method returns the array
instead. It measures `GC.GetAllocatedBytesForCurrentThread()` across 2,000,000 calls after
800,000 warm-up calls, on **.NET 8, 9 and 10 from one source file**.

**What we measured** (Windows, Release, 10.0.12):

| Runtime | Non-escaping `int[4]` | Array returned |
|---|---|---|
| 8.0.31 | 40.00 bytes/call | 40.00 |
| 9.0.20 | 40.00 bytes/call | 40.00 |
| **10.0.12** | **0.00 bytes/call** | 40.00 |

40 bytes is object header + method table + length + four ints, padded. Zero means the JIT proved
the array could not escape and put it on the stack.

**The half that matters more.** It is *not deterministic*. A two-method variant of the same
program, same binary, produced `0 / 40 / 0` across three consecutive runs — the result depends on
whether tiered compilation promoted the method before the measured loop began. The three-method
version in this folder has been stable at `0` across every run so far, which is exactly why you
should run it with `-Repeat 3` rather than trusting a single result.

Present both halves. "Your allocations may disappear" is a feature announcement; "your
allocations may disappear, and you cannot depend on it, so measure your own code" is engineering
advice. The second one is why the room is there.

**The control row is the point of the design.** `returned (escapes)` must stay at 40 bytes/call on
every runtime. If it ever reports 0, the measurement is broken and nothing else on screen means
anything.

### Options

| Flag | Effect |
|---|---|
| `-Repeat <n>` | Run the whole matrix `n` times — use this to expose the non-determinism |
| `-Frameworks net10.0` | Run a subset; missing runtimes are skipped with a warning, not an error |

Requires the .NET 8, 9 and 10 runtimes. `dotnet --list-runtimes` tells you what you have; the
script checks for you and degrades gracefully rather than failing.

---

## Notes on method

- **Release only.** `Optimize` is pinned in the `.csproj`. The JIT does not do this analysis in
  Debug, so a Debug run measures nothing and looks like a disproof.
- **Warm up, then sleep.** Tiered compilation needs both the call count and the wall-clock time
  before it promotes a method to the optimising tier.
- **`NoInlining` is deliberate.** Without it the allocation vanishes for a much less interesting
  reason — inlining — and the comparison across runtimes stops being meaningful.
- **Allocation, not time.** Byte counts are stable and reproducible on a laptop with a browser
  open. Wall-clock timings are not, and a benchmark that disagrees with itself in front of a
  customer is worse than no benchmark.
