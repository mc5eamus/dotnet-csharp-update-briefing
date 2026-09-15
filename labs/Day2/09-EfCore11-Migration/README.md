# Lab 09 - EF Core 11 migration

## Goal
Migrate the completed Day 1 EF Core lab from `net10.0` / EF Core 10 to `net11.0` / EF Core 11 RC 1, apply the schema to SQLite with migrations, and verify the model still behaves.

Estimated time: 30 minutes.

## Prerequisites
You need both the .NET 10 SDK and the .NET 11 SDK available. Use the user-local .NET 11 SDK because the system `dotnet` on this machine does not include .NET 11.

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
& $dotnet --version   # 11.0.100-rc.1.26425.128
```

The lab has a local tool manifest for `dotnet-ef` RC 1:

```powershell
cd labs/Day2/09-EfCore11-Migration
& $dotnet tool restore
```

## How to run

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
cd labs/Day2/09-EfCore11-Migration/start
& $dotnet run

cd labs/Day2/09-EfCore11-Migration/solution
& $dotnet run
```

Verify from the lab root:

```powershell
.\verify.ps1 -Project start
.\verify.ps1 -Project solution
```

## Tasks
1. Retarget to `net11.0` and upgrade EF Core package references to versions that actually restore from the configured feeds.
2. Apply the schema to a real SQLite database and confirm the migrated model still round-trips data.
3. Exercise EF Core 11 RC 1 changes that can be verified here: an index on a scalar complex-type member and `MaxByAsync` translation.
4. Keep the result machine-checked with the `Check` harness.

## Actual observed output

Package and tool resolution on this machine:

```text
Microsoft.EntityFrameworkCore.Sqlite  10.*                   -> 10.0.12
Microsoft.EntityFrameworkCore.Sqlite  11.0.0-rc.1.26425.128  -> 11.0.0-rc.1.26425.128
Microsoft.EntityFrameworkCore.Design  11.0.0-rc.1.26425.128  -> 11.0.0-rc.1.26425.128
dotnet-ef                            11.0.0-rc.1.26425.128
```

Migration application used a real SQLite database:

```text
Build started...
Build succeeded.
Acquiring an exclusive lock for migration application. See https://aka.ms/efcore-docs-migrations-lock for more information if this takes too long.
Applying migration '20260914130350_InitialCreate'.
Done.
```

Solution run:

```text
Lab 09 - EF Core 11 migration
====================================================

Migrated model (TASK 2)
  PASS  Shipping address still round-trips after migration
  PASS  The migration created the Orders table

Named filters still behave (TASK 2)
  PASS  Default filters show one live workshop order
  PASS  Disabling only the archive filter keeps the tenant filter

EF Core 11 checks (TASK 3)
  PASS  Complex scalar property index was created
  PASS  MaxByAsync translated through the filtered DbSet

ExecuteUpdateAsync still behaves (TASK 4)
  PASS  One pending visible order was updated
  PASS  The pending order is now ready

----------------------------------------------------
  8 passed, 0 failed
  All checks passed.
```

## Hints
- Do not set `<LangVersion>`; C# 15 is the default for `net11.0`.
- `Version="11.*"` did not restore RC packages. Use `11.0.0-rc.1.26425.128` until GA packages are available; at GA, attendees should expect stable `11.0.x` packages instead.
- Lab 04 did not contain migrations. This migration lab adds `InitialCreate` and applies it with `Database.MigrateAsync()` and `dotnet ef database update`.
- The EF design package is included only because `dotnet ef migrations add` requires it; it is marked `PrivateAssets="all"`.

## Solution
See `solution\`.