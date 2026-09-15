# Lab 05 - Runtime-native async

## Goal
See the stack trace shape produced by runtime-native async in .NET 11, then run the same code on .NET 10 for a real comparison.

Estimated time: 20 minutes.

## Prerequisites
Use the .NET 11 SDK from the user-local install. The system `dotnet` on `PATH` is not enough for these labs.

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
& $dotnet --version   # 11.0.100-rc.1.26425.128
```

You can also invoke `tools\dotnet11.ps1` from the repository root; it resolves the same SDK.

## How to run

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
cd labs/Day2/05-RuntimeAsync/start
& $dotnet run

cd labs/Day2/05-RuntimeAsync/solution
& $dotnet run

cd labs/Day2/05-RuntimeAsync/net10-compare
& $dotnet run
```

`net10-compare` is handwritten because the .NET 11 SDK can build `net10.0` but cannot scaffold it.

## Tasks
1. In `AsyncDemo.cs`, keep `ReceiveRequestAsync` genuinely asynchronous with `Task.Yield()`.
2. Preserve source-shaped method names through a chain deeper than a single await.
3. Mix `Task.Yield()` with real awaits such as `Task.Delay(1)`.
4. Throw from `PersistAsync` and let the exception propagate naturally to the top-level catcher.

## Hints
- Do not assert exact frame counts; runtime and compiler builds can change those.
- Look for method names that match the source: `PersistAsync`, `WriteAuditRecordAsync`, `CalculateTotalsAsync`, `LoadOrderAsync`, `ReceiveRequestAsync`.
- The start project fails checks until `PersistAsync` throws.

## What good looks like
The solution ends with:

```text
  5 passed, 0 failed
  All checks passed.
```

## Observed .NET 11 stack trace

```text
System.InvalidOperationException: Could not persist audit record for SO-1107.
   at Lab05.AsyncDemo.PersistAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 49
   at Lab05.AsyncDemo.WriteAuditRecordAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 43
   at Lab05.AsyncDemo.CalculateTotalsAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 36
   at Lab05.AsyncDemo.LoadOrderAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 29
   at Lab05.AsyncDemo.ReceiveRequestAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 22
   at Lab05.AsyncDemo.CaptureStackTraceAsync() in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 9
```

## Observed .NET 10 stack trace

```text
System.InvalidOperationException: Could not persist audit record for SO-1107.
   at Lab05.AsyncDemo.PersistAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 49
   at Lab05.AsyncDemo.WriteAuditRecordAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 43
   at Lab05.AsyncDemo.CalculateTotalsAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 36
   at Lab05.AsyncDemo.LoadOrderAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 29
   at Lab05.AsyncDemo.ReceiveRequestAsync(String orderId) in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 22
   at Lab05.AsyncDemo.CaptureStackTraceAsync() in ...\Day2\05-RuntimeAsync\solution\AsyncDemo.cs:line 9
```

On this RC 1 machine the simple exception trace is already source-shaped on both runtimes: no `MoveNext()` or `AsyncMethodBuilder` frames appeared in either run. The comparison project is still useful because it proves the local result instead of relying on slides.

## Solution
See `solution\`.
