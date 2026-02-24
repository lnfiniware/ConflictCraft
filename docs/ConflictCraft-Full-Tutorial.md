# ConflictCraft Full Tutorial

This is the complete operational guide for ConflictCraft.
It is written for actual day to day use: build it, run it, debug it, extend it, and publish updates.

This guide is not a generic VS Code extension tutorial.
It is specifically about how this ConflictCraft repository works and how to use it productively.

---

## 0. Read This First

ConflictCraft is a deterministic merge system.
That means it does not guess.
Given the same input, it produces the same output every time.

ConflictCraft combines five parts:
1. C++ core engine (parse, hunking, graph).
2. Python rule engine (deterministic rule application).
3. TypeScript VS Code extension (4 pane UI + commands).
4. JSON contracts (stable interface between layers).
5. Shell and PowerShell wrappers (CLI + Git integration).

If you understand those five parts, you understand the project.

---

## 1. What Problem ConflictCraft Solves

Raw Git conflict markers are hard to reason about in larger files.
Git only tells you that overlapping edits exist.
It does not explain intent.

ConflictCraft adds:
- Structured hunks.
- Conflict graph summary.
- Deterministic safe merge rules.
- Explanation text for every suggestion.
- Clear separation between safe auto merge and manual review.

When a conflict is risky, ConflictCraft intentionally refuses to auto resolve it.
That is a feature, not a failure.

---

## 2. Repository Map

From project root:

- `core/`
- `core/include/`
- `core/src/`
- `core/tests/`
- `python_engine/`
- `python_engine/conflictcraft_rules/`
- `python_engine/conflictcraft_rules/rules/`
- `python_engine/tests/`
- `vscode-extension/`
- `vscode-extension/src/`
- `vscode-extension/src/webview/`
- `schemas/`
- `scripts/`
- `docs/`
- `testdata/`

Use this mental route when debugging:
1. Core JSON first.
2. Rule output JSON second.
3. Extension behavior third.

---

## 3. Prerequisites

### 3.1 Windows

Install:
- Git
- CMake
- MinGW or another C++ toolchain
- Python 3.10+
- Node.js + npm
- VS Code

Quick check:

```powershell
git --version
cmake --version
g++ --version
python --version
node --version
npm --version
code --version
```

### 3.2 Linux

Install:
- Git
- build essentials (`g++`, `make`)
- CMake
- Python 3.10+
- Node.js + npm
- VS Code

Quick check:

```bash
git --version
cmake --version
g++ --version
python3 --version
node --version
npm --version
code --version
```

### 3.3 macOS

Install:
- Git
- Xcode Command Line Tools
- CMake
- Python 3.10+
- Node.js + npm
- VS Code

Quick check:

```bash
git --version
cmake --version
clang++ --version
python3 --version
node --version
npm --version
code --version
```

---

## 4. Build Everything

Run from repository root.

### 4.1 Windows build

```powershell
cmake -S core -B core/build -G "MinGW Makefiles"
cmake --build core/build
python -m pip install -r python_engine/requirements.txt
cd vscode-extension
npm install
npm run compile
cd ..
```

### 4.2 Linux and macOS build

```bash
cmake -S core -B core/build
cmake --build core/build
python3 -m pip install -r python_engine/requirements.txt
cd vscode-extension
npm install
npm run compile
cd ..
```

### 4.3 Sanity check

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 doctor
```

Linux/macOS:

```bash
bash scripts/conflictcraft doctor
```

---

## 5. Install ConflictCraft as a Device Command

This makes `conflictcraft` available from terminal without typing the full script path.

### 5.1 Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-device.ps1
```

After install, restart terminal and run:

```powershell
conflictcraft version
conflictcraft doctor
```

Uninstall:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/uninstall-device.ps1
```

### 5.2 Linux and macOS

```bash
bash scripts/install-device.sh
```

Then:

```bash
conflictcraft version
conflictcraft doctor
```

Uninstall:

```bash
bash scripts/uninstall-device.sh
```

If command is not found after install, add this to your shell profile:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

---

## 6. Command Reference (Full)

You can run commands in two ways:
- global command: `conflictcraft ...`
- repo script: `scripts/conflictcraft` or `scripts/conflictcraft.ps1`

### 6.1 Help

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 help
```

