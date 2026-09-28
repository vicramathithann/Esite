$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\vicra\OneDrive\Desktop\VM Mobiles Project Folder.lnk")
$Shortcut.TargetPath = "Z:\Web_Site"
$Shortcut.WorkingDirectory = "Z:\Web_Site"
$Shortcut.Description = "Open VM Mobiles Project Folder on Z: Drive"
$Shortcut.Save()
Write-Output "Folder shortcut created on Desktop!"
