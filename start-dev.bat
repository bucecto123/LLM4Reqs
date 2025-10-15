@echo off
REM Convenience wrapper to run the PowerShell script from cmd or Explorer on Windows
SETLOCAL
SET script=%~dp0start-dev.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%script%"
ENDLOCAL
