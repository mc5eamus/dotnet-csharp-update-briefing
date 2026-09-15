<#
.SYNOPSIS
    Generates site/assets/sources.js from content/sources.json.

.DESCRIPTION
    The site must work from file:// (attendees open index.html directly, and the
    standalone bundle has no web server). Browsers block fetch() on file://, so
    the vetted source list is emitted as a plain script that assigns
    window.WORKSHOP_SOURCES instead of being fetched as JSON.

    content/sources.json stays the canonical, reviewable artifact; this script
    projects it into the shape the page needs, dropping intake-only fields and
    anything not yet verified.

.EXAMPLE
    pwsh tools/build-sources.ps1
    pwsh tools/build-sources.ps1 -IncludeUnverified   # preview work in progress
#>
[CmdletBinding()]
param(
    [string] $SourcesPath = (Join-Path $PSScriptRoot '..\content\sources.json'),
    [string] $SchemaPath  = (Join-Path $PSScriptRoot '..\content\sources.schema.json'),
    [string] $OutputPath  = (Join-Path $PSScriptRoot '..\site\assets\sources.js'),
    [switch] $IncludeUnverified,
    [switch] $SkipValidation
)

$ErrorActionPreference = 'Stop'

if (-not $SkipValidation) {
    & (Join-Path $PSScriptRoot 'validate-sources.ps1') -SourcesPath $SourcesPath | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Error "sources.json failed validation; refusing to generate sources.js"
        exit 1
    }
}

$doc = Get-Content -Raw -LiteralPath $SourcesPath | ConvertFrom-Json

$included = @($doc.sources | Where-Object {
    $IncludeUnverified -or $_.verification -eq 'verified'
})

# Which fields reach the browser.
#
# This used to be a hand-written allow-list, and it drifted twice: once losing
# `verification` and renaming `usageTier` to `tier` (which made the renderer
# throw on the first real record), and once silently dropping `previewDrift`
# and `driftNote` so no drift warning ever reached an attendee.
#
# So it is now derived from the schema and inverted: every documented field
# ships unless it is named below. Adding a field to the schema now surfaces it
# by default, and hiding one is a deliberate, visible decision.
$schema = Get-Content -Raw -LiteralPath $SchemaPath | ConvertFrom-Json
$allFields = @($schema.properties.sources.items.properties.PSObject.Properties.Name)

# Internal-only: a local cache path is meaningless to an attendee and just
# leaks our directory layout into a public artefact.
$withheld = @('cachePath')

$shipped = @($allFields | Where-Object { $withheld -notcontains $_ })
if ($shipped.Count -lt 5) {
    throw "schema projection produced only $($shipped.Count) field(s); refusing to generate a gutted sources.js"
}

$projected = @($included | ForEach-Object {
    $src = $_
    $o = [ordered]@{}
    foreach ($f in $shipped) {
        $val = $src.$f
        if ($null -eq $val) { continue }
        # Drop empty strings and empty arrays, but keep $false and 0 -- those
        # are meaningful values, not absences.
        if ($val -is [string] -and $val -eq '') { continue }
        if ($val -is [array] -and $val.Count -eq 0) { continue }
        $o[$f] = $val
    }
    # `recommended: false` carries no information for the renderer; omitting it
    # keeps the generated file smaller and its diffs quieter.
    if ($o.Contains('recommended') -and -not $o['recommended']) { $o.Remove('recommended') }
    if ($o.Contains('usageTier')) { $o['usageTier'] = [int]$o['usageTier'] }
    [pscustomobject]$o
})

# Stable ordering: recommended first, then publisher, then title. Without this
# the generated file churns on every rebuild and diffs become useless.
$projected = @($projected | Sort-Object `
    @{ Expression = { if ($_.PSObject.Properties.Name -contains 'recommended') { 0 } else { 1 } } },
    @{ Expression = { if ($_.PSObject.Properties.Name -contains 'publisher') { $_.publisher } else { '' } } },
    @{ Expression = { $_.title } })

$payload = [ordered]@{
    generated = (Get-Date).ToString('yyyy-MM-dd')
    modules   = @($doc.modules)
    sources   = $projected
}

$json = $payload | ConvertTo-Json -Depth 8
# ConvertTo-Json renders an empty array as "[]" only when it is not $null; make
# sure a sources-free build still produces a usable file rather than "null".
if (-not $json) { throw "failed to serialise sources payload" }

$banner = @"
/* GENERATED FILE - DO NOT EDIT.
   Source: content/sources.json
   Regenerate: pwsh tools/build-sources.ps1

   Loaded as a script (not fetched) so the site works from file:// where
   fetch() is blocked by the browser's origin rules. */
window.WORKSHOP_SOURCES =
"@

$content = $banner + $json + ";" + [Environment]::NewLine

$outDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

# UTF-8 without BOM: a BOM before `window.` is harmless in a script tag but
# shows up in diffs and in the standalone inliner.
[IO.File]::WriteAllText(
    [IO.Path]::GetFullPath($OutputPath),
    $content,
    (New-Object System.Text.UTF8Encoding $false))

$skipped = @($doc.sources).Count - $included.Count
Write-Host ""
Write-Host "Wrote $([IO.Path]::GetFullPath($OutputPath))" -ForegroundColor Green
Write-Host "  included : $($included.Count)"
if ($skipped -gt 0) {
    Write-Host "  skipped  : $skipped (not yet verified; use -IncludeUnverified to preview)"
}

$unmapped = @($doc.modules | Where-Object {
    $id = $_.id
    -not ($projected | Where-Object { $_.modules -contains $id })
})
if ($unmapped.Count -gt 0) {
    Write-Host "  modules with no further reading yet: $(($unmapped | ForEach-Object { $_.id }) -join ', ')" -ForegroundColor Yellow
}
