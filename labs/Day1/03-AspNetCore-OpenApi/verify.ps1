param(
    [ValidateSet("start", "solution")]
    [string]$Project = "solution"
)

$ErrorActionPreference = "Stop"
$labRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Join-Path $labRoot $Project
$port = 5103
$outLog = Join-Path $labRoot "verify-$Project.out.log"
$errLog = Join-Path $labRoot "verify-$Project.err.log"
Remove-Item $outLog, $errLog -ErrorAction SilentlyContinue

$process = Start-Process -FilePath "dotnet" -ArgumentList "run --no-launch-profile -- --urls http://127.0.0.1:$port" -WorkingDirectory $projectPath -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog -NoNewWindow
try {
    $openApiUrl = "http://127.0.0.1:$port/openapi/v1.json"
    $eventsUrl = "http://127.0.0.1:$port/catalogue/events"
    $documentText = $null

    for ($attempt = 1; $attempt -le 40; $attempt++) {
        try {
            $documentText = (& curl.exe -fsS $openApiUrl 2>$null) -join "`n"
            if ($LASTEXITCODE -eq 0 -and $documentText) { break }
        }
        catch { }
        Start-Sleep -Milliseconds 250
    }

    if (-not $documentText) { throw "OpenAPI document was not served." }
    $document = $documentText | ConvertFrom-Json
    if ($document.openapi -notmatch "^3\.1\.") { throw "Expected OpenAPI 3.1, got '$($document.openapi)'." }
    if ($documentText -notmatch "Create a catalogue item") { throw "XML summary text was not present in the OpenAPI document." }

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
