param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$Args
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
& (Join-Path $Root "scripts\conflictcraft.ps1") analyze @Args
exit $LASTEXITCODE
