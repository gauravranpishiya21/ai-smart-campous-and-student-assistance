@echo off
title CornerStone Smart Education ERP - Stopper
cd /d "%~dp0"

echo ==============================================================
echo       Stopping CornerStone Backend and Frontend Servers
echo ==============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5000, 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Write-Host '[OK] Servers on ports 5000 and 3000 have been stopped.'"

echo.
pause
