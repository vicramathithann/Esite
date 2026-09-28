@echo off
title VM Mobiles Status Checker
cd /d "%~dp0"
cls
echo ============================================================
echo           VM MOBILES - LIVE STATUS CHECKER
echo ============================================================
echo.

set SERVER_RUNNING=NO
set TUNNEL_RUNNING=NO

for /f %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    set SERVER_RUNNING=YES
)

tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul
if not errorlevel 1 (
    set TUNNEL_RUNNING=YES
)

echo [1] Next.js Server (Port 3000) : %SERVER_RUNNING%
echo [2] Cloudflare Tunnel Process  : %TUNNEL_RUNNING%
echo.

if exist "ONLINE_URL.txt" (
    type ONLINE_URL.txt
) else (
    echo ONLINE_URL.txt not found yet. The service may still be initializing.
)

echo.
echo ============================================================
echo Options:
echo   [O] Open Website in Browser
echo   [S] Start / Restart Background Service
echo   [K] Kill / Stop Service
echo   [Q] Quit
echo ============================================================
choice /C OSKQ /N /M "Choose an option [O, S, K, Q]: "

if errorlevel 4 goto end
if errorlevel 3 goto stop
if errorlevel 2 goto start
if errorlevel 1 goto open

:open
if exist "ONLINE_URL.txt" (
    for /f "tokens=2 delims=:" %%u in ('findstr "Public Web Link:" ONLINE_URL.txt') do (
        start https:%%u
        goto end
    )
)
start http://localhost:3000
goto end

:start
echo Starting service in background...
start "" wscript.exe "C:\Users\vicra\.gemini\antigravity\scratch\novamobile\start-hidden.vbs"
echo Service started! Wait 10 seconds and re-run this tool.
timeout /t 3 >nul
goto end

:stop
call stop-service.bat
goto end

:end
