# Lab 06 - C# 15 unions and closed hierarchies

## Goal
Model results with C# 15 unions, model related states with a closed hierarchy, and use compiler exhaustiveness checks as the design feedback.

Estimated time: 40 minutes.

## Prerequisites
Use the .NET 11 SDK from the user-local install. C# 15 is the default for `net11.0`; this lab intentionally does not set `<LangVersion>`.

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
& $dotnet --version   # 11.0.100-rc.1.26425.128
```

## How to run

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
cd labs/Day2/06-CSharp15-Unions/start
& $dotnet run

cd labs/Day2/06-CSharp15-Unions/solution
& $dotnet run
```

## Tasks
1. In `DomainResults.cs`, switch over every `SaveResult` union case with no default arm.
2. In `ReviewStates.cs`, use a closed hierarchy for related states that share `Code` and `Label`.
3. Use the shared state members in switch arms instead of duplicating display literals.
4. Rename `Step4_AddACase.cs.txt` to `.cs`, add the new case to `SaveResult`, and observe CS8509 as a build error until every switch handles it.
5. Rename `Step5_NonTransitiveWarning.cs.txt` to `.cs` and observe that `closed` is not transitive.
6. In `ModernSyntax.cs`, pass constructor arguments inside collection expressions.
7. Add and use an extension indexer for `ReadingWindow`.

## Hints
- The project sets `<WarningsAsErrors>CS8509</WarningsAsErrors>` so exhaustiveness warnings become the intended lab-breaking compiler errors.
- Do not add default arms. A default arm hides the useful compiler signal.
- `closed` is local to the type that declares it. If an intermediate descendant is not `closed`, the compiler must treat that intermediate as a possible runtime value.
- In this RC 1 run, `[with(capacity: 4), .. values]` produced a list with capacity 4. Assert only that the configured capacity was respected, not an exact growth value.

## What good looks like
The solution ends with:

```text
  15 passed, 0 failed
  All checks passed.
```

The add-a-case exercise produces CS8509 when incomplete. Without `WarningsAsErrors`, RC 1 reports it as a warning; this lab promotes that warning to an error so the project stops compiling as the exercise requires.

The non-transitivity probe produced:

```text
CS8509: The switch expression does not handle all possible values of its input type (it is not exhaustive). For example, the pattern 'NonTransitiveMiddle' is not covered.
```

Marking the intermediate descendant `closed` removed the warning. Leaving it open requires a `NonTransitiveMiddle` arm, which also covers derived values.

## Solution
See `solution\`.
