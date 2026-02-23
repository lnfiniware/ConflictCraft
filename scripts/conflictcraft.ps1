param(
  [Parameter(Position=0)]
  [string]$Command,

  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$Args
)

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$CoreBin = if ($env:CORE_BIN) { $env:CORE_BIN } else { Join-Path $Root "core\build\conflictcraft_core.exe" }
$PythonBin = if ($env:PYTHON_BIN) { $env:PYTHON_BIN } else { "python" }
$RuleEngine = if ($env:RULE_ENGINE) { $env:RULE_ENGINE } else { Join-Path $Root "python_engine\conflictcraft_rules\main.py" }

if (-not $Command) {
  Write-Host "Usage: conflictcraft.ps1 analyze|resolve ..."
  exit 1
}

switch ($Command) {
  "analyze" {
    & $CoreBin analyze @Args
    exit $LASTEXITCODE
  }

  "resolve" {
    if ($Args.Count -lt 1) {
      Write-Error "resolve requires <file>"
      exit 1
    }

    $TargetFile = $Args[0]
    $WriteMode = $true
    $ExplainMode = $false

    for ($i = 1; $i -lt $Args.Count; $i++) {
      switch ($Args[$i]) {
        "--no-write" { $WriteMode = $false }
        "--write" { $WriteMode = $true }
        "--explain" { $ExplainMode = $true }
      }
    }

    $TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("conflictcraft-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

    $AnalysisJson = Join-Path $TempDir "analysis.json"
    $RulesJson = Join-Path $TempDir "rules.json"
    $ResolvedTxt = Join-Path $TempDir "resolved.txt"

    & $CoreBin analyze --conflict-file $TargetFile --out $AnalysisJson --file ([System.IO.Path]::GetFileName($TargetFile))
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & $PythonBin $RuleEngine --analysis $AnalysisJson --out $RulesJson --conflict-file $TargetFile --resolved-out $ResolvedTxt
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if ($WriteMode) {
      Copy-Item -Force $ResolvedTxt $TargetFile
    }

    if ($ExplainMode) {
      Get-Content -Raw $RulesJson | Write-Host
    }

    $HasConflict = Select-String -Path $ResolvedTxt -Pattern '^<<<<<<<' -Quiet
    if ($HasConflict) {
      Write-Host "ConflictCraft: partial resolution completed; manual action required."
      exit 2
    }

    Write-Host "ConflictCraft: resolution completed."
    exit 0
  }

  default {
    Write-Host "Usage: conflictcraft.ps1 analyze|resolve ..."
    exit 1
  }
}
