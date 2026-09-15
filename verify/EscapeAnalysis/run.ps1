<#
.SYNOPSIS
  Runs the escape-analysis benchmark on .NET 8, 9 and 10 and prints the comparison.

.DESCRIPTION
  This is the harness behind the "stack allocation" slides in Day 1, module 1.
  It exists in the repo because the result is *not deterministic* — see -Repeat.

  Requires the .NET 8, 9 and 10 runtimes. Use -Frameworks to run a subset.

.EXAMPLE
  ./run.ps1
  ./run.ps1 -Repeat 3
  ./run.ps1 -Frameworks net10.0 -Repeat 5
#>
[CmdletBinding()]
param(
    [string[]] $Frameworks = @('net8.0', 'net9.0', 'net10.0'),
    [int] $Repeat = 1
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $here

try {
    $installed = (& dotnet --list-runtimes) -match '^Microsoft\.NETCore\.App'
    $missing = foreach ($f in $Frameworks) {
        $major = $f -replace '^net(\d+)\.\d+$', '$1'
        if (-not ($installed -match "Microsoft\.NETCore\.App $major\.")) { $f }
    }
    if ($missing) {
        Write-Warning "No runtime installed for: $($missing -join ', ') — skipping those."
        $Frameworks = @($Frameworks | Where-Object { $_ -notin $missing })
    }
    if (-not $Frameworks) { throw 'None of the requested runtimes are installed.' }

    Write-Host ''
    Write-Host 'Building Release for ' -NoNewline
    Write-Host ($Frameworks -join ', ') -ForegroundColor Cyan
    & dotnet build -c Release --nologo -v quiet | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "build failed ($LASTEXITCODE)" }

    for ($run = 1; $run -le $Repeat; $run++) {
        if ($Repeat -gt 1) {
            Write-Host ''
            Write-Host "--- run $run of $Repeat ---" -ForegroundColor DarkGray
        }
        foreach ($f in $Frameworks) {
            Write-Host ''
            & dotnet run -c Release -f $f --no-build
            if ($LASTEXITCODE -ne 0) { throw "run failed on $f ($LASTEXITCODE)" }
        }
    }

    Write-Host ''
    Write-Host 'Read this carefully:' -ForegroundColor Yellow
    Write-Host '  * "returned (escapes)" should stay at ~40 bytes/call on every runtime.'
    Write-Host '    That is the control. If it moves, the measurement is broken.'
    Write-Host '  * The non-escaping rows may report 0.00 on .NET 10 and ~40.00 on 8 and 9.'
    Write-Host '  * Run with -Repeat 3. On .NET 10 you may well see 0.00 and 40.00 from the'
    Write-Host '    same binary. That is tiered compilation, and it is the real lesson:'
    Write-Host '    this optimisation is an opportunity, never a guarantee.' -ForegroundColor Yellow
    Write-Host ''
}
finally {
    Pop-Location
}
