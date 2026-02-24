# Changelog

## 0.2.1
- Fixed backend pathing so extension runs bundled backend from `extension/backend` instead of workspace scripts.
- Added activation preflight checks and graceful command disable when backend files are missing.
- Added settings: `conflictcraft.autoPrompt`, `conflictcraft.enableSmartRules`, `conflictcraft.showExplainMode` and updated default `conflictcraft.pythonPath=python3`.
- Added core exit-code aware UX (`0` success, `2` manual conflicts remain, other non-zero as error).
- Hardened execution path validation to reject backend execution outside extension directory.
- Added bundled backend manifest and platform backend folder layout for Marketplace-safe packaging.

## 0.2.0
- Added command `ConflictCraft: Run Doctor` to verify backend prerequisites.
- Added command `ConflictCraft: Scan Workspace Conflicts` to list files with markers.
- Added command `ConflictCraft: Resolve Git Unmerged Files` with preview/apply modes.
- Added command `ConflictCraft: Open Full Tutorial` for in-editor onboarding.
- Updated extension package version for marketplace update flow.

## 0.1.0
- Initial public build of ConflictCraft extension.
- 4-pane merge interface.
- Deterministic rule suggestions + explain mode.
- Conflict graph summary.
- Undo/redo and save actions.
- Marketplace icon and packaging metadata added.