Linux/macOS:

```bash
bash scripts/conflictcraft help
```

### 6.2 Version

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 version
```

Linux/macOS:

```bash
bash scripts/conflictcraft version
```

### 6.3 Config

Shows resolved paths for core binary, python executable, rule engine, and sample directory.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 config
```

Linux/macOS:

```bash
bash scripts/conflictcraft config
```

### 6.4 Doctor

Checks:
- Git availability
- C++ core binary presence
- Python command availability
- Rule engine path
- Rule config path
- Sample data path

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 doctor
```

Linux/macOS:

```bash
bash scripts/conflictcraft doctor
```

### 6.5 Rules

Lists deterministic rules compiled in this build.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 rules
```

Linux/macOS:

```bash
bash scripts/conflictcraft rules
```

### 6.6 Scan

Finds files that still contain conflict markers.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 scan .
```

Linux/macOS:

```bash
bash scripts/conflictcraft scan .
```

### 6.7 Samples list

Lists built in sample files.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples list
```

Linux/macOS:

```bash
bash scripts/conflictcraft samples list
```

### 6.8 Samples run

Runs resolver on sample files.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples run import --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples run whitespace --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples run json --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples run signature --no-write --explain
```

Linux/macOS:

```bash
bash scripts/conflictcraft samples run import --no-write --explain
bash scripts/conflictcraft samples run whitespace --no-write --explain
bash scripts/conflictcraft samples run json --no-write --explain
bash scripts/conflictcraft samples run signature --no-write --explain
```

### 6.9 Analyze

Runs C++ analysis only.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 analyze --conflict-file testdata/small/sample_import_conflict.js --out testdata/small/analysis.json --file sample_import_conflict.js
```

Linux/macOS:

```bash
bash scripts/conflictcraft analyze --conflict-file testdata/small/sample_import_conflict.js --out testdata/small/analysis.json --file sample_import_conflict.js
```

### 6.10 Resolve

Resolves one file.

Flags:
- `--write` apply output into file.
- `--no-write` preview only.
- `--explain` print rule JSON.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve testdata/small/sample_import_conflict.js --no-write --explain
```

Linux/macOS:

```bash
bash scripts/conflictcraft resolve testdata/small/sample_import_conflict.js --no-write --explain
```

### 6.11 Explain

Shortcut for `resolve --no-write --explain`.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 explain testdata/small/sample_json_conflict.json
```

Linux/macOS:

```bash
bash scripts/conflictcraft explain testdata/small/sample_json_conflict.json
```

### 6.12 Resolve all

Resolves all files under a directory that still contain markers.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve-all . --no-write --explain
```

Linux/macOS:

```bash
bash scripts/conflictcraft resolve-all . --no-write --explain
```

### 6.13 Git setup

Registers ConflictCraft as global Git mergetool.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 git-setup
```

Linux/macOS:

```bash
bash scripts/conflictcraft git-setup
```

### 6.14 Git resolve

Targets unmerged files from Git index.

Default mode is preview (`--no-write`).
Use `--write` to apply safe deterministic results.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 git-resolve --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 git-resolve --write --explain
```

Linux/macOS:

```bash
bash scripts/conflictcraft git-resolve --no-write --explain
bash scripts/conflictcraft git-resolve --write --explain
```

### 6.15 Install and uninstall wrappers

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 install
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 uninstall
```

Linux/macOS:

```bash
bash scripts/conflictcraft install
bash scripts/conflictcraft uninstall
```

### 6.16 Exit codes

- `0` success, all targeted files safe resolved or no work.
- `1` hard failure.
- `2` partial result, manual work still needed.

---

## 7. First Practical Lab (5 Minutes)

Goal: verify your environment and understand one deterministic merge.

Step 1: run doctor.

Step 2: run sample import with explain mode.

