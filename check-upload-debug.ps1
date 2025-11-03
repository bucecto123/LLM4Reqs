# Quick diagnostic - run after upload attempt
Write-Host "Last 5 upload attempts:" -ForegroundColor Cyan
Write-Host ""
Get-Content "backend\storage\logs\laravel.log" | Select-String -Pattern "Document upload request received" -Context 0,10 | Select-Object -Last 1
