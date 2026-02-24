param(
  [Parameter(Position=0)]
  [string]$Command,

  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$Args
)

$ErrorActionPreference = "Stop"

$CliVersion = "0.5.0"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreBin = if ($env:CORE_BIN) { $env:CORE_BIN } else { Join-Path $Root "core\build\conflictcraft_core.exe" }
$PythonBin = if ($env:PYTHON_BIN) {
  $env:PYTHON_BIN
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
  "python3"
} else {
  "python"
}
$RuleEngine = if ($env:RULE_ENGINE) { $env:RULE_ENGINE } else { Join-Path $Root "python_engine\conflictcraft_rules\main.py" }
$RuleConfig = if ($env:RULE_CONFIG) { $env:RULE_CONFIG } else { Join-Path $Root "python_engine\rule_configs\default_rules.json" }
$SampleDir = Join-Path $Root "testdata\small"

$Samples = @{
  "import" = "sample_import_conflict.js"
  "whitespace" = "sample_whitespace_conflict.js"
  "json" = "sample_json_conflict.json"
  "signature" = "sample_function_signature_conflict.js"
}

function Show-Usage {
  @"
ConflictCraft CLI v$CliVersion

Usage:
  conflictcraft.ps1 help
  conflictcraft.ps1 version
  conflictcraft.ps1 setup [--backend-only]
  conflictcraft.ps1 config
  conflictcraft.ps1 doctor
  conflictcraft.ps1 rules
  conflictcraft.ps1 scan [path]
  conflictcraft.ps1 git-setup
  conflictcraft.ps1 git-resolve [--write|--no-write] [--explain]
  conflictcraft.ps1 samples list
  conflictcraft.ps1 samples run <sample-name> [--write|--no-write] [--explain]
  conflictcraft.ps1 analyze <core-analyze-args>
  conflictcraft.ps1 core-merge <core-merge-args>
  conflictcraft.ps1 resolve <file> [--write|--no-write] [--explain]
  conflictcraft.ps1 explain <file>
  conflictcraft.ps1 resolve-all <path> [--write|--no-write] [--explain]
  conflictcraft.ps1 install [install-script-options]
  conflictcraft.ps1 uninstall [uninstall-script-options]

Sample names:
  import, whitespace, json, signature
"@
}

function Write-JsonError([string]$Code, [string]$Message, [int]$ExitCode = 1) {
  $payload = @{
    ok = $false
    error = @{
      code = $Code
      message = $Message
    }
  } | ConvertTo-Json -Compress
  [Console]::Error.WriteLine($payload)
  exit $ExitCode
}

function Require-File([string]$Path, [string]$Label) {
  if (-not (Test-Path $Path)) {
    throw "$Label not found: $Path"
  }
}

function Resolve-File([string]$TargetFile, [string[]]$ResolveArgs) {
  if (-not (Test-Path $TargetFile)) {
    throw "file not found: $TargetFile"
  }

  Require-File $CoreBin "core binary"
  Require-File $RuleEngine "rule engine"

  $WriteMode = $true
  $ExplainMode = $false

  foreach ($arg in $ResolveArgs) {
    switch ($arg) {
      "--no-write" { $WriteMode = $false }
      "--write" { $WriteMode = $true }
      "--explain" { $ExplainMode = $true }
      default { throw "unknown resolve option: $arg" }
    }
  }

  $TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("conflictcraft-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

  $AnalysisJson = Join-Path $TempDir "analysis.json"
  $RulesJson = Join-Path $TempDir "rules.json"
  $ResolvedTxt = Join-Path $TempDir "resolved.txt"

  & $CoreBin analyze --conflict-file $TargetFile --out $AnalysisJson --file ([System.IO.Path]::GetFileName($TargetFile))
  if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }

  & $PythonBin $RuleEngine --analysis $AnalysisJson --out $RulesJson --conflict-file $TargetFile --resolved-out $ResolvedTxt
  if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }

  if ($WriteMode) {
    Copy-Item -Force $ResolvedTxt $TargetFile
  }

  if ($ExplainMode) {
    Get-Content -Raw $RulesJson | Write-Host
  }

  $HasConflict = Select-String -Path $ResolvedTxt -Pattern '^<<<<<<<' -Quiet
  if ($HasConflict) {
    Write-Host "ConflictCraft: partial resolution completed for $TargetFile; manual action required."
    return 2
  }

  Write-Host "ConflictCraft: resolution completed for $TargetFile."
  return 0
}

