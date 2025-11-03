# Fix PHP Upload Limits for PDF Processing
# This script updates php.ini to allow larger file uploads

$phpIniPath = 'C:\Program Files\php-8.3.3-Win32-vs16-x64\php.ini'

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Fixing PHP Upload Limits for Large PDFs" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this command:" -ForegroundColor Yellow
    Write-Host "Start-Process powershell -Verb runAs -ArgumentList '-File .\fix-php-upload-limits.ps1'" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Check if php.ini exists
if (-not (Test-Path $phpIniPath)) {
    Write-Host "❌ PHP.ini not found at: $phpIniPath" -ForegroundColor Red
    exit 1
}

Write-Host "Found php.ini at: $phpIniPath" -ForegroundColor Green
Write-Host ""

# Backup php.ini
$backupPath = "$phpIniPath.backup." + (Get-Date -Format "yyyyMMdd-HHmmss")
Write-Host "Creating backup: $backupPath" -ForegroundColor Yellow
Copy-Item $phpIniPath $backupPath
Write-Host "✅ Backup created" -ForegroundColor Green
Write-Host ""

# Read current content
$content = Get-Content $phpIniPath

# Update upload_max_filesize
Write-Host "Updating upload_max_filesize from 2M to 20M..." -ForegroundColor Yellow
$content = $content -replace '^upload_max_filesize\s*=\s*2M', 'upload_max_filesize = 20M'

# Update post_max_size
Write-Host "Updating post_max_size from 8M to 25M..." -ForegroundColor Yellow
$content = $content -replace '^post_max_size\s*=\s*8M', 'post_max_size = 25M'

# Save the updated content
Set-Content -Path $phpIniPath -Value $content

Write-Host "✅ PHP configuration updated!" -ForegroundColor Green
Write-Host ""

# Verify changes
Write-Host "Verifying changes:" -ForegroundColor Yellow
Get-Content $phpIniPath | Select-String -Pattern "upload_max_filesize|post_max_size"
Write-Host ""

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "✅ PHP Upload Limits Fixed!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart the Laravel backend:" -ForegroundColor White
Write-Host "   - Stop the current 'php artisan serve' process" -ForegroundColor Gray
Write-Host "   - Run: cd backend && php artisan serve --port=8001" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Try uploading the Baillifard PDF again (2.3 MB)" -ForegroundColor White
Write-Host ""
Write-Host "New limits:" -ForegroundColor Cyan
Write-Host "  - upload_max_filesize: 20M" -ForegroundColor Green
Write-Host "  - post_max_size: 25M" -ForegroundColor Green
Write-Host ""
