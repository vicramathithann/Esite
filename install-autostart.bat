@echo off
title Install VM Mobiles Autostart
cd /d "%~dp0"
set "TARGET=%~dp0start-hidden.vbs"
set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\VMMobiles.lnk"

powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT%');$s.TargetPath='%TARGET%';$s.WorkingDirectory='%~dp0';$s.Save()"

echo ========================================================
echo   Auto-Start Enabled from Z:\Web_Site!
echo ========================================================
echo VM Mobiles will now start automatically whenever your
echo computer boots up, even without opening any apps!
echo ========================================================
pause
