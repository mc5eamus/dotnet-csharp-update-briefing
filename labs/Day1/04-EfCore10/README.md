# Lab 04 - EF Core 10

## Goal
Use EF Core 10 with SQLite to exercise complex types, named query filters, and the readable statement-lambda form of `ExecuteUpdateAsync`. This project is migrated to EF Core 11 in Lab 09 tomorrow.

## Estimated time
30 minutes.

## Prerequisites
.NET SDK 10.0.300 or later. The lab uses `Microsoft.EntityFrameworkCore.Sqlite` version `10.*` and a local tool manifest for `dotnet-ef`.

## How to run

```powershell
cd start
dotnet run
```

The database file is created under `bin\Debug\net10.0` and deleted on each run. Some start checks fail until you complete the tasks.

## Tasks
1. Map `Order.ShippingAddress` as an `Address` complex type and prove that the city round-trips from SQLite.
2. Configure two named filters, `TenantFilter` and `ArchivedFilter`, then disable only `ArchivedFilter` in one query.
3. Replace the no-op update with `ExecuteUpdateAsync` using the regular statement-lambda form.

## Hints
- The pinned EF tool is local to this lab. Use `dotnet tool restore`, then `dotnet tool run dotnet-ef -- --help` if you need it.
- `ComplexProperty` works with the `readonly record struct Address` used here.
- `IgnoreQueryFilters(["ArchivedFilter"])` disables one named filter and leaves the tenant filter active.

## What good looks like
The solution ends with:

```text
  5 passed, 0 failed
  All checks passed.
```

See `solution/` for the completed version.