function Show-Config {
  @"
ConflictCraft configuration:
  root_dir:      $Root
  core_binary:   $CoreBin
  python_bin:    $PythonBin
  rule_engine:   $RuleEngine
  rule_config:   $RuleConfig
  sample_dir:    $SampleDir
"@
}

function Invoke-Setup([string[]]$SetupArgs) {
  $BackendOnly = $false
  foreach ($arg in $SetupArgs) {
    switch ($arg) {
      "--backend-only" { $BackendOnly = $true }
      default { throw "unknown setup option: $arg" }
    }
  }

  if ($IsWindows) {
    cmake -S (Join-Path $Root "core") -B (Join-Path $Root "core\build") -G "MinGW Makefiles"
  } else {
    cmake -S (Join-Path $Root "core") -B (Join-Path $Root "core\build")
  }
  if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }

  cmake --build (Join-Path $Root "core\build")
  if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }

  & $PythonBin -m pip install -r (Join-Path $Root "python_engine\requirements.txt")
  if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }

  if (-not $BackendOnly) {
    Push-Location (Join-Path $Root "vscode-extension")
    try {
      npm install
      if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }
      npm run compile
      if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }
    } finally {
      Pop-Location
    }
  }

  Write-Host "ConflictCraft: setup completed."
  return 0
}

function Invoke-Doctor {
  $Failures = 0

  Write-Host "ConflictCraft doctor report"
  Write-Host "-------------------------"

  try {
    $gitVersion = git --version
    Write-Host "[ok] git found: $gitVersion"
  } catch {
    Write-Host "[fail] git not found in PATH"
    $Failures++
  }

  if (Test-Path $CoreBin) {
    Write-Host "[ok] core binary found: $CoreBin"
  } else {
    Write-Host "[fail] core binary missing: $CoreBin"
    $Failures++
  }

  try {
    & $PythonBin --version | Out-Null
    Write-Host "[ok] python found: $PythonBin"
  } catch {
    Write-Host "[fail] python command missing: $PythonBin"
    $Failures++
  }

  if (Test-Path $RuleEngine) {
    Write-Host "[ok] rule engine found: $RuleEngine"
  } else {
    Write-Host "[fail] rule engine missing: $RuleEngine"
    $Failures++
  }

  if (Test-Path $RuleConfig) {
    Write-Host "[ok] rule config found: $RuleConfig"
  } else {
    Write-Host "[fail] rule config missing: $RuleConfig"
    $Failures++
  }

  if (Test-Path $SampleDir) {
    $sampleCount = (Get-ChildItem -Path $SampleDir -File).Count
    Write-Host "[ok] sample directory found ($sampleCount files): $SampleDir"
  } else {
    Write-Host "[fail] sample directory missing: $SampleDir"
    $Failures++
  }

  if ($Failures -gt 0) {
    Write-Host "Doctor result: $Failures issue(s) found."
    return 1
  }

  Write-Host "Doctor result: all checks passed."
  return 0
}

function Show-Rules {
  @"
Deterministic rules in this build:
  - whitespace_ignore
  - import_block_merge
  - json_key_merge
  - function_signature_conflict
"@
}

function Show-Samples {
  @"
Built-in sample files:
  import      -> testdata/small/$($Samples['import'])
  whitespace  -> testdata/small/$($Samples['whitespace'])
  json        -> testdata/small/$($Samples['json'])
  signature   -> testdata/small/$($Samples['signature'])
"@
}

