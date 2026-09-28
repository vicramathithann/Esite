@echo off
title VM Mobiles Service Runner
cd /d "%~dp0"
echo ===================================================
echo   Starting VM Mobiles Server and Internet Tunnel
echo ===================================================
echo This service keeps your site online on the internet.
echo You can minimize this window or run start-hidden.vbs
echo to run it silently in the background!
echo ===================================================
node scripts/service-runner.js
pause
