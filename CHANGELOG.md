# ConflictCraft Changelog

## 0.2.1 - Stabilization Release
- Fixed VS Code extension backend pathing to use bundled backend files under `vscode-extension/backend`.
- Removed workspace-script execution from extension backend flow to reduce supply-chain risk.
- Added backend preflight checks during activation and graceful command disable on missing backend.
- Added extension settings:
  - `conflictcraft.autoPrompt`
  - `conflictcraft.pythonPath` (default `python3`)
  - `conflictcraft.enableSmartRules`
  - `conflictcraft.showExplainMode`
- Added core-exit-aware UX:
  - `0`: success
  - `2`: manual conflicts remain
  - other non-zero: error
- Added stable conflict `hunk_id` in C++ (SHA-256 of base/ours/theirs content).
- Updated Python rule mapping and application to use `hunk_id` (no index-order mapping).
- Hardened CLI argument handling with structured JSON error output.
- Added Marketplace backend bundle manifest and platform backend layout.

