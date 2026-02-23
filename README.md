# ConflictCraft

ConflictCraft is a deterministic Git conflict visualizer and resolution engine.

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
