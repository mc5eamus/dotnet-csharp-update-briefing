param(
    [ValidateSet("start", "solution")]
    [string]$Project = "solution"
)

$ErrorActionPreference = "Stop"
$labRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Join-Path $labRoot $Project
$dotnet = Join-Path $env:LOCALAPPDATA "Microsoft\dotnet\dotnet.exe"
if (-not (Test-Path $dotnet)) { throw "Expected .NET 11-capable dotnet at $dotnet." }
$port = if ($Project -eq "start") { 5108 } else { 5109 }
$outLog = Join-Path $labRoot "verify-$Project.out.log"
$errLog = Join-Path $labRoot "verify-$Project.err.log"
Remove-Item $outLog, $errLog -ErrorAction SilentlyContinue

$process = Start-Process -FilePath $dotnet -ArgumentList "run --no-launch-profile -- --urls http://127.0.0.1:$port" -WorkingDirectory $projectPath -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog -NoNewWindow
try {
    $openApiUrl = "http://127.0.0.1:$port/openapi/v1.json"
    $eventsUrl = "http://127.0.0.1:$port/catalogue/events"
    $documentText = $null

    for ($attempt = 1; $attempt -le 60; $attempt++) {
        try {
            $documentText = (& curl.exe -fsS $openApiUrl 2>$null) -join "`n"
            if ($LASTEXITCODE -eq 0 -and $documentText) { break }
        }
        catch { }
        Start-Sleep -Milliseconds 250
    }

    if (-not $documentText) { throw "OpenAPI document was not served." }
    $document = $documentText | ConvertFrom-Json
    $expectedVersion = if ($Project -eq "start") { "3.1.1" } else { "3.2.0" }
    if ($document.openapi -ne $expectedVersion) { throw "Expected OpenAPI $expectedVersion, got '$($document.openapi)'." }
    if ($documentText -notmatch "Create a catalogue item") { throw "XML summary text was not present in the OpenAPI document." }

    if ($Project -eq "solution") {
        $compatText = (& curl.exe -fsS "http://127.0.0.1:$port/openapi/v1-compat.json") -join "`n"
        $compat = $compatText | ConvertFrom-Json
        if ($compat.openapi -ne "3.1.2") { throw "Expected pinned OpenAPI 3.1.2, got '$($compat.openapi)'." }
        $contentTypes = $document.paths."/catalogue/events".get.responses."200".content.PSObject.Properties.Name
        if ($contentTypes -notcontains "text/event-stream") { throw "SSE endpoint is not described as text/event-stream." }
        Write-Host "Pinned OpenAPI $($compat.openapi) verified."
    }

    $events = & curl.exe -fsS -N --max-time 5 $eventsUrl
    if ($LASTEXITCODE -ne 0) { throw "curl failed while reading the SSE endpoint." }
    if (($events -join "`n") -notmatch "catalogue heartbeat") { throw "SSE endpoint did not emit the expected event." }

    Write-Host "OpenAPI $($document.openapi) verified."
    Write-Host "SSE endpoint verified."
}
finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit()
    }
    Remove-Item $outLog, $errLog -ErrorAction SilentlyContinue
}