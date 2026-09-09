$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "CycloConnect.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$TargetExe = Join-Path $PSScriptRoot "release\win-unpacked\CycloConnect.exe"

if (Test-Path $TargetExe) {
    $Shortcut.TargetPath = $TargetExe
    $Shortcut.WorkingDirectory = Split-Path $TargetExe
    $Shortcut.IconLocation = "$TargetExe,0"
} else {
    $Shortcut.TargetPath = Join-Path $PSScriptRoot "Launch-CycloConnect.bat"
    $Shortcut.WorkingDirectory = $PSScriptRoot
}

$Shortcut.Description = "CycloConnect - Mio Cyclo GPS Hub & Tactical Route Manager"
$Shortcut.Save()

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Success! Desktop shortcut created for CycloConnect:" -ForegroundColor Green
Write-Host "  $ShortcutPath" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
