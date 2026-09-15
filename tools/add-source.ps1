<#
.SYNOPSIS
    Adds a community publication to content/sources.json as a 'pending' intake record.

.DESCRIPTION
    The front door of the community sources pipeline. Deliberately does NOT
    verify anything: it only captures the URL and whatever metadata you already
    know, leaving verification='pending' so the vetting step has to look at it.

    Pending records are schema-valid but never ship: build-sources.ps1 projects
    verified records only, so nothing reaches the site until a human has vetted
    it. The record also defaults to usageTier 1 (link only) -- an un-vetted
    source may be linked, never quoted or restated.

    Vetting (verifying claims against Microsoft Learn, assigning a copyright
    usage tier, and judging preview drift) is a separate, human-reviewed step.

.PARAMETER Url
    The publication URL. Required. Duplicates are rejected.

.PARAMETER Modules
    Optional first guess at which workshop modules this belongs to. Run
    tools/validate-sources.ps1 to see the valid module IDs.

.EXAMPLE
    pwsh tools/add-source.ps1 -Url https://example.com/csharp-15-unions

.EXAMPLE
    pwsh tools/add-source.ps1 -Url https://example.com/pqc -Title "PQC in .NET 10" `
        -Author "A. Writer" -Kind article -Modules day1-m3 -Origin user-supplied

.EXAMPLE
    # Bulk intake from a text file of URLs, one per line.
    Get-Content links.txt | ForEach-Object { pwsh tools/add-source.ps1 -Url $_ }
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory, Position = 0, ValueFromPipeline)]
    [string] $Url,

    [string]   $Title,
    [string]   $Author,
    [string]   $Publisher,
    [string]   $Kind = 'article',
    [string]   $Published,
    [string[]] $Modules = @(),
    [string[]] $Covers = @(),
    [Alias('Notes')]
    [string]   $Summary,
    [string]   $Origin = 'discovered',
    [string]   $SourcesPath   = (Join-Path $PSScriptRoot '..\content\sources.json'),
    [string]   $SchemaPath    = (Join-Path $PSScriptRoot '..\content\sources.schema.json')
)

begin {
    $ErrorActionPreference = 'Stop'
    $doc = Get-Content -Raw -LiteralPath $SourcesPath | ConvertFrom-Json
    $validModules = @($doc.modules | ForEach-Object { $_.id })

    # Derive the allowed values from the schema rather than duplicating them
    # here. Hand-copied enums in this repo have silently drifted three times.
    $schema = Get-Content -Raw -LiteralPath $SchemaPath | ConvertFrom-Json
    $props  = $schema.properties.sources.items.properties
    $validKinds   = @($props.kind.enum)
    $validOrigins = @($props.origin.enum)

    if ($validKinds -notcontains $Kind) {
        throw "unknown kind '$Kind'. Valid: $($validKinds -join ', ')"
    }
    if ($validOrigins -notcontains $Origin) {
        throw "unknown origin '$Origin'. Valid: $($validOrigins -join ', ')"
    }

    # `pwsh -File script.ps1 -Covers a,b` passes a single string, not an array,
    # so accept comma-joined values for both list parameters.
    $Modules = @($Modules | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $Covers  = @($Covers  | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })

    $added = 0
}

process {
    $Url = $Url.Trim()
    if (-not $Url) { return }
    if ($Url -notmatch '^https?://') {
        Write-Warning "skipping '$Url': not an absolute http(s) URL"
        return
    }

    $norm = ($Url -replace '[?#].*$', '').TrimEnd('/').ToLowerInvariant()
    $dupe = @($doc.sources) | Where-Object {
        ($_.url -replace '[?#].*$', '').TrimEnd('/').ToLowerInvariant() -eq $norm
    }
    if ($dupe) {
        Write-Host "already tracked as '$($dupe[0].id)' (verification: $($dupe[0].verification)): $Url" -ForegroundColor Yellow
        return
    }

    foreach ($m in $Modules) {
        if ($validModules -notcontains $m) {
            throw "unknown module '$m'. Valid: $($validModules -join ', ')"
        }
    }

    # Derive a readable kebab-case id from publisher + slug, e.g. medium-unions.
    $uri = [Uri]$Url
    $hostName = $uri.Host -replace '^www\.', ''
    $hostPart = ($hostName -split '\.')[0]

    # Use several trailing path segments, not just the last one. Documentation
    # sites reuse generic leaf names ('overview', 'libraries', 'whatsnew')
    # across versions, so a single segment produces colliding, unreadable ids
    # like 'learn-overview' and 'learn-overview-2'.
    $segments = @($uri.AbsolutePath.Trim('/') -split '/' |
        Where-Object { $_ -and $_ -notmatch '^[a-z]{2}-[a-z]{2}$' } |
        ForEach-Object { $_ -replace '\.\w{2,5}$', '' })

    $slug = (@($segments | Select-Object -Last 3) -join '-')
    if (-not $slug) { $slug = 'post' }

    $base = ("$hostPart-$slug").ToLowerInvariant() -replace '[^a-z0-9]+', '-'
    $base = $base.Trim('-')
    if ($base.Length -gt 60) { $base = $base.Substring(0, 60).Trim('-') }

    $id = $base
    $n = 2
    $existingIds = @($doc.sources | ForEach-Object { $_.id })
    while ($existingIds -contains $id) { $id = "$base-$n"; $n++ }

    $record = [ordered]@{
        id           = $id
        title        = if ($Title) { $Title } else { "TODO: title for $Url" }
        url          = $Url
        kind         = $Kind
        origin       = $Origin
        modules      = @($Modules)
        covers       = @($Covers)
        retrieved    = (Get-Date).ToString('yyyy-MM-dd')
        verification = 'pending'
        # Link-only until a human decides otherwise. An un-vetted source must
        # never be quoted or restated, so the most restrictive tier is the
        # only safe default.
        usageTier    = 1
        summary      = if ($Summary) { $Summary } else { 'TODO: write our own one-line summary during vetting. Never copy the source.' }
        recommended  = $false
    }
    foreach ($pair in @(
        @{ k = 'author';    v = $Author },
        @{ k = 'publisher'; v = $Publisher },
        @{ k = 'published'; v = $Published })) {
        if ($pair.v) { $record[$pair.k] = $pair.v }
    }

    $doc.sources = @($doc.sources) + [pscustomobject]$record
    $added++
    Write-Host "+ $id" -ForegroundColor Green
    Write-Host "    $Url"
    if (-not $Title) { Write-Host "    (needs a title during vetting)" -ForegroundColor DarkGray }
}

end {
    if ($added -eq 0) {
        Write-Host "nothing added."
        return
    }

    $json = $doc | ConvertTo-Json -Depth 8
    [IO.File]::WriteAllText(
        [IO.Path]::GetFullPath($SourcesPath),
        $json + [Environment]::NewLine,
        (New-Object System.Text.UTF8Encoding $false))

    Write-Host ""
    Write-Host "Added $added source(s) with verification 'pending'." -ForegroundColor Green
    Write-Host "Next: vet them (check claims against Learn, set usageTier, judge preview drift),"
    Write-Host "      write a summary, then set verification to 'verified'."
    Write-Host "      Validate with: pwsh tools/validate-sources.ps1"
    Write-Host "      Publish with:  pwsh tools/build-sources.ps1"
}