Step 3: verify summary says `resolved_hunks: 1` and `manual_hunks: 0`.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 doctor
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples run import --no-write --explain
```

Linux/macOS:

```bash
bash scripts/conflictcraft doctor
bash scripts/conflictcraft samples run import --no-write --explain
```

What to learn:
- The system can auto merge import block conflicts safely.
- The explanation model is attached to output JSON.

---

## 8. Second Practical Lab (Manual Fallback)

Goal: understand safe refusal behavior.

Run the function signature sample.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples run signature --no-write --explain
```

Linux/macOS:

```bash
bash scripts/conflictcraft samples run signature --no-write --explain
```

Expected:
- `rule_id` can be `function_signature_conflict` or `manual_fallback`.
- `safe_to_apply` false.
- CLI exit code often `2`.

Why this matters:
- ConflictCraft protects semantic correctness.
- It does not force merge on risky function signature differences.

---

## 9. Third Practical Lab (Folder Scan and Bulk Resolve)

Goal: use ConflictCraft on a whole tree.

Step 1: scan project.

Step 2: preview resolve-all.

Step 3: apply write mode only after review.

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 scan .
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve-all . --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve-all . --write
```

Linux/macOS:

```bash
bash scripts/conflictcraft scan .
bash scripts/conflictcraft resolve-all . --no-write --explain
bash scripts/conflictcraft resolve-all . --write
```

---

## 10. Fourth Practical Lab (Git Native Flow)

This lab simulates real conflict work with Git.

### 10.1 Create a test repository

```bash
mkdir conflictcraft-git-lab
cd conflictcraft-git-lab
git init
```

Create `app.js`:

```javascript
import { a } from "pkg";
function main() {
  return a;
}
```

Commit base:

```bash
git add app.js
git commit -m "base"
```

Create branch A:

```bash
git checkout -b feature-a
```

Edit `app.js` on branch A:

```javascript
import { a, b } from "pkg";
function main() {
  return a + b;
}
```

Commit:

```bash
git add app.js
git commit -m "feature-a change"
```

Create branch B from main:

```bash
git checkout master
git checkout -b feature-b
```

Edit `app.js` on branch B:

```javascript
import { a, c } from "pkg";
function main() {
  return a + c;
}
```

Commit:

```bash
git add app.js
git commit -m "feature-b change"
```

Merge feature-a into feature-b to create conflict:

```bash
git merge feature-a
```

### 10.2 Use ConflictCraft on Git index

From repo where conflict exists:

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 git-resolve --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 git-resolve --write --explain
```

Linux/macOS:

```bash
bash scripts/conflictcraft git-resolve --no-write --explain
bash scripts/conflictcraft git-resolve --write --explain
```

Then stage and finish merge:

```bash
git add app.js
git commit
```

---

## 11. VS Code Extension Usage

### 11.1 Build extension

```bash
cd vscode-extension
npm install
npm run compile
cd ..
```

### 11.2 Launch development host

Windows:

```powershell
code --extensionDevelopmentPath "e:\Zyad\Scripts\Ma projects\ConflictCraft\vscode-extension" "e:\Zyad\Scripts\Ma projects\ConflictCraft"
```

Linux/macOS:

```bash
code --extensionDevelopmentPath "$(pwd)/vscode-extension" "$(pwd)"
```

### 11.3 Core extension commands

- `ConflictCraft: Open Editor`
- `ConflictCraft: Resolve Current File`
- `ConflictCraft: Toggle Explain Mode`
- `ConflictCraft: Undo Action`
- `ConflictCraft: Redo Action`

### 11.4 New extension operations commands

- `ConflictCraft: Run Doctor`
- `ConflictCraft: Scan Workspace Conflicts`
- `ConflictCraft: Resolve Git Unmerged Files`
- `ConflictCraft: Open Full Tutorial`

### 11.5 Normal workflow inside editor

1. Open a conflict file.
2. Run `ConflictCraft: Open Editor`.
3. Review Base/Ours/Theirs/Result panes.
4. Read suggestions and explanations.
5. Save result.
6. Stage and commit.

