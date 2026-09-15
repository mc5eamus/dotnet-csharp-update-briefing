<#
.SYNOPSIS
    Validates content/sources.json against the schema and the workshop's own rules.

.DESCRIPTION
    Structural rules are read from content/sources.schema.json rather than
    duplicated here. An earlier version hard-coded its own field names and enums,
    drifted away from the schema, and happily passed 25 records that the renderer
    could not read. Deriving the rules from the schema is what stops that
    recurring: if the schema and the data disagree, this fails.

    On top of the schema it enforces what JSON Schema cannot express: module IDs
    must exist in the registry, IDs and URLs must be unique, copyright tiers must
    match the fields present, and anything covering a preview release must carry
    an explicit preview-drift verdict.

    Exit code 0 = clean, 1 = errors found.

.EXAMPLE
    pwsh tools/validate-sources.ps1
#>
[CmdletBinding()]
param(
    [string] $SourcesPath = (Join-Path $PSScriptRoot '..\content\sources.json'),
    [string] $SchemaPath  = (Join-Path $PSScriptRoot '..\content\sources.schema.json')
)

$ErrorActionPreference = 'Stop'

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

foreach ($p in @($SourcesPath, $SchemaPath)) {
    if (-not (Test-Path $p)) { Write-Error "not found: $p"; exit 1 }
}

try {
    $doc = Get-Content -Raw -LiteralPath $SourcesPath | ConvertFrom-Json
} catch {
    Write-Error "sources.json is not valid JSON: $($_.Exception.Message)"
    exit 1
}
try {
    $schema = Get-Content -Raw -LiteralPath $SchemaPath | ConvertFrom-Json
} catch {
    Write-Error "sources.schema.json is not valid JSON: $($_.Exception.Message)"
    exit 1
}

# --------------------------------------------------------- schema-derived ----
$item = $schema.properties.sources.items
$schemaProps = @($item.properties.PSObject.Properties.Name)
$schemaRequired = @($item.required)

# Pull every enum the schema declares, keyed by field name.
$schemaEnums = @{}
foreach ($name in $schemaProps) {
    $def = $item.properties.$name
    if ($def.PSObject.Properties.Name -contains 'enum') {
        $schemaEnums[$name] = @($def.enum)
    } elseif ($def.type -eq 'array' -and $def.items -and
              ($def.items.PSObject.Properties.Name -contains 'enum')) {
        $schemaEnums["$name[]"] = @($def.items.enum)
    }
}

$validModules = @($doc.modules | ForEach-Object { $_.id })
$validTiers = @(1, 2, 3)

if ($validModules.Count -eq 0) {
    $errors.Add("registry declares no modules; further-reading mapping cannot be validated")
}

$seenIds = @{}
$seenUrls = @{}
$sources = @($doc.sources)

