param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$Base,
  [Parameter(Mandatory=$true, Position=1)]
  [string]$Local,
  [Parameter(Mandatory=$true, Position=2)]
  [string]$Remote,
  [Parameter(Mandatory=$true, Position=3)]
  [string]$Merged
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$MergedContent = git merge-file -p $Local $Base $Remote
$MergedContent | Set-Content -Encoding UTF8 $Merged

& (Join-Path $Root "scripts\conflictcraft.ps1") resolve $Merged --write
exit $LASTEXITCODE