### 11.6 If commands are missing

Run in extension host:
- `Developer: Reload Window`
- `Developer: Show Running Extensions`

Confirm extension id:
- `infiniware.conflictcraft-vscode`

If still missing, rebuild:

```bash
cd vscode-extension
npm run compile
```

---

## 12. Configuration Variables

### 12.1 CLI environment variables

- `CORE_BIN`
- `PYTHON_BIN`
- `RULE_ENGINE`
- `RULE_CONFIG`

Windows example:

```powershell
$env:CORE_BIN = "E:\tools\conflictcraft_core.exe"
$env:PYTHON_BIN = "python"
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 doctor
```

Linux/macOS example:

```bash
export CORE_BIN="/opt/conflictcraft/conflictcraft_core"
export PYTHON_BIN="python3"
bash scripts/conflictcraft doctor
```

### 12.2 VS Code extension settings

In Settings JSON:

```json
{
  "conflictcraft.coreBinaryPath": "",
  "conflictcraft.pythonPath": "python",
  "conflictcraft.ruleEnginePath": ""
}
```

Set these explicitly if backend discovery fails.

---

## 13. Data Contracts and JSON

ConflictCraft communicates through strict JSON.

### 13.1 Analysis output skeleton

```json
{
  "schema_version": "1.0.0",
  "protocol_version": "1.0.0",
  "file": "sample_import_conflict.js",
  "hunks": [
    {
      "id": "hunk_1",
      "is_conflict": true,
      "base_lines": ["import { a } from \"pkg\";"],
      "ours_lines": ["import { a, b } from \"pkg\";"],
      "theirs_lines": ["import { a, c } from \"pkg\";"]
    }
  ],
  "graph": {
    "nodes": [{ "node_id": "hunk_1" }],
    "edges": []
  },
  "analysis_required": true
}
```

### 13.2 Rule output skeleton

```json
{
  "schema_version": "1.0.0",
  "protocol_version": "1.0.0",
  "file": "sample_import_conflict.js",
  "suggestions": [
    {
      "hunk_id": "hunk_1",
      "rule_id": "import_block_merge",
      "action": "combine",
      "resolved_lines": ["import { a, b, c } from \"pkg\";"],
      "confidence": 0.99,
      "safe_to_apply": true,
      "deterministic_hash": "example_hash"
    }
  ],
  "explanations": [
    {
      "hunk_id": "hunk_1",
      "why_conflict": "Both branches edited the same import block.",
      "base_summary": "Base lines: 1",
      "ours_summary": "Ours lines: 1",
      "theirs_summary": "Theirs lines: 1",
      "why_suggestion_valid": "Merged unique symbols from both sides."
    }
  ],
  "summary": {
    "resolved_hunks": 1,
    "manual_hunks": 0
  }
}
```

### 13.3 Important fields to trust

- `rule_id`
- `action`
- `safe_to_apply`
- `confidence`
- `why_suggestion_valid`
- `summary`

---

## 14. Deterministic Rule Set

Current rule families:

1. `whitespace_ignore`
2. `import_block_merge`
3. `json_key_merge`
4. `function_signature_conflict`
5. `manual_fallback` when no safe rule applies

Rule files are here:
- `python_engine/conflictcraft_rules/rules/whitespace_rule.py`
- `python_engine/conflictcraft_rules/rules/import_block_merge_rule.py`
- `python_engine/conflictcraft_rules/rules/json_key_merge_rule.py`
- `python_engine/conflictcraft_rules/rules/function_signature_rule.py`

Rule ordering is controlled by:
- `python_engine/rule_configs/default_rules.json`

---

## 15. Add a New Rule (Professional Workflow)

Step 1: create a rule module in `python_engine/conflictcraft_rules/rules/`.

Step 2: implement deterministic `match` and `apply` logic.

Step 3: make sure return payload includes:
- stable `rule_id`
- deterministic result lines
- confidence
- explainable note

Step 4: register rule in `python_engine/conflictcraft_rules/engine.py`.

