# ConflictCraft Operations Guide

## Build Matrix
- C++: CMake + C++20
- Python: Python 3.10+
- Extension: Node 22+, npm
- Orchestration: Makefile (`mingw32-make` on Windows if `make` is unavailable)

## Common Commands

### Full Build
- Unix: `make all`
- Windows: `mingw32-make all`

### Test
- Unix: `make test`
- Windows: `mingw32-make test`

### VS Code Extension Dev
- `cd vscode-extension && npm install && npm run compile`

## CLI Usage

### Analyze explicit 3-way inputs
`conflictcraft analyze --base base.txt --ours ours.txt --theirs theirs.txt --file sample.txt --out analysis.json`

### Analyze conflict-marked file
`conflictcraft analyze --conflict-file conflicted.txt --out analysis.json`

### Resolve file
`conflictcraft resolve conflicted.txt --write --explain`

## Git Mergetool Installation

### Linux/macOS
`bash scripts/install-mergetool.sh`

### Windows
`powershell -ExecutionPolicy Bypass -File scripts/install-mergetool.ps1`

## Exit Codes
- `0`: success, file fully resolved
- `2`: partially resolved/manual intervention required
- `1`: fatal error

## History Location
- Default history path: `.git/conflictcraft-history/`
- Each file has deterministic hash-based history filename.

## Troubleshooting
- If Python engine fails, verify `python_engine/requirements.txt` installation.
- If extension cannot launch backend, verify executable paths in extension settings.
- If schema validation fails, compare output against `schemas/*.schema.json`.
