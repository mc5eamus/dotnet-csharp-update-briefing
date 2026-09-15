<#
    Generates the lab solution files from whatever lab projects exist.

    Two solutions per day, deliberately:
      DayN.sln            -- the `start` projects, which is what attendees open
      DayN-Solutions.sln  -- the `solution` projects, for facilitator verification

    They are kept apart because a single solution containing both invites
    building or editing the wrong project during a lab. They are both generated
    because the reference solutions are code too: for a while DayN.sln contained
    only `start`, so `dotnet build labs/Day1.sln` reported success while never
    compiling a single line of the answers it was supposed to be validating.

    Classic .sln rather than .slnx: .slnx works with the .NET 10 SDK but is not
    yet understood by every IDE and toolchain an attendee might turn up with,
    and a solution file that won't open is a bad first five minutes.

    Regenerate at any time -- it rebuilds from scratch rather than patching, so
    it stays correct as labs are added.

    Usage:
        pwsh -NoProfile -File tools/make-solutions.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$labs = Join-Path $repo 'labs'

# The .NET 11 SDK can build net10.0 projects, so one dotnet drives both days.
$dotnet = Join-Path $env:LOCALAPPDATA 'Microsoft\dotnet\dotnet.exe'
if (-not (Test-Path $dotnet)) { $dotnet = 'dotnet' }

$failed = $false

$variants = @(
    @{ Suffix = '';           Kind = 'start'    },
    @{ Suffix = '-Solutions'; Kind = 'solution' }
)

foreach ($day in @('Day1', 'Day2')) {
    $dayDir = Join-Path $labs $day
    if (-not (Test-Path $dayDir)) {
        Write-Host "skip $day (no such directory)" -ForegroundColor DarkGray
        continue
    }

    foreach ($variant in $variants) {
        $name = "$day$($variant.Suffix)"
        $kind = $variant.Kind
        $sln = Join-Path $labs "$name.sln"
        if (Test-Path $sln) { Remove-Item $sln -Force }

        $projects = Get-ChildItem -Path $dayDir -Filter *.csproj -Recurse -File |
            Where-Object {
                $_.FullName.Substring($dayDir.Length + 1) -match "(^|\\)$kind(\\|$)"
            } |
            Sort-Object FullName

        if (-not $projects) {
            Write-Host "skip $name (no $kind projects yet)" -ForegroundColor DarkGray
            continue
        }

        # The .NET 11 SDK defaults `dotnet new sln` to .slnx, so ask for the classic
        # format explicitly rather than relying on whichever SDK happens to be first.
        & $dotnet new sln --name $name --output $labs --format sln | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $sln)) { throw "could not create $name.sln" }

        foreach ($p in $projects) {
            # -s puts each lab in a solution folder named after the lab directory,
            # so the solution reads like the agenda rather than a flat pile.
            $labDir = Split-Path (Split-Path $p.FullName -Parent) -Parent
            $folder = Split-Path $labDir -Leaf                            # 01-CSharp14

            & $dotnet sln $sln add $p.FullName --solution-folder $folder | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  FAILED to add $($p.Name) to $name" -ForegroundColor Red
                $failed = $true
            }
        }

        Write-Host ("{0,-20} {1} {2} project(s)" -f "$name.sln", $projects.Count, $kind) -ForegroundColor Green
        foreach ($p in $projects) {
            Write-Host ("    " + $p.FullName.Substring($labs.Length + 1)) -ForegroundColor DarkGray
        }
    }
}

if ($failed) { exit 1 }
