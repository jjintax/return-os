@echo off
cd /d "%~dp0"
set PORT=4181
set PS_SCRIPT=%~dp0run_return_os.ps1
set VBS_SCRIPT=%~dp0start_return_os_hidden.vbs

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue)) { Start-Process wscript.exe -ArgumentList '\"%VBS_SCRIPT%\"' -WindowStyle Hidden }"
timeout /t 2 /nobreak >nul
start "" http://localhost:%PORT%
