<#
.SYNOPSIS
  Start all development services (llm, frontend, backend, reverb, queue) in separate PowerShell windows on Windows.

USAGE
  From repository root run:
    .\start-dev.ps1

This script will:
  - open a new PowerShell window and start the Python LLM service using uvicorn
    (activating a `.venv` located in the `llm` folder if present)
  - open a new PowerShell window and run `npm run dev` in the `frontend` folder
  - open a new PowerShell window and run `php artisan serve` in the `backend` folder
  - open a new PowerShell window and run `php artisan reverb:start` for WebSocket server
  - open a new PowerShell window and run `php artisan queue:work` for background jobs

Notes:
  - This script is intended for Windows PowerShell. If you use PowerShell Core (pwsh), some
    options may be different.
  - Make sure you have configured Reverb in backend/.env before running
#>

param(
    [switch]$NoNewWindows
)

function Start-WindowedProcess {
    param(
        [string]$Title,
        [string]$ScriptBlock
    )

    if ($NoNewWindows) {
        Write-Host "--- $Title ---"
        Invoke-Expression $ScriptBlock
        return
    }

    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($ScriptBlock))
    Start-Process -FilePath powershell -ArgumentList "-NoExit","-NoProfile","-ExecutionPolicy","Bypass","-EncodedCommand",$encoded -WindowStyle Normal -WorkingDirectory $PWD
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Repository root: $repoRoot"

# 1) Start llm: activate venv if exists and run uvicorn main:app --reload
$llmDir = Join-Path $repoRoot 'llm'
$llmVenvActivate = Join-Path $llmDir 'env\Scripts\Activate.ps1'

$llmCmd = @()
if (Test-Path $llmVenvActivate) {
    $llmCmd += "& '$llmVenvActivate'"
} else {
    # also try a common venv folder name
    $altActivate = Join-Path $llmDir '.venv\Scripts\Activate.ps1'
    if (Test-Path $altActivate) { $llmCmd += "& '$altActivate'" }
}

$llmCmd += "cd '$llmDir'"
$llmCmd += "uvicorn main:app --reload"
$llmScript = $llmCmd -join "; `n"
Start-WindowedProcess -Title 'LLM (uvicorn)' -ScriptBlock $llmScript

# 2) Start frontend: npm run dev
$frontendDir = Join-Path $repoRoot 'frontend'
$frontendScript = "cd '$frontendDir' ; npm run dev"
Start-WindowedProcess -Title 'Frontend (npm run dev)' -ScriptBlock $frontendScript

# 3) Start backend: php artisan serve with increased upload limits
$backendDir = Join-Path $repoRoot 'backend'
$backendScript = "cd '$backendDir' ; php -d upload_max_filesize=20M -d post_max_size=25M artisan serve --port=8001"
Start-WindowedProcess -Title 'Backend (php artisan)' -ScriptBlock $backendScript

# 4) Start Reverb WebSocket server
$reverbScript = "cd '$backendDir' ; php artisan reverb:start"
Start-WindowedProcess -Title 'Reverb (WebSocket)' -ScriptBlock $reverbScript

# 5) Start Queue Worker for background jobs
$queueScript = "cd '$backendDir' ; php artisan queue:work --tries=3"
Start-WindowedProcess -Title 'Queue Worker' -ScriptBlock $queueScript

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Started all dev services!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  1. LLM Service      - http://localhost:8000" -ForegroundColor White
Write-Host "  2. Frontend         - http://localhost:5173" -ForegroundColor White
Write-Host "  3. Backend API      - http://localhost:8001" -ForegroundColor White
Write-Host "  4. Reverb WebSocket - ws://localhost:8080" -ForegroundColor White
Write-Host "  5. Queue Worker     - Processing background jobs" -ForegroundColor White
Write-Host ""
Write-Host "Use the opened windows to view logs." -ForegroundColor Yellow
Write-Host "Press Ctrl+C in each window to stop services." -ForegroundColor Yellow
