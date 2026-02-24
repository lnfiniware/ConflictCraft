param(
  [string]$InstallDir = ""
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SourceScript = Join-Path $Root "scripts\conflictcraft.ps1"

if (-not $InstallDir) {
  $InstallDir = Join-Path $env:LOCALAPPDATA "Programs\ConflictCraft\bin"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$LauncherPs1 = Join-Path $InstallDir "conflictcraft.ps1"
$LauncherCmd = Join-Path $InstallDir "conflictcraft.cmd"

@"
param(
  [Parameter(ValueFromRemainingArguments=`$true)]
  [string[]]`$Args
)
& `"$SourceScript`" @Args
exit `$LASTEXITCODE
"@ | Set-Content -Encoding UTF8 $LauncherPs1

@"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "$SourceScript" %*
"@ | Set-Content -Encoding ASCII $LauncherCmd

$CurrentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentUserPath -notlike "*$InstallDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$CurrentUserPath;$InstallDir", "User")
  Write-Host "ConflictCraft: added $InstallDir to user PATH"
} else {
  Write-Host "ConflictCraft: install path already in user PATH"
}

Write-Host "ConflictCraft: installed launchers:"
Write-Host "  $LauncherPs1"
Write-Host "  $LauncherCmd"
Write-Host "Restart terminal to use 'conflictcraft' directly."