foreach ($s in $sources) {
    $label = if ($s.id) { $s.id } elseif ($s.url) { $s.url } else { '<unnamed source>' }
    $present = @($s.PSObject.Properties.Name)

    # --- schema conformance -------------------------------------------------
    foreach ($req in $schemaRequired) {
        if ($present -notcontains $req -or $null -eq $s.$req -or '' -eq "$($s.$req)") {
            $errors.Add("$label : missing required field '$req'")
        }
    }
    # Unknown fields are errors, not warnings. This is the check that catches a
    # contributor (or an agent) writing to field names the renderer never reads.
    foreach ($f in $present) {
        if ($schemaProps -notcontains $f) {
            $errors.Add("$label : unknown field '$f' (not in sources.schema.json)")
        }
    }
    foreach ($f in $schemaEnums.Keys) {
        if ($f.EndsWith('[]')) {
            $bare = $f.Substring(0, $f.Length - 2)
            foreach ($v in @($s.$bare)) {
                if ($null -ne $v -and $schemaEnums[$f] -notcontains $v) {
                    $errors.Add("$label : '$bare' contains '$v' (expected: $($schemaEnums[$f] -join ', '))")
                }
            }
        } elseif ($null -ne $s.$f -and '' -ne "$($s.$f)" -and $schemaEnums[$f] -notcontains $s.$f) {
            $errors.Add("$label : '$f' is '$($s.$f)' (expected: $($schemaEnums[$f] -join ', '))")
        }
    }

    # --- identity -----------------------------------------------------------
    if ($s.id) {
        if ($s.id -notmatch '^[a-z0-9][a-z0-9-]*$') {
            $errors.Add("$label : 'id' must be kebab-case (lowercase letters, digits, hyphens)")
        } elseif ($seenIds.ContainsKey($s.id)) {
            $errors.Add("$label : duplicate 'id'")
        } else {
            $seenIds[$s.id] = $true
        }
    }

    if ($s.url) {
        if ($s.url -notmatch '^https?://') {
            $errors.Add("$label : 'url' must be absolute http(s)")
        }
        $norm = ($s.url -replace '[?#].*$', '').TrimEnd('/').ToLowerInvariant()
        if ($seenUrls.ContainsKey($norm)) {
            $warnings.Add("$label : duplicate URL, also used by '$($seenUrls[$norm])'")
        } else {
            $seenUrls[$norm] = $s.id
        }
    }

    $isVerified = $s.verification -eq 'verified'

    # --- module mapping -----------------------------------------------------
    $mods = @($s.modules)
    if ($isVerified -and $mods.Count -eq 0) {
        $errors.Add("$label : verified sources must map to at least one module")
    }
    foreach ($m in $mods) {
        if ($validModules -notcontains $m) {
            $errors.Add("$label : unknown module '$m' (valid: $($validModules -join ', '))")
        }
    }

    # --- copyright ----------------------------------------------------------
    if ($null -ne $s.usageTier) {
        if ($validTiers -notcontains [int]$s.usageTier) {
            $errors.Add("$label : usageTier must be 1, 2 or 3")
        } elseif ([int]$s.usageTier -eq 3 -and -not $s.quote) {
            $warnings.Add("$label : usageTier 3 declared but no 'quote' recorded")
        }
        if ($s.quote -and [int]$s.usageTier -ne 3) {
            $errors.Add("$label : 'quote' present but usageTier is $($s.usageTier); short attributed quotes require tier 3")
        }
    }
    if ($s.quote -and $s.quote.Length -gt 300) {
        $errors.Add("$label : 'quote' exceeds 300 characters; keep quotations short")
    }

    # --- preview drift ------------------------------------------------------
    # Anything written about .NET 11 / C# 15 before RC 1 may describe APIs that
    # have since changed. Every such source must carry an explicit verdict.
    $covers = @($s.covers)
    $isPreviewTopic = ($covers | Where-Object { $_ -match '(?i)(net11|dotnet-?11|c#\s*15|cs15)' }).Count -gt 0
    if (-not $isPreviewTopic) {
        $isPreviewTopic = ($mods | Where-Object { $_ -like 'day2-*' }).Count -gt 0
    }
    if ($isPreviewTopic -and $isVerified -and -not $s.previewDrift) {
        $errors.Add("$label : covers a preview release but has no 'previewDrift' verdict (none|minor|major)")
    }
    # Knowing *which* build a piece was written against is what makes a drift
    # verdict auditable rather than an opinion. Without it, a reader cannot tell
    # whether 'none' means 'still accurate' or 'nobody re-checked'.
    if ($isPreviewTopic -and $isVerified -and -not $s.writtenAgainst) {
        $warnings.Add("$label : covers a preview release but records no 'writtenAgainst' build")
    }
    if (@('minor', 'major') -contains $s.previewDrift -and -not $s.driftNote) {
        if ($s.previewDrift -eq 'major') {
            $errors.Add("$label : previewDrift is 'major' but no 'driftNote' explains what changed")
        } else {
            $warnings.Add("$label : previewDrift is 'minor' but no 'driftNote' explains what changed")
        }
    }

    # --- provenance ---------------------------------------------------------
    if ($isVerified -and -not $s.retrieved) {
        $warnings.Add("$label : verified but no 'retrieved' date recorded")
    }
    foreach ($d in @('retrieved', 'published')) {
        if ($s.$d -and $s.$d -notmatch '^\d{4}-\d{2}-\d{2}$') {
            $errors.Add("$label : '$d' must be YYYY-MM-DD (got '$($s.$d)')")
        }
    }
}

# ---------------------------------------------------------------- report ----
Write-Host ""
Write-Host "Validating $([IO.Path]::GetFullPath($SourcesPath))"
Write-Host "  sources : $($sources.Count)"
Write-Host "  modules : $($validModules.Count)"

$byVerification = $sources | Group-Object verification | Sort-Object Name
foreach ($g in $byVerification) { Write-Host ("    {0,-20} {1}" -f $g.Name, $g.Count) }

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "Warnings:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "  ! $_" -ForegroundColor Yellow }
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Errors:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  x $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "$($errors.Count) error(s)." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "sources.json is valid." -ForegroundColor Green
exit 0
