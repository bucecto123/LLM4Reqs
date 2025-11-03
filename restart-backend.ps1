# Quick script to restart only the backend with correct PHP settings

Write-Host "Stopping existing Laravel server..." -ForegroundColor Yellow
Get-Process -Name php -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*php*"} | Stop-Process -Force

Write-Host "Starting Laravel backend with upload_max_filesize=20M and post_max_size=25M..." -ForegroundColor Green
cd backend
php -d upload_max_filesize=20M -d post_max_size=25M artisan serve --host=127.0.0.1 --port=8001
