# ConflictCraft VS Code Extension

ConflictCraft helps you resolve Git conflicts with context, structure, and clear reasoning.

Instead of only staring at conflict markers, you get:
- a 4-pane merge view (`Base | Ours | Theirs | Result`)
- deterministic merge suggestions
- explanation of why a suggestion is considered safe
- conflict graph summary

## How It Works

1. C++ engine parses merge content and builds conflict hunks + graph.
2. Python rule engine applies deterministic rules.
3. Extension renders results and lets you apply/undo/save.

No AI guesswork is required for the core flow.

## Quick Start

From the repository root:

```powershell
cmake -S core -B core/build -G "MinGW Makefiles"
cmake --build core/build
python -m pip install -r python_engine/requirements.txt
cd vscode-extension
npm install
npm run compile
code --extensionDevelopmentPath "e:\Zyad\Scripts\Ma projects\ConflictCraft\vscode-extension" "e:\Zyad\Scripts\Ma projects\ConflictCraft"
```

In the Extension Development Host:
1. Open a conflicted file.
2. Run `ConflictCraft: Open Editor`.

## Useful Commands

- `ConflictCraft: Open Editor`
- `ConflictCraft: Resolve Current File`
- `ConflictCraft: Toggle Explain Mode`
- `ConflictCraft: Undo Action`
- `ConflictCraft: Redo Action`

## Settings

- `conflictcraft.coreBinaryPath`
- `conflictcraft.pythonPath`
- `conflictcraft.ruleEnginePath`

Set these if your binaries are not found automatically.

## Example Conflict Files

Use these for testing:
- `testdata/small/sample_import_conflict.js`
- `testdata/small/sample_whitespace_conflict.js`
- `testdata/small/sample_json_conflict.json`
- `testdata/small/sample_function_signature_conflict.js`

## Publishing

This extension is configured for `@vscode/vsce`.

```powershell
cd vscode-extension
npx @vscode/vsce login infiniware
npm run package
npm run publish:patch
```

Before publishing:
- confirm `publisher` in `package.json`
- confirm icon path (`assets/conflictcraft-logo.png`)
- run `npm run compile`

## Full Tutorial

See full project tutorial:
- `../docs/ConflictCraft-Full-Tutorial.md`
