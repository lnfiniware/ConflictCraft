param(
  [string]$InstallDir = ""
)

if (-not $InstallDir) {
  $InstallDir = Join-Path $env:LOCALAPPDATA "Programs\ConflictCraft\bin"
}

$LauncherPs1 = Join-Path $InstallDir "conflictcraft.ps1"
$LauncherCmd = Join-Path $InstallDir "conflictcraft.cmd"

if (Test-Path $LauncherPs1) { Remove-Item -Force $LauncherPs1 }
if (Test-Path $LauncherCmd) { Remove-Item -Force $LauncherCmd }

Write-Host "ConflictCraft: removed launchers from $InstallDir"
Write-Host "If needed, manually remove the path from your user PATH settings."
