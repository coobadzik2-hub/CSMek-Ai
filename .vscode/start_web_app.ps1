$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
$url = "http://127.0.0.1:8001/"

if (-not (Test-Path $python)) {
    Write-Error "Nie znaleziono lokalnego interpretera Python: $python"
    exit 1
}

$connection = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $connection) {
    Start-Process -FilePath $python `
        -ArgumentList @("-m", "uvicorn", "web_app.server:app", "--host", "0.0.0.0", "--port", "8001") `
        -WorkingDirectory $root `
        -WindowStyle Hidden
}

$deadline = (Get-Date).AddSeconds(30)
do {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1
        if ($response.StatusCode -eq 200) {
            Start-Process $url
            exit 0
        }
    } catch {
    }
    Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)

Write-Error "Nie udalo sie uruchomic strony pod adresem $url"
exit 1