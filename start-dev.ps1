<#
.SYNOPSIS
  Start all development services (llm, frontend, backend) in separate PowerShell windows on Windows.

USAGE
  From repository root run:
    .\start-dev.ps1

This script will:
  - open a new PowerShell window and start the Python LLm service using uvicorn
    (activating a `.venv` located in the `llm` folder if present)
  - open a new PowerShell window and run `npm run dev` in the `frontend` folder
  - open a new PowerShell window and run `php artisan serve` in the `backend` folder

Notes:
  - This script is intended for Windows PowerShell. If you use PowerShell Core (pwsh), some
    options may be different.
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
$llmVenvActivate = Join-Path $llmDir '.venv\Scripts\Activate.ps1'

$llmCmd = @()
if (Test-Path $llmVenvActivate) {
    $llmCmd += "& '$llmVenvActivate'"
} else {
    # also try a common venv folder name
    $altActivate = Join-Path $llmDir 'venv\Scripts\Activate.ps1'
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

# 3) Start backend: php artisan serve
$backendDir = Join-Path $repoRoot 'backend'
$backendScript = "cd '$backendDir' ; php artisan serve --port=8001"
Start-WindowedProcess -Title 'Backend (php artisan)' -ScriptBlock $backendScript

Write-Host "Started dev services. Use the opened windows to view logs."
