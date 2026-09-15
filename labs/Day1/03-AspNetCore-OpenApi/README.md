# Lab 03 - Minimal API and OpenAPI

## Goal
Build a small ASP.NET Core Minimal API with OpenAPI, XML documentation, request validation, and a short server-sent event stream. This API is migrated to .NET 11 in Lab 08 tomorrow, so keep it small.

## Estimated time
40 minutes.

## Prerequisites
.NET SDK 10.0.300 or later. The lab uses `Microsoft.AspNetCore.OpenApi` and `Microsoft.Extensions.Validation` version `10.*`.

## How to run

```powershell
cd start
dotnet run --urls http://127.0.0.1:5103
```

Open `http://127.0.0.1:5103/openapi/v1.json`. The start project compiles, but the POST and SSE work is deliberately missing.

## Tasks
1. Add a validated `POST /catalogue` endpoint that accepts `CreateCatalogueItemRequest` and returns `201 Created`.
2. Document the request DTO and handlers with XML comments.
3. Confirm those comments appear in the generated OpenAPI document.
4. Add `GET /catalogue/events` as a short server-sent event stream.

## Hints
- Keep the catalogue as an in-memory `List<CatalogueItem>`.
- `AddOpenApi()` and `MapOpenApi()` are the only OpenAPI services and endpoints needed here.
- `AddValidation()` comes from `Microsoft.Extensions.Validation`; the DTO uses data annotations.
- Use `ProducesResponseType` attributes for response metadata and descriptions.

## Verification
From the lab root:

```powershell
cd solution
dotnet build
cd ..
.\verify.ps1
```

## What good looks like
The verification script ends with:

```text
OpenAPI 3.1.1 verified.
SSE endpoint verified.
```

See `solution/` for the completed version.
