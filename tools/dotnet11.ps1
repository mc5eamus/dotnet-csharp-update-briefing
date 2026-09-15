<#
.SYNOPSIS
    Invokes the dotnet CLI that can build both Day 1 (net10.0) and Day 2 (net11.0) labs.

.DESCRIPTION
    SDK install roots do not discover each other. If the .NET 11 SDK was installed to a
    user-local root (because Program Files was not writable), the system `dotnet` on PATH
    cannot see it. This helper finds a root that has a .NET 11 SDK and forwards to it.

.EXAMPLE
    .\tools\dotnet11.ps1 --list-sdks
    .\tools\dotnet11.ps1 build ..\labs\Day2.slnx

.NOTES
    Deliberately has no param() block and no [CmdletBinding()].

    Both would make PowerShell bind arguments itself, and the dotnet CLI's short
    flags collide with PowerShell's common parameters: `-o` is ambiguous with
    `-OutVariable`/`-OutBuffer`, and `-v` is swallowed as `-Verbose`. That turns
    `dotnet11.ps1 build x.sln -v q` into "MSB1008: Only one project can be
    specified", which is a baffling error to hand an attendee.

    Using the automatic $args means every argument is forwarded verbatim.
#>

$dotnetArgs = $args

$candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'),
    (Join-Path $env:ProgramFiles 'dotnet\dotnet.exe'),
    (Join-Path $env:USERPROFILE '.dotnet\dotnet.exe')
) | Where-Object { $_ -and (Test-Path $_) }

$chosen = $null
foreach ($candidate in $candidates) {
    $sdks = & $candidate --list-sdks 2>$null
    if ($sdks -match '^11\.') { $chosen = $candidate; break }
}

if (-not $chosen) {
    Write-Error @"
No dotnet installation with a .NET 11 SDK was found.

Searched:
$($candidates -join "`n")

Install it without elevation with:
  irm https://dot.net/v1/dotnet-install.ps1 -OutFile dotnet-install.ps1
  .\dotnet-install.ps1 -Channel 11.0 -Quality preview -InstallDir "`$env:LOCALAPPDATA\Microsoft\dotnet"
"@
    exit 1
}

if (-not $dotnetArgs -or $dotnetArgs.Count -eq 0) {
    Write-Host "Using: $chosen"
    & $chosen --info
    exit $LASTEXITCODE
}

& $chosen @dotnetArgs
exit $LASTEXITCODE
