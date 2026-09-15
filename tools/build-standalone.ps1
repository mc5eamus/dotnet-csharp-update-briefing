<#
    Produces dist\ -- each page as a single self-contained .html file with the
    CSS, the JS and the sources registry inlined.

    Why bother, when site\ already works from the filesystem? Because site\ is a
    folder. Handing a customer one file per day that can be emailed, dropped on a
    share or opened from a USB stick with nothing alongside it is a materially
    different deliverable. No server, no network, no relative-path breakage.

    Usage:
        pwsh -NoProfile -File tools/build-standalone.ps1
#>
[CmdletBinding()]
param(
    [string]$OutDir
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$site = Join-Path $repo 'site'
if (-not $OutDir) { $OutDir = Join-Path $repo 'dist' }

if (-not (Test-Path $site)) { throw "no site directory at $site" }

# Regenerate the sources bundle first: shipping a standalone deck built from a
# stale registry is exactly the kind of silent drift this pipeline exists to stop.
& (Join-Path $PSScriptRoot 'build-sources.ps1')
if ($LASTEXITCODE -ne 0) { throw 'sources build failed; refusing to produce a standalone bundle' }

# Structural lint before bundling, for the same reason.
Push-Location $repo
try {
    & node (Join-Path $PSScriptRoot 'check-pages.mjs') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'check-pages reported problems; refusing to bundle' }

    # A slide that shows expected console output is making a promise. Catch the
    # stub shapes that mean nobody ever ran the snippet.
    & node (Join-Path $PSScriptRoot 'find-placeholder-output.mjs') 'site'
    if ($LASTEXITCODE -ne 0) { throw 'placeholder output block(s) found; refusing to bundle' }
} finally { Pop-Location }

if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutDir | Out-Null

# UTF-8 without BOM. A BOM inside an inlined <script> is a parse error in some
# engines, and it renders as a stray glyph at the top of the page in others.
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-Asset([string]$relative) {
    $p = Join-Path $site $relative
    if (-not (Test-Path $p)) { throw "missing asset: $relative" }
    [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
}

$css     = Read-Asset 'assets\workshop.css'
$js      = Read-Asset 'assets\workshop.js'
$sources = Read-Asset 'assets\sources.js'

# A literal "</script>" anywhere in JS string content would close the inlined
# block early. Splitting the token keeps the JS semantically identical.
function Protect-Script([string]$code) { $code -replace '</script>', '<\/script>' }

$js      = Protect-Script $js
$sources = Protect-Script $sources

$pages = Get-ChildItem -Path $site -Filter *.html -File | Sort-Object Name
if (-not $pages) { throw "no pages found in $site" }

# PowerShell's -replace performs $-substitution on the replacement string, which
# would corrupt any '$(...)' in the CSS or JS. Match the tag with a regex, then
# swap it out with the ordinal String.Replace, which is purely literal.
function Inline-Tag([string]$html, [string]$pattern, [string]$replacement, [string]$what) {
    $m = [regex]::Match($html, $pattern)
    if (-not $m.Success) { throw "$what : no match for $pattern" }
    return $html.Replace($m.Value, $replacement)
}

foreach ($page in $pages) {
    $html = [System.IO.File]::ReadAllText($page.FullName, [System.Text.Encoding]::UTF8)

    $html = Inline-Tag $html '<link\s+rel="stylesheet"\s+href="assets/workshop\.css"\s*/?>' `
                             ("<style>`n" + $css + "`n</style>") $page.Name
    $html = Inline-Tag $html '<script\s+src="assets/sources\.js"\s*></script>' `
                             ("<script>`n" + $sources + "`n</script>") $page.Name
    $html = Inline-Tag $html '<script\s+src="assets/workshop\.js"\s*></script>' `
                             ("<script>`n" + $js + "`n</script>") $page.Name

    # Nothing may still *load* from the assets folder. Match the attribute form
    # specifically: the inlined JS mentions "assets/sources.js" in a comment, and
    # a bare substring check would flag that as a failure.
    if ($html -match '(href|src)\s*=\s*"assets/') {
        throw "$($page.Name): still references assets/ after inlining"
    }

    $target = Join-Path $OutDir $page.Name
    [System.IO.File]::WriteAllText($target, $html, $utf8)

    $kb = [math]::Round((Get-Item $target).Length / 1KB)
    Write-Host ("{0,-16} {1,5} KB" -f $page.Name, $kb) -ForegroundColor Green
}

Copy-Item (Join-Path $repo 'FACILITATOR.md') $OutDir -ErrorAction SilentlyContinue

# Boot every bundled page headlessly before declaring success. Inlining is a
# text transformation on working pages, and a text transformation can produce a
# file that lints fine and still throws on load -- which is precisely what
# happened the first time dist/ was tested rather than assumed.
Write-Host ""
Write-Host "Booting bundled pages..." -ForegroundColor DarkGray
Push-Location $repo
try {
    & node (Join-Path $PSScriptRoot 'test-pages.mjs') $OutDir
    if ($LASTEXITCODE -ne 0) {
        throw "bundled pages failed their headless tests; dist/ is not shippable"
    }
} finally { Pop-Location }

Write-Host ""
Write-Host "dist -> $OutDir" -ForegroundColor Cyan
Write-Host "Each .html opens on its own with no network and no adjacent files." -ForegroundColor DarkGray
