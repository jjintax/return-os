@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "$startup = Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs\\Startup'; Copy-Item -LiteralPath '%~dp0start_return_os_hidden.vbs' -Destination (Join-Path $startup 'Return OS.vbs') -Force"
echo Return OS startup installed.
