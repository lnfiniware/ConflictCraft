param(
  [Parameter(Position=0)]
  [string]$Command,
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$Args
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$CoreBin = Join-Path $BackendDir "bin\win32-x64\conflictcraft_core.exe"
$PythonBin = if ($env:CONFLICTCRAFT_PYTHON) { $env:CONFLICTCRAFT_PYTHON } else { "python3" }
$RuleEngine = Join-Path $BackendDir "python_engine\conflictcraft_rules\main.py"
$RuleConfig = Join-Path $BackendDir "python_engine\rule_configs\default_rules.json"

function Json-Error([string]$Code, [string]$Message, [int]$ExitCode = 64) {
  @{
    ok = $false
    error = @{
      code = $Code
      message = $Message
    }
  } | ConvertTo-Json -Compress | Write-Error
  exit $ExitCode
}

if (-not $Command) {
  Json-Error -Code "missing_command" -Message "usage: conflictcraft.ps1 <analyze|resolve>"
}

switch ($Command) {
  "analyze" {
    & $CoreBin analyze @Args
    exit $LASTEXITCODE
  }
  "resolve" {
    if ($Args.Count -lt 1) {
      Json-Error -Code "missing_path" -Message "resolve requires file path"
    }
    $Target = $Args[0]
    $TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("conflictcraft-backend-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $TempDir | Out-Null
    $AnalysisJson = Join-Path $TempDir "analysis.json"
    $RulesJson = Join-Path $TempDir "rules.json"
    $ResolvedTxt = Join-Path $TempDir "resolved.txt"
    & $CoreBin analyze --conflict-file $Target --out $AnalysisJson --file ([System.IO.Path]::GetFileName($Target))
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $PythonBin $RuleEngine --analysis $AnalysisJson --out $RulesJson --config $RuleConfig --conflict-file $Target --resolved-out $ResolvedTxt
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Get-Content -Raw $ResolvedTxt | Write-Output
    exit 0
  }
  default {
    Json-Error -Code "unknown_command" -Message "unsupported command: $Command"
  }
}

