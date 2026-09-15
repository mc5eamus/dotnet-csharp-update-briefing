<#
    Installs the standalone deck to a stable per-user folder and puts a shortcut
    in the Start Menu, so the workshop can be opened any time without the repo,
    without a build step and without a network.

    Why not GitHub Pages? See "Opening the deck" in README.md: Pages is not
    available for a private repository on this account's plan, and this is
    customer engagement material, so the repository stays private.

    The installed copy is a snapshot. Re-run this script after changing any
    slide content to refresh it.

    Usage:
        pwsh -NoProfile -File tools/publish-local.ps1
        pwsh -NoProfile -File tools/publish-local.ps1 -Destination D:\decks\dotnet
        pwsh -NoProfile -File tools/publish-local.ps1 -SkipBuild -NoShortcut
#>
[CmdletBinding()]
param(
    [string]$Destination,
    [switch]$SkipBuild,
    [switch]$NoShortcut
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $repo 'dist'
if (-not $Destination) {
    $Destination = Join-Path $env:LOCALAPPDATA 'dotnet-csharp-update-briefing'
}

# Build first. Installing an unverified deck would defeat the point of having a
# gated build at all -- the gates are what make the installed copy trustworthy.
if ($SkipBuild) {
    if (-not (Test-Path (Join-Path $dist 'index.html'))) {
        throw "-SkipBuild was passed but there is no dist\index.html to install. Run without -SkipBuild."
    }
    Write-Host 'Skipping build; installing the existing dist\ as-is.' -ForegroundColor Yellow
} else {
    & (Join-Path $PSScriptRoot 'build-standalone.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'the gated build failed; refusing to install an unverified deck' }
}

$pages = @(Get-ChildItem $dist -Filter *.html -File)
if ($pages.Count -eq 0) { throw "no pages found in $dist" }

# Clear out the previous snapshot's pages so a page that was renamed or removed
# upstream does not linger in the installed copy and get opened by a stale
# bookmark months later.
if (Test-Path $Destination) {
    Get-ChildItem $Destination -Filter *.html -File | Remove-Item -Force
} else {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

Copy-Item (Join-Path $dist '*') $Destination -Recurse -Force

$index = Join-Path $Destination 'index.html'
if (-not (Test-Path $index)) { throw "install produced no index.html in $Destination" }

# Stamp the snapshot so a copy found later can be traced back to a commit.
$commit = (& git -C $repo rev-parse --short HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $commit) { $commit = 'unknown' }
$stamp = [ordered]@{
    installedUtc = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    fromCommit   = $commit
    pages        = @($pages | ForEach-Object { $_.Name })
}
$stamp | ConvertTo-Json | Set-Content (Join-Path $Destination 'installed.json') -Encoding UTF8

if (-not $NoShortcut) {
    $shell = New-Object -ComObject WScript.Shell
    $programs = $shell.SpecialFolders('Programs')
    $linkPath = Join-Path $programs '.NET 10-11 Workshop.lnk'
    $link = $shell.CreateShortcut($linkPath)
    $link.TargetPath = $index
    $link.WorkingDirectory = $Destination
    $link.Description = 'What is new in .NET 10 / C# 14 and .NET 11 / C# 15 - workshop deck'
    $link.Save()
    Write-Host "Start Menu  : $linkPath"
}

$url = ([uri]$index).AbsoluteUri
Write-Host ''
Write-Host "Installed   : $Destination"
Write-Host "From commit : $commit"
Write-Host "Open        : $url"
Write-Host ''
Write-Host 'Bookmark that URL, or search the Start Menu for "workshop".'
Write-Host 'Re-run this script after editing slides to refresh the installed copy.'
