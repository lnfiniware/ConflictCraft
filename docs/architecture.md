# ConflictCraft Architecture

## Overview
ConflictCraft is a rule-driven Git conflict resolution system with five mandatory layers:

1. VS Code Extension (TypeScript + webview)
2. C++ Core Engine
3. Python Smart Rule Engine
4. Shell Integration Layer
5. JSON Data Contract Layer

The system replaces raw conflict markers with explainable, deterministic suggestions.

## Layer Responsibilities

### Layer 1: VS Code Extension
- Detects conflict markers in opened text documents.
- Prompts user to open ConflictCraft visual editor.
- Launches 4-pane editor: Base | Ours | Theirs | Result.
- Calls backend executables and validates JSON contracts.
- Displays explain mode, graph summary, and history timeline.

### Layer 2: C++ Core Engine
- Accepts either conflict-marked file input or explicit base/ours/theirs files.
- Produces hunk segmentation and conflict graph.
- Emits structured JSON for downstream processing.
- Applies deterministic result assembly in resolve flow.

### Layer 3: Python Smart Rule Engine
- Loads C++ analysis JSON.
- Applies deterministic rules:
  - Whitespace ignore
  - JSON key merge
  - Import block merge
  - Function signature conflict detection
- Returns suggestions with explanation and confidence values.

### Layer 4: Shell Integration
- Wraps CLI execution for cross-platform use.
- Registers global Git mergetool configuration.
- Exposes `conflictcraft resolve <file>` command behavior.

### Layer 5: JSON Data Contracts
- Defines strict schema for analysis and rule outputs.
- Enforces deterministic, stable fields for UI and automation.

## Runtime Flows

### CLI Resolve Flow
1. User runs `conflictcraft resolve <file>`.
2. Shell wrapper calls C++ engine analyze command.
3. C++ outputs `analysis.json`.
4. Python engine enriches output with suggestions.
5. C++ or shell-level resolver applies safe suggestions.
6. Result is written to target file; unresolved hunks are preserved.

### VS Code Flow
1. Extension detects conflict markers.
2. User accepts prompt to open ConflictCraft editor.
3. Extension calls backend analyze + rule commands.
4. Webview renders 4 panes and graph summary.
5. User applies suggestions or edits manually.
6. Undo/redo actions tracked in local action history.

### Git Mergetool Flow
1. Git invokes configured ConflictCraft mergetool driver.
2. Driver receives `$BASE`, `$LOCAL`, `$REMOTE`, `$MERGED`.
3. Driver calls C++ + Python pipeline.
4. Safe suggestions auto-apply.
5. Resolved output saved to `$MERGED` and exit status returned.

## Performance Design
- Target: smooth handling up to 10 MB files.
- C++ parser operates line-based and avoids unnecessary copies.
- Graph is hunk-level (coarse) to keep memory bounded.
- Python rule engine processes only conflicting hunks.
- Extension requests and renders only current file context.

## Failure and Fallback Strategy
- C++ failure: return structured error JSON and non-zero exit code.
- Python failure: keep raw hunk data and mark `analysis_required=true`.
- Schema validation failure: extension blocks auto-apply and shows diagnostics.
- Partial resolution: leave unresolved hunks explicit and exit with partial code.

## Security and Safety
- No remote model calls.
- Rule execution is deterministic and local.
- Shell scripts sanitize command arguments and use quoted paths.
- Git integration uses trust-exit-code for deterministic automation.

## Versioning
- Protocol version starts at `1.0.0`.
- Schema versioning is embedded in all top-level payloads.
- Backward compatibility policy: additive-only fields in minor versions.
