# ConflictCraft Rule Engine

## Purpose
The Python rule engine enriches C++ analysis output with deterministic suggestions, explanations, confidence scores, and history previews.

## Execution
`python python_engine/conflictcraft_rules/main.py --analysis analysis.json --out rules.json`

Optional apply mode:
`python python_engine/conflictcraft_rules/main.py --analysis analysis.json --out rules.json --conflict-file conflicted.txt --resolved-out resolved.txt`

## Rule Set (MVP)
1. `whitespace_ignore`
2. `import_block_merge`
3. `json_key_merge`
4. `function_signature_conflict`

## Determinism Guarantees
- Stable rule ordering.
- Stable import/key sorting where applicable.
- Deterministic hash per suggestion.
- Timestamp derived from analysis metadata in history preview.

## Extension Path
Add new rules in `python_engine/conflictcraft_rules/rules/` and register in `engine.py`.