Step 5: place rule in order list in `python_engine/rule_configs/default_rules.json`.

Step 6: add tests in `python_engine/tests/`.

Step 7: run full tests.

Windows:

```powershell
python -m pytest python_engine/tests
```

Linux/macOS:

```bash
python3 -m pytest python_engine/tests
```

---

## 16. C++ Core Internals

The C++ layer handles structural analysis before rules run.

Key responsibilities:
- Parse marker based conflict files.
- Generate hunk objects.
- Build lightweight dependency graph.
- Emit JSON for downstream rule engine.

Common files:
- `core/src/parser.cpp`
- `core/src/diff3.cpp`
- `core/src/graph.cpp`
- `core/src/main.cpp`

When core changes, run unit tests:

```bash
ctest --test-dir core/build --output-on-failure
```

---

## 17. Performance Practice (10MB Target)

The 10MB target is realistic if you avoid unnecessary copies and repeated parsing.

Checklist:
- Keep hunk splitting linear time.
- Keep graph edge generation bounded.
- Avoid heavy regex loops over full file repeatedly.
- Avoid serializing giant intermediate structures repeatedly.

How to test:
1. Place big synthetic conflict files in `testdata/large/`.
2. Measure analyze time.
3. Measure resolve time.
4. Compare preview mode vs write mode.
5. Track memory use with OS tools.

---

## 18. Git Integration Details

ConflictCraft supports both explicit file resolve and mergetool integration.

### 18.1 Global setup

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-mergetool.ps1
```

Linux/macOS:

```bash
bash scripts/install-mergetool.sh
```

### 18.2 Verify Git config

```bash
git config --global --get merge.tool
git config --global --get mergetool.conflictcraft.cmd
git config --global --get mergetool.conflictcraft.trustExitCode
```

### 18.3 Use in real merge

```bash
git mergetool
```

### 18.4 Alternative flow

Run ConflictCraft directly:

```bash
conflictcraft git-resolve --write --explain
```

---

## 19. Publishing the VS Code Extension Update

Everything for packaging is inside `vscode-extension/`.

### 19.1 Prepare

```bash
cd vscode-extension
npm install
npm run compile
```

### 19.2 Validate metadata

Check:
- `package.json` name
- `package.json` publisher
- `package.json` version
- icon path in `package.json`
- `CHANGELOG.md`

### 19.3 Package

```bash
npm run package
```

### 19.4 Publish

```bash
npm run publish:patch
```

Use `publish:minor` or `publish:major` when needed.

---

## 20. Testing Matrix

Run this before releasing:

### 20.1 C++ tests

```bash
ctest --test-dir core/build --output-on-failure
```

### 20.2 Python tests

Windows:

```powershell
python -m pytest python_engine/tests
```

Linux/macOS:

```bash
python3 -m pytest python_engine/tests
```

### 20.3 Extension compile

```bash
cd vscode-extension
npm run compile
```

### 20.4 CLI smoke tests

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 doctor
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 rules
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples list
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 samples run import --no-write --explain
```

Linux/macOS:

```bash
bash scripts/conflictcraft doctor
bash scripts/conflictcraft rules
bash scripts/conflictcraft samples list
bash scripts/conflictcraft samples run import --no-write --explain
```

---

## 21. Troubleshooting

### 21.1 `core binary missing`

Cause:
- Core not built yet.

Fix:

```bash
cmake -S core -B core/build
cmake --build core/build
```

### 21.2 Python rule engine not found

Cause:
- Wrong path or moved repository.

Fix:
- Use `config` command.
- Set `RULE_ENGINE` env var.
- Or set VS Code setting `conflictcraft.ruleEnginePath`.

### 21.3 `ConflictCraft: Open Editor` missing in command palette

Cause:
- Extension host loaded without this workspace.

Fix:
- Open proper folder in extension host.
- Run `Developer: Reload Window`.
- Recompile extension.

### 21.4 `git-resolve` says no unmerged files

Cause:
- Merge conflict not in Git index.

Fix:
- Run `git status`.
- Confirm there are `both modified` files.

