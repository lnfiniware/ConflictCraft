# ConflictCraft VS Code Extension

## Capabilities
- Detects conflict markers on opened files.
- Prompts user to launch ConflictCraft editor.
- Renders 4-pane conflict view (Base, Ours, Theirs, Result).
- Displays static conflict graph summary.
- Shows explain mode and deterministic suggestions.
- Supports manual edits with undo/redo and save.

## Commands
- `conflictcraft.openEditor`
- `conflictcraft.resolveCurrentFile`
- `conflictcraft.toggleExplainMode`
- `conflictcraft.undoAction`
- `conflictcraft.redoAction`

## Settings
- `conflictcraft.coreBinaryPath`
- `conflictcraft.pythonPath`
- `conflictcraft.ruleEnginePath`

## Runtime Integration
The extension backend invokes:
1. C++ core `analyze`
2. Python rule engine `main.py`
3. Webview rendering with JSON payloads
