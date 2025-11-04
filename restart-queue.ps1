# Restart Laravel Queue Worker
# This script stops the current queue worker and starts a new one

Write-Host "Restarting Laravel Queue Worker..." -ForegroundColor Cyan

# Navigate to backend directory
Set-Location -Path "D:\Study\Home_work\COS40005\LLM4Reqs\backend"

# Stop all PHP queue workers
Write-Host "Stopping existing queue workers..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "php"} | ForEach-Object {
    try {
        Stop-Process -Id $_.Id -Force
        Write-Host "  Stopped process $($_.Id)" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to stop process $($_.Id)" -ForegroundColor Red
    }
}

# Wait a moment for processes to terminate
Start-Sleep -Seconds 2

# Start the queue worker
Write-Host "Starting new queue worker..." -ForegroundColor Yellow
$command = "cd 'D:\Study\Home_work\COS40005\LLM4Reqs\backend'; php artisan queue:work --tries=3 --timeout=300"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $command -WindowStyle Normal

Write-Host ""
Write-Host "Queue worker restarted successfully!" -ForegroundColor Green
Write-Host "The new queue worker is running in a separate window." -ForegroundColor Cyan
Write-Host ""
