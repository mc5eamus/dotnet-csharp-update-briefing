# Lab 07 - .NET 11 libraries

## Goal
Exercise small but important .NET 11 library additions: System.Text.Json support for C# unions, LINQ `FullJoin`, and `JsonNamingPolicy.PascalCase`.

Estimated time: 25 minutes.

## Prerequisites
Use the .NET 11 SDK from the user-local install. The lab uses only the shared framework; there are no NuGet packages.

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
& $dotnet --version   # 11.0.100-rc.1.26425.128
```

## How to run

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
cd labs/Day2/07-Libraries11/start
& $dotnet run

cd labs/Day2/07-Libraries11/solution
& $dotnet run
```

## Tasks
1. In `UnionJsonDemo.cs`, add `JsonUnionTypeStructuralClassifier` to `JsonSerializerOptions.TypeClassifiers` and round-trip a C# 15 union.
2. In `FullJoinDemo.cs`, prove unmatched `int` rows surface as `default(int)`, then project both sides to `int?` so missing rows become visible.
3. In `NamingPolicyDemo.cs`, use `JsonNamingPolicy.PascalCase` and keep the per-member `JsonPropertyName` override.

## Read the output before you start

The second section of the program is a demonstration, not a task, and it passes from the
beginning. It exists because this is the part that will actually cost you an incident:

- A union **serializes** with default options. It succeeds, and writes the active case's own
  shape with **no discriminator of any kind**.
- The **same string** will not deserialize without a classifier.

So the write side never warns you. A union pushed into a queue, a cache or a `jsonb` column looks
completely healthy until something tries to read it -- possibly a different service, possibly weeks
later. Register the classifier on both sides.

The third check shows the feature''s real limit. The classifier infers the case from the object''s
*shape*, so two cases carrying the same fields cannot be told apart. It does not guess: it throws
`NotSupportedException` when the contract is built, which is on the **first serialize**. If your
cases genuinely share a shape, you need a discriminator and a custom classifier.

## Hints
- In RC 1, serializing a union uses the active case shape. Deserializing object-shaped union cases needs a classifier; without it the runtime throws a `JsonException` saying the object value is ambiguous.
- The structural classifier can choose between `CatalogBook` and `CatalogMagazine` because one has `Isbn` and the other has `Issn`.
- `FullJoin` does not pass nullable values for unmatched value-type rows. `0/4` means the left side was missing, but the projection alone cannot distinguish that from a real zero.

## What good looks like
The solution prints:

```text
    {"Isbn":"978-0135957059","Title":"CLR via C#"}
    Serialized with DEFAULT options: {"Isbn":"978-0135957059","Title":"CLR via C#"}
    Reading it back:  JSON value type 'Object' is ambiguous for union type 'Lab07.CatalogItem' ...
    Same-shape cases: The JsonUnionTypeStructuralClassifier cannot classify 'Lab07.Shape' ...
    Raw:      1/0, 2/0, 3/3, 0/4
    Ambiguous: 0/0, 1/0, 0/2
    Nullable: 1/<none>, 2/<none>, 3/3, <none>/4
    {"FirstName":"Ada","surname":"Lovelace"}
```

and ends with:

```text
  9 passed, 0 failed
  All checks passed.
```

## RC 1 notes
`System.Text.Json.Serialization.JsonUnionTypeStructuralClassifier` exists and works when added to `JsonSerializerOptions.TypeClassifiers`. It is not automatic for object-shaped union cases in this lab; omitting it produced:

```text
JsonException: JSON value type 'Object' is ambiguous for union type 'Lab07.CatalogItem' because multiple case types can use this value type. Specify a custom type classifier to support deserialization.
```

## Solution
See `solution\`.
