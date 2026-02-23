param()

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Driver = Join-Path $Root "scripts\mergetool-driver.ps1"

$CommandValue = "powershell -ExecutionPolicy Bypass -File `"$Driver`" `"`$BASE`" `"`$LOCAL`" `"`$REMOTE`" `"`$MERGED`""

git config --global merge.tool conflictcraft
git config --global mergetool.conflictcraft.cmd $CommandValue
git config --global mergetool.conflictcraft.trustExitCode true

Write-Host "ConflictCraft global mergetool installed."
