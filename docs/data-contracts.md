# ConflictCraft Data Contracts

All payloads are JSON Schema draft 2020-12 compliant and use strict validation (`additionalProperties: false`).

## Top-Level Fields
- `schema_version`: schema version string (starts at `1.0.0`)
- `protocol_version`: IPC protocol version string
- `file`: logical filename

## Core Schemas
- `hunk.schema.json`: diff hunk unit with base/ours/theirs ranges and text lines.
- `graph.schema.json`: graph nodes and edges with reasons.
- `suggestion.schema.json`: rule output suggestion and determinism hash.
- `explanation.schema.json`: human-readable explanation model.
- `history.schema.json`: undo/redo and applied actions timeline.
- `analysis-result.schema.json`: C++ engine output envelope.
- `rule-result.schema.json`: Python engine output envelope.
- `rule-config.schema.json`: deterministic rule configuration.

## Determinism Requirements
- Stable order for hunks, suggestions, and explanations.
- No random tie-breaks.
- Hash generation uses normalized text and rule ID.

## Confidence Model
- Float range `[0.0, 1.0]`.
- Auto-apply threshold defaults to `>= 0.95` and `safe_to_apply = true`.

## Graph Contract
- One graph node per hunk.
- Edge reasons include: `adjacent`, `symbol_overlap`, `ordering`.

## Explain Model Contract
Each explanation contains:
- conflict reason
- base change summary
- branch-by-branch summary
- justification for suggested resolution

## Examples
See `schemas/examples/analysis.sample.json` and `schemas/examples/rule-result.sample.json`.
