# Lab 08 - ASP.NET Core 11 migration

## Goal
Migrate the completed Day 1 Minimal API lab from `net10.0` to `net11.0` and catch the OpenAPI contract change: the default document version moves from OpenAPI `3.1.1` to `3.2.0` on this RC 1 SDK.

Estimated time: 30 minutes.

## Prerequisites
You need both the .NET 10 SDK and the .NET 11 SDK available. Use the user-local .NET 11 SDK because the system `dotnet` on this machine does not include .NET 11.

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
& $dotnet --version   # 11.0.100-rc.1.26425.128
```

That SDK root can also build and run the copied `net10.0` start project. From the repository root, `tools\dotnet11.ps1` resolves the same executable.

## How to run

```powershell
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
cd labs/Day2/08-AspNet11-Migration/start
& $dotnet run --no-launch-profile -- --urls http://127.0.0.1:5108

cd labs/Day2/08-AspNet11-Migration/solution
& $dotnet run --no-launch-profile -- --urls http://127.0.0.1:5109
```

Verify from the lab root:

```powershell
.\verify.ps1 -Project start
.\verify.ps1 -Project solution
```

## Tasks
1. Retarget the copied Day 1 solution from `net10.0` to `net11.0`, then restore with the user-local SDK.
2. Generate the OpenAPI document before and after retargeting. Compare the real documents in `openapi-net10.json` and `openapi-net11.json`.
3. If downstream tooling is not ready for OpenAPI 3.2, pin a compatibility document with `builder.Services.AddOpenApi("v1-compat", options => options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1);`.
4. Confirm `GET /catalogue/events` still streams server-sent events, and describe it as `text/event-stream` in the OpenAPI document.
5. Run `verify.ps1` so the OpenAPI version strings and SSE endpoint are machine-checked.

## Actual observed output

Package resolution on this machine:

```text
Microsoft.AspNetCore.OpenApi     10.*                        -> 10.0.12
Microsoft.Extensions.Validation  10.*                        -> 10.0.12
Microsoft.AspNetCore.OpenApi     11.0.0-rc.1.26425.128       -> 11.0.0-rc.1.26425.128
Microsoft.Extensions.Validation  11.0.0-rc.1.26425.128       -> 11.0.0-rc.1.26425.128
```

OpenAPI and SSE probes:

```text
start openapi: 3.1.1
solution openapi: 3.2.0
pinned compatibility document: 3.1.2
start SSE response content metadata: <none>
solution SSE response content metadata: text/event-stream
```

Live SSE output was unchanged:

```text
event: catalogue
data: {"message":"catalogue heartbeat","index":1}

event: catalogue
data: {"message":"catalogue heartbeat","index":2}

event: catalogue
data: {"message":"catalogue heartbeat","index":3}
```

Meaningful diff:

```diff
- "openapi": "3.1.1"
+ "openapi": "3.2.0"

  "/catalogue/events": {
    "get": {
      "responses": {
        "200": {
-         "description": "A short text/event-stream response."
+         "description": "A short text/event-stream response.",
+         "content": {
+           "text/event-stream": {
+             "itemSchema": {
+               "required": [ "data" ],
+               "type": "object",
+               "properties": {
+                 "data": { "type": "string" },
+                 "event": { "type": "string" },
+                 "id": { "type": "string" }
+               }
+             }
+           }
+         }
        }
      }
    }
  }
```

## Hints
- Do not set `<LangVersion>`; C# 15 is the default for `net11.0`.
- `Version="11.*"` did not restore RC packages. Use the exact RC version until GA packages are available.
- Pinning `OpenApiSpecVersion.OpenApi3_1` on .NET 11 RC 1 emitted `"openapi": "3.1.2"`, not `3.1.1`.
- Typed SSE results advertise `text/event-stream`; the Day 1 manual `HttpContext` writer streamed correctly but did not add response content metadata.

## Solution
See `solution\`.