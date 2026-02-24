# ConflictCraft

ConflictCraft is a deterministic Git conflict visualizer and resolution engine.

## Full Tutorial
- `docs/ConflictCraft-Full-Tutorial.md`

## Stack
- C++: core parser, diff3-style hunk analysis, graph generation
- Python: deterministic smart rules and explanations
- TypeScript/JavaScript: VS Code extension and 4-pane webview UI
- JSON: schema contracts between layers
- Shell/PowerShell: CLI and Git mergetool integration

## Repository Layout
- `core/` C++ engine
- `python_engine/` smart rule engine
- `vscode-extension/` VS Code extension
- `schemas/` strict JSON contracts
- `scripts/` CLI + git integration
- `docs/` architecture and operations

## Quick Start

### Build core
Unix:
```bash
make core
```
Windows:
```powershell
mingw32-make core
```

### Run tests
Unix:
```bash
make test
```
Windows:
```powershell
mingw32-make test
```

### Resolve a conflicted file
Unix:
```bash
./scripts/conflictcraft resolve path/to/conflicted.file --write
```
Windows:
```powershell
./scripts/conflictcraft.ps1 resolve path\to\conflicted.file --write
```

### Install ConflictCraft as a device command
Unix:
```bash
bash scripts/install-device.sh
conflictcraft doctor
```
Windows:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-device.ps1
conflictcraft doctor
```

### New CLI commands
Unix:
```bash
bash scripts/conflictcraft help
```
Windows:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 help
```

Key commands:
- `doctor`
- `scan [path]`
- `rules`
- `samples list`
- `samples run <import|whitespace|json|signature> [--no-write] [--explain]`
- `resolve <file> [--write|--no-write] [--explain]`
- `resolve-all <path> [--write|--no-write] [--explain]`
- `git-setup`
- `git-resolve [--write|--no-write] [--explain]`
- `install`
- `uninstall`

### VS Code extension
```bash
cd vscode-extension
npm install
npm run compile
```

## Git Mergetool (global)
Unix:
```bash
bash scripts/install-mergetool.sh
```
Windows:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-mergetool.ps1
```

Global command uninstall:
Unix:
```bash
bash scripts/uninstall-device.sh
```
Windows:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/uninstall-device.ps1
```
