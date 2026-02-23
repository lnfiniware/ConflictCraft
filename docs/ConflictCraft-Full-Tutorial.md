# ConflictCraft Full Tutorial

This guide explains what ConflictCraft does, how to use it day to day, and how to publish the VS Code extension.

If you are opening this for the first time, read it top to bottom once, then keep it as your working checklist.

## 1) What ConflictCraft Actually Does

ConflictCraft is a deterministic merge assistant.

Instead of only showing raw Git conflict markers, it:
- Parses the 3-way merge context (`base`, `ours`, `theirs`)
- Splits changes into hunks
- Builds a conflict graph
- Applies deterministic resolution rules
- Explains why each suggestion is safe (or not safe)

Current rules in this repo:
- Whitespace-only differences
- Import block merge
- JSON key merge (non-overlapping keys)
- Function signature conflict detection (manual required)

What it is not:
- Not an AI autocomplete tool
- Not a blind auto-merge that writes risky edits
- Not a replacement for review when conflict semantics are ambiguous

## 2) Project Layers (Mental Model)

- `core/` (C++): parsing, hunking, graph, analysis JSON
- `python_engine/` (Python): deterministic rule suggestions + explanations
- `vscode-extension/` (TypeScript/JS): 4-pane UI and user workflow
- `scripts/` (PowerShell/Shell): CLI and Git mergetool integration
- `schemas/` (JSON): contracts across components

Use this model when debugging:
1. If parsing looks wrong -> check C++ output first.
2. If suggestions look wrong -> check Python rule result.
3. If UI looks wrong but JSON is correct -> check webview layer.

## 3) First Run (Windows)

From repo root:

```powershell
cmake -S core -B core/build -G "MinGW Makefiles"
cmake --build core/build
python -m pip install -r python_engine/requirements.txt
cd vscode-extension
npm install
npm run compile
cd ..
```

Launch extension dev host:

```powershell
code --extensionDevelopmentPath "the path of the extension" "your project path"
```

## 4) Ready-to-Run Example Files

These are included in `testdata/small/`:

- `sample_import_conflict.js` -> should trigger `import_block_merge`
- `sample_whitespace_conflict.js` -> should trigger `whitespace_ignore`
- `sample_json_conflict.json` -> should trigger `json_key_merge`
- `sample_function_signature_conflict.js` -> should trigger `function_signature_conflict` (manual required)

CLI quick checks:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve testdata/small/sample_import_conflict.js --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve testdata/small/sample_whitespace_conflict.js --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve testdata/small/sample_json_conflict.json --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve testdata/small/sample_function_signature_conflict.js --no-write --explain
```

## 5) Using the VS Code Editor Workflow

1. Open one of the sample conflict files.
2. Run command palette: `ConflictCraft: Open Editor`.
3. Read four panes:
- Base
- Ours
- Theirs
- Result
4. Review suggestions list.
5. Apply safe suggestions.
6. Use undo/redo when needed.
7. Save the final result.

Tip: keep Explain mode open while learning. It teaches why a rule fired.

## 6) Using ConflictCraft in Normal Git Flow

Install as global mergetool:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-mergetool.ps1
```

When a merge conflict happens:

```powershell
git mergetool
```

Or resolve specific file directly:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve path\to\conflicted.file --write --explain
```

Then finish merge as normal:

```powershell
git add .
git commit -m "resolve merge conflict"
```

## 7) How to Read the Output

When you run `--explain`, watch these fields:
- `rule_id`: which deterministic rule handled the hunk
- `safe_to_apply`: whether auto-apply is allowed
- `confidence`: numeric confidence from rule
- `why_suggestion_valid`: plain-language reason
- `summary`: resolved vs manual hunks

Manual-required output is not failure. It means ConflictCraft protected you from a risky automatic merge.

## 8) Publishing to VS Code Marketplace

This repo is now prepared with:
- extension icon at `vscode-extension/assets/conflictcraft-logo.png`
- publishing scripts in `vscode-extension/package.json`
- packaging ignore rules in `vscode-extension/.vscodeignore`

### 8.1 Prerequisites

1. A Microsoft/Azure account
2. A VS Code Marketplace publisher
3. A Personal Access Token (PAT) with Marketplace publish rights
4. Node/npm installed

Official references:
- https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- https://marketplace.visualstudio.com/manage

### 8.2 Verify metadata before publish

Open `vscode-extension/package.json` and confirm:
- `name`
- `displayName`
- `publisher`
- `version`
- `description`
- `icon`

Important: `publisher` must exactly match your Marketplace publisher ID.

### 8.3 Login and package

From `vscode-extension/`:

```powershell
npx @vscode/vsce login infiniware
npm run package
```

This creates a `.vsix` package.

### 8.4 Local install test (recommended)

```powershell
code --install-extension .\conflictcraft-vscode-0.1.0.vsix
```

Test commands in a normal VS Code window before public publish.

### 8.5 Publish

Patch release:

```powershell
npm run publish:patch
```

Minor release:

```powershell
npm run publish:minor
```

Major release:

```powershell
npm run publish:major
```

## 9) Suggested Release Checklist

Before each publish:
- `npm run compile` (extension)
- C++ tests pass (`ctest`)
- Python tests pass (`pytest`)
- At least one full manual conflict run in VS Code UI
- Version bump is intentional
- CHANGELOG entry exists (recommended)

## 10) Troubleshooting

### Command palette shows no ConflictCraft commands
- Reload Extension Development Host (`Developer: Reload Window`)
- Confirm extension is running in `Developer: Show Running Extensions`

### Editor opens but no content
- Check `conflictcraft.coreBinaryPath`
- Check `conflictcraft.pythonPath`
- Check `conflictcraft.ruleEnginePath`

### CLI returns manual fallback
- This is expected when no deterministic safe rule applies
- Use Explain output to see why

### Packaging succeeds but marketplace publish fails
- Usually publisher mismatch or PAT scope issue
- Verify publisher name and re-run `vsce login`

## 11) Where to Contribute First

If you want to improve quality fast:
1. Add more deterministic rules in `python_engine/conflictcraft_rules/rules/`
2. Add tests for each new rule
3. Improve hunk segmentation in C++ for multi-line JSON/function blocks
4. Improve extension UX around manual-resolution hunks

---

If you want a deeper learning path, do this sequence:
1. Run each sample file and write down which `rule_id` appears.
2. Trace one case from C++ analysis JSON to Python rule output.
3. Modify one rule and watch UI behavior change.
4. Package a local `.vsix` and install it in regular VS Code.

That will give you full control over the project, not just surface usage.
