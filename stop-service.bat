@echo off
title Stop VM Mobiles Service
echo ===================================================
echo   Stopping VM Mobiles Background Service...
echo ===================================================

echo Stopping Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe >nul 2>&1

echo Stopping Web Server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping any active service runners...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'service-runner.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo.
echo ===================================================
echo   VM Mobiles Service has been fully stopped!
echo ===================================================
ping -n 2 127.0.0.1 >nul