function Get-ConflictFiles([string]$PathToScan) {
  Get-ChildItem -Path $PathToScan -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\.git\\' } |
    Where-Object {
      Select-String -Path $_.FullName -Pattern '^<<<<<<<' -Quiet
    }
}

function Resolve-All([string]$PathToScan, [string[]]$ResolveArgs) {
  if (-not (Test-Path $PathToScan)) {
    throw "path not found: $PathToScan"
  }

  $WriteArgs = @("--no-write")
  $ExplainArgs = @()

  foreach ($arg in $ResolveArgs) {
    switch ($arg) {
      "--write" { $WriteArgs = @("--write") }
      "--no-write" { $WriteArgs = @("--no-write") }
      "--explain" { $ExplainArgs = @("--explain") }
      default { throw "unknown resolve-all option: $arg" }
    }
  }

  $files = Get-ConflictFiles -PathToScan $PathToScan

  if (-not $files) {
    Write-Host "ConflictCraft: no conflict markers found under: $PathToScan"
    return 0
  }

  $resolved = 0
  $partial = 0

  foreach ($file in $files) {
    $rc = Resolve-File -TargetFile $file.FullName -ResolveArgs ($WriteArgs + $ExplainArgs)
    if ($rc -eq 0) {
      $resolved++
    } elseif ($rc -eq 2) {
      $partial++
    } else {
      return $rc
    }
  }

  Write-Host "ConflictCraft: resolve-all summary: resolved=$resolved partial=$partial total=$($files.Count)"
  if ($partial -gt 0) { return 2 }
  return 0
}

function Scan-Conflicts([string]$PathToScan) {
  if (-not (Test-Path $PathToScan)) {
    throw "path not found: $PathToScan"
  }

  $files = Get-ConflictFiles -PathToScan $PathToScan
  if (-not $files) {
    Write-Host "ConflictCraft: no conflict markers found under: $PathToScan"
    return 0
  }

  Write-Host "Conflict files ($($files.Count)):"
  foreach ($file in $files) {
    Write-Host "  $($file.FullName)"
  }

  return 0
}

function Git-Setup {
  $script = Join-Path $ScriptDir "install-mergetool.ps1"
  & $script
  return $LASTEXITCODE
}

function Git-Resolve([string[]]$ResolveArgs) {
  $WriteArgs = @("--no-write")
  $ExplainArgs = @()

  foreach ($arg in $ResolveArgs) {
    switch ($arg) {
      "--write" { $WriteArgs = @("--write") }
      "--no-write" { $WriteArgs = @("--no-write") }
      "--explain" { $ExplainArgs = @("--explain") }
      default { throw "unknown git-resolve option: $arg" }
    }
  }

  try {
    $null = git --version
  } catch {
    throw "git not found in PATH"
  }

  $null = git rev-parse --is-inside-work-tree 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "not inside a git repository"
  }

  $files = @(git diff --name-only --diff-filter=U)
  if (-not $files -or $files.Count -eq 0) {
    Write-Host "ConflictCraft: no unmerged files found in git index."
    return 0
  }

  $resolved = 0
  $partial = 0
  $missing = 0

  foreach ($file in $files) {
    if (-not (Test-Path $file)) {
      Write-Warning "ConflictCraft: skipping missing path from git index: $file"
      $missing++
      continue
    }

    $rc = Resolve-File -TargetFile $file -ResolveArgs ($WriteArgs + $ExplainArgs)
    if ($rc -eq 0) {
      $resolved++
    } elseif ($rc -eq 2) {
      $partial++
    } else {
      return $rc
    }
  }

  Write-Host "ConflictCraft: git-resolve summary: resolved=$resolved partial=$partial missing=$missing total=$($files.Count)"
  if ($partial -gt 0) { return 2 }
  return 0
}

if (-not $Command) {
  [Console]::Error.WriteLine((Show-Usage))
  Write-JsonError -Code "missing_command" -Message "a command is required" -ExitCode 64
}

