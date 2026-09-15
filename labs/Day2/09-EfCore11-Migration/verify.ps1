param(
    [ValidateSet("start", "solution")]
    [string]$Project = "solution"
)

$ErrorActionPreference = "Stop"
$labRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Join-Path $labRoot $Project
$dotnet = Join-Path $env:LOCALAPPDATA "Microsoft\dotnet\dotnet.exe"
if (-not (Test-Path $dotnet)) { throw "Expected .NET 11-capable dotnet at $dotnet." }

& $dotnet run --project (Join-Path $projectPath "Lab04.csproj")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }