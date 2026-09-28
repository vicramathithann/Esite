
$wsh = New-Object -COM WScript.Shell

# 1. Startup Shortcut (so it boots silently with Windows)
$startupLink = 'C:\\Users\\vicra\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\VMMobiles.lnk'
$sc1 = $wsh.CreateShortcut($startupLink)
$sc1.TargetPath = 'wscript.exe'
$sc1.Arguments = '"C:\\Users\\vicra\\.gemini\\antigravity\\scratch\\novamobile\\start-hidden.vbs"'
$sc1.WorkingDirectory = 'C:\\Users\\vicra\\.gemini\\antigravity\\scratch\\novamobile'
$sc1.Description = 'Start VM Mobiles Online Store on Windows Startup'
$sc1.Save()

# 2. Desktop Shortcut - Start VM Mobiles
$desktopLink1 = 'C:\\Users\\vicra\\OneDrive\\Desktop\\Start VM Mobiles.lnk'
$sc2 = $wsh.CreateShortcut($desktopLink1)
$sc2.TargetPath = 'wscript.exe'
$sc2.Arguments = '"C:\\Users\\vicra\\.gemini\\antigravity\\scratch\\novamobile\\start-hidden.vbs"'
$sc2.WorkingDirectory = 'C:\\Users\\vicra\\.gemini\\antigravity\\scratch\\novamobile'
$sc2.Description = 'Start VM Mobiles background service'
$sc2.IconLocation = 'shell32.dll,137'
$sc2.Save()

# 3. Desktop Shortcut - Stop VM Mobiles
$desktopLink2 = 'C:\\Users\\vicra\\OneDrive\\Desktop\\Stop VM Mobiles.lnk'
$sc3 = $wsh.CreateShortcut($desktopLink2)
$sc3.TargetPath = 'C:\\Users\\vicra\\.gemini\\antigravity\\scratch\\novamobile\\stop-service.bat'
$sc3.WorkingDirectory = 'C:\\Users\\vicra\\.gemini\\antigravity\\scratch\\novamobile'
$sc3.Description = 'Stop VM Mobiles background service'
$sc3.IconLocation = 'shell32.dll,131'
$sc3.Save()

# 4. Desktop Shortcut - Check Status
$desktopLink3 = 'C:\\Users\\vicra\\OneDrive\\Desktop\\Check VM Mobiles Status.lnk'
$sc4 = $wsh.CreateShortcut($desktopLink3)
$sc4.TargetPath = 'C:\\Users\\vicra\\.gemini\\antigravity\\scratch\\novamobile\\CHECK_STATUS.bat'
$sc4.WorkingDirectory = 'C:\\Users\\vicra\\.gemini\\antigravity\\scratch\\novamobile'
$sc4.Description = 'Check VM Mobiles Status and Open in Browser'
$sc4.IconLocation = 'shell32.dll,165'
$sc4.Save()

Write-Host "All shortcuts created successfully!"