try {
  switch ($Command) {
    "help" {
      Show-Usage
      exit 0
    }

    "version" {
      Write-Host "ConflictCraft CLI v$CliVersion"
      exit 0
    }

    "setup" {
      exit (Invoke-Setup -SetupArgs $Args)
    }

    "config" {
      Show-Config
      exit 0
    }

    "doctor" {
      exit (Invoke-Doctor)
    }

    "rules" {
      Show-Rules
      exit 0
    }

    "scan" {
      $targetPath = if ($Args.Count -gt 0) { $Args[0] } else { "." }
      exit (Scan-Conflicts -PathToScan $targetPath)
    }

    "git-setup" {
      exit (Git-Setup)
    }

    "git-resolve" {
      exit (Git-Resolve -ResolveArgs $Args)
    }

    "samples" {
      $sub = if ($Args.Count -gt 0) { $Args[0] } else { "list" }
      $remaining = if ($Args.Count -gt 1) { $Args[1..($Args.Count - 1)] } else { @() }

      switch ($sub) {
        "list" {
          Show-Samples
          exit 0
        }
        "run" {
          if ($remaining.Count -lt 1) {
            throw "samples run requires a sample name"
          }
          $name = $remaining[0]
          if (-not $Samples.ContainsKey($name)) {
            throw "unknown sample: $name"
          }
          $path = Join-Path $SampleDir $Samples[$name]
          $extra = if ($remaining.Count -gt 1) { $remaining[1..($remaining.Count - 1)] } else { @() }
          exit (Resolve-File -TargetFile $path -ResolveArgs $extra)
        }
        default {
          throw "unknown samples subcommand: $sub"
        }
      }
    }

    "analyze" {
      Require-File $CoreBin "core binary"
      & $CoreBin analyze @Args
      exit $LASTEXITCODE
    }

    "core-merge" {
      Require-File $CoreBin "core binary"
      & $CoreBin merge @Args
      exit $LASTEXITCODE
    }

    "resolve" {
      if ($Args.Count -lt 1) { throw "resolve requires <file>" }
      $target = $Args[0]
      $extra = if ($Args.Count -gt 1) { $Args[1..($Args.Count - 1)] } else { @() }
      exit (Resolve-File -TargetFile $target -ResolveArgs $extra)
    }

    "explain" {
      if ($Args.Count -lt 1) { throw "explain requires <file>" }
      $target = $Args[0]
      $extra = if ($Args.Count -gt 1) { $Args[1..($Args.Count - 1)] } else { @() }
      exit (Resolve-File -TargetFile $target -ResolveArgs (@("--no-write", "--explain") + $extra))
    }

    "resolve-all" {
      $targetPath = if ($Args.Count -gt 0 -and -not $Args[0].StartsWith("--")) { $Args[0] } else { "." }
      $extra = if ($Args.Count -gt 1 -and -not $Args[0].StartsWith("--")) { $Args[1..($Args.Count - 1)] } elseif ($Args.Count -gt 0 -and -not $Args[0].StartsWith("--")) { @() } else { $Args }
      exit (Resolve-All -PathToScan $targetPath -ResolveArgs $extra)
    }

    "install" {
      & (Join-Path $ScriptDir "install-device.ps1") @Args
      exit $LASTEXITCODE
    }

    "uninstall" {
      & (Join-Path $ScriptDir "uninstall-device.ps1") @Args
      exit $LASTEXITCODE
    }

    default {
      throw "unknown command: $Command"
    }
  }
} catch {
  $message = $_.Exception.Message
  $code = "runtime_error"
  $exitCode = 1
  if ($message -match "requires <file>|unknown .*option|unknown .*subcommand|unknown command|sample name") {
    $code = "invalid_argument"
    $exitCode = 64
  } elseif ($message -match "not found|path not found|file not found") {
    $code = "file_not_found"
    $exitCode = 66
  }
  Write-JsonError -Code $code -Message $message -ExitCode $exitCode
}