### 21.5 Manual fallback appears too often

Cause:
- Current rule set does not consider that pattern safe.

Fix:
- Inspect explain output.
- Add deterministic rule for that case.
- Add tests.

### 21.6 Performance slower than expected

Cause:
- Large file with many hunks.

Fix:
- Use `analyze` first.
- Check hunk and graph size.
- Profile core and Python loops.

---

## 22. Daily Workflow (Recommended)

1. Pull latest branch.
2. Merge target branch.
3. Run `conflictcraft doctor` once.
4. Run `conflictcraft git-resolve --no-write --explain`.
5. If safe, run `conflictcraft git-resolve --write --explain`.
6. Open remaining manual files in VS Code ConflictCraft editor.
7. Save, stage, run tests, commit.

This gives safety first, then speed.

---

## 23. Team Onboarding Checklist

For each new developer:

1. Clone repository.
2. Build core.
3. Install Python deps.
4. Compile extension.
5. Run doctor.
6. Install device command.
7. Run all sample scenarios.
8. Configure Git mergetool.

Expected completion time:
- 30 to 45 minutes first setup.

---

## 24. Full Example Session Transcript

This transcript shows the expected operator behavior.

```text
> conflictcraft doctor
[ok] git found
[ok] core binary found
[ok] python found
[ok] rule engine found
[ok] rule config found
[ok] sample directory found
Doctor result: all checks passed.

> conflictcraft scan .
Conflict files (2):
  src/auth.js
  src/routes.js

> conflictcraft resolve-all . --no-write --explain
... JSON output omitted ...
ConflictCraft: resolve-all summary: resolved=1 partial=1 total=2

> conflictcraft resolve src/auth.js --write --explain
ConflictCraft: resolution completed for src/auth.js.

> code src/routes.js
# open ConflictCraft editor for manual hunk

> git add src/auth.js src/routes.js
> git commit -m "Resolve merge conflicts with ConflictCraft"
```

---

## 25. FAQ

### Is this AI based?

No.
Core behavior is deterministic and rule driven.

### Why does ConflictCraft sometimes leave conflicts unresolved?

Because unresolved is safer than wrong auto merge.

### Can I use this without VS Code?

Yes.
CLI and Git mergetool integration are first class.

### Can I use only the extension and skip CLI?

You can, but team workflows are smoother when both are installed.

### Does it work on Windows, Linux, and macOS?

Yes.
This guide includes command examples for all three.

---

## 26. Release Checklist

Before tagging a release:

1. Run C++ tests.
2. Run Python tests.
3. Compile extension.
4. Run CLI smoke tests.
5. Confirm tutorial still accurate.
6. Update changelog.
7. Bump extension version.
8. Package extension.
9. Publish extension.
10. Push repository updates.

---

## 27. Contribution Guide (Short)

When you contribute:
- Keep behavior deterministic.
- Add tests for every new rule.
- Update docs for every user visible command.
- Avoid hidden behavior changes.
- Keep CLI output explicit and script friendly.

Useful paths:
- `core/tests/`
- `python_engine/tests/`
- `docs/ConflictCraft-Full-Tutorial.md`
- `README.md`
- `vscode-extension/CHANGELOG.md`

---

## 28. Quick Command Cheat Sheet

Windows quick sheet:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 doctor
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 rules
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 scan .
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 resolve-all . --no-write --explain
powershell -ExecutionPolicy Bypass -File scripts/conflictcraft.ps1 git-resolve --write --explain
```

Linux/macOS quick sheet:

```bash
bash scripts/conflictcraft doctor
bash scripts/conflictcraft rules
bash scripts/conflictcraft scan .
bash scripts/conflictcraft resolve-all . --no-write --explain
bash scripts/conflictcraft git-resolve --write --explain
```

---

## 29. Final Notes

ConflictCraft is designed to be practical:
- deterministic merges
- clear explanation
- safe by default
- fast enough for real repositories
- usable from CLI, Git, and VS Code

If you keep this guide close while working, you will not need guesswork.
