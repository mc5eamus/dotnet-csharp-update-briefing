<#
.SYNOPSIS
    Checks that every URL in the source registry still resolves.

.DESCRIPTION
    The decks contain no hardcoded URLs -- every link an attendee can click comes
    from content/sources.json. That makes this one file the single point where
    link rot can embarrass you in front of a room.

    This is deliberately NOT part of build-standalone.ps1. The package has to
    build on a machine with no network, and a flaky corporate proxy must never be
    able to block a rebuild. Run it before you hand the material over.

    Learn URLs are the usual casualty: they reuse leaf names across versions, so a
    wrong-but-plausible URL 404s rather than redirecting. One already bit us --
    .../aspnetcore-11.0 is a 404, the real page is .../aspnetcore-11.

.PARAMETER SourcesPath
    Registry to check. Defaults to content/sources.json next to this script.

.PARAMETER TimeoutSec
    Per-request timeout. Default 30.

.PARAMETER ThrottleLimit
    Parallel requests. Default 8. Lower it if a host starts returning 429.

.EXAMPLE
    pwsh tools/check-links.ps1
    pwsh tools/check-links.ps1 -ThrottleLimit 3
#>
[CmdletBinding()]
param(
    [string] $SourcesPath,
    [int]    $TimeoutSec = 30,
    [int]    $ThrottleLimit = 8
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path $PSScriptRoot -Parent
if (-not $SourcesPath) { $SourcesPath = Join-Path $repo 'content\sources.json' }

if (-not (Test-Path $SourcesPath)) {
    Write-Error "sources file not found: $SourcesPath"
    exit 2
}

$doc = Get-Content $SourcesPath -Raw | ConvertFrom-Json
$targets = @($doc.sources | Where-Object { $_.url } | ForEach-Object {
    [pscustomobject]@{ Id = $_.id; Url = $_.url }
})

if ($targets.Count -eq 0) {
    Write-Error "no URLs found in $SourcesPath"
    exit 2
}

Write-Host ""
Write-Host "Checking $($targets.Count) URL(s) from $([IO.Path]::GetFullPath($SourcesPath))"
Write-Host ""

$results = $targets | ForEach-Object -ThrottleLimit $ThrottleLimit -Parallel {
    $t = $_
    $timeout = $using:TimeoutSec

    # Some CDNs reject HEAD or an absent UA. Fall back to a ranged GET rather
    # than reporting a false 404 for a page that is actually fine.
    $ua = 'Mozilla/5.0 (compatible; workshop-link-check/1.0)'
    $status = $null
    $err = $null

    foreach ($method in @('Head', 'Get')) {
        try {
            $r = Invoke-WebRequest -Uri $t.Url -Method $method -TimeoutSec $timeout `
                -MaximumRedirection 5 -UserAgent $ua -SkipHttpErrorCheck -ErrorAction Stop
            $status = [int]$r.StatusCode
            $err = $null
            if ($status -lt 400) { break }
        } catch {
            $err = $_.Exception.Message
            $status = $null
        }
    }

    [pscustomobject]@{
        Id     = $t.Id
        Url    = $t.Url
        Status = $status
        Error  = $err
        Ok     = ($null -ne $status -and $status -lt 400)
    }
}

$bad = @($results | Where-Object { -not $_.Ok })
$ok  = @($results | Where-Object { $_.Ok })

foreach ($r in ($ok | Sort-Object Id)) {
    Write-Host ("  {0,3}  {1}" -f $r.Status, $r.Id)
}

if ($bad.Count -gt 0) {
    Write-Host ""
    Write-Host "Problems:" -ForegroundColor Red
    foreach ($r in ($bad | Sort-Object Id)) {
        $what = if ($r.Status) { "HTTP $($r.Status)" } else { $r.Error }
        Write-Host ("  x {0}" -f $r.Id) -ForegroundColor Red
        Write-Host ("      {0}" -f $r.Url)
        Write-Host ("      {0}" -f $what)
    }
}

Write-Host ""
Write-Host ("{0} URL(s) checked - {1} ok, {2} broken." -f $results.Count, $ok.Count, $bad.Count)

if ($bad.Count -gt 0) { exit 1 }
exit 0
