from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Callable

from conflictcraft_rules.models import RuleOutput, hunk_is_conflict
from conflictcraft_rules.rules import (
    function_signature_rule,
    import_block_merge_rule,
    json_key_merge_rule,
    whitespace_rule,
)

RuleFn = Callable[[dict[str, Any]], RuleOutput | None]

RULE_REGISTRY: dict[str, RuleFn] = {
    whitespace_rule.RULE_ID: whitespace_rule.apply,
    import_block_merge_rule.RULE_ID: import_block_merge_rule.apply,
    json_key_merge_rule.RULE_ID: json_key_merge_rule.apply,
    function_signature_rule.RULE_ID: function_signature_rule.apply,
}

DEFAULT_RULE_ORDER = [
    whitespace_rule.RULE_ID,
    import_block_merge_rule.RULE_ID,
    json_key_merge_rule.RULE_ID,
    function_signature_rule.RULE_ID,
]


def _hash(rule_id: str, hunk_id: str, resolved_lines: list[str]) -> str:
    body = "\n".join(resolved_lines)
    payload = f"{rule_id}|{hunk_id}|{body}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def _explanation(hunk: dict[str, Any], output: RuleOutput) -> dict[str, str]:
    hunk_id = hunk.get("hunk_id") or hunk.get("id") or "unknown_hunk"
    return {
        "hunk_id": hunk_id,
        "why_conflict": "Both branches touched overlapping base lines in this region.",
        "base_summary": f"Base lines: {len(hunk.get('base_lines', []))}",
        "ours_summary": f"Ours lines: {len(hunk.get('ours_lines', []))}",
        "theirs_summary": f"Theirs lines: {len(hunk.get('theirs_lines', []))}",
        "why_suggestion_valid": output.notes,
    }


def _load_rule_order(config_path: str | None) -> list[str]:
    if not config_path:
        return list(DEFAULT_RULE_ORDER)

    import json

    config_file = Path(config_path)
    if not config_file.exists():
        return list(DEFAULT_RULE_ORDER)

    config = json.loads(config_file.read_text(encoding="utf-8"))
    enabled_rules = [
        item["id"]
        for item in sorted(config.get("rules", []), key=lambda x: x.get("priority", 0))
        if item.get("enabled", False)
    ]
    return enabled_rules or list(DEFAULT_RULE_ORDER)


def apply_rules(
    analysis: dict[str, Any],
    config_path: str | None = None,
) -> dict[str, Any]:
    rule_order = _load_rule_order(config_path)
    generated_at = (
        analysis.get("meta", {}).get("generated_at")
        or analysis.get("generated_at")
        or "1970-01-01T00:00:00Z"
    )

    suggestions: list[dict[str, Any]] = []
    explanations: list[dict[str, str]] = []
    history_preview: list[dict[str, Any]] = []

    resolved_hunks = 0
    manual_hunks = 0

    for hunk in analysis.get("hunks", []):
        if not hunk_is_conflict(hunk):
            continue
        hunk_id = hunk.get("hunk_id") or hunk.get("id") or "unknown_hunk"

        selected: RuleOutput | None = None
        for rule_id in rule_order:
            fn = RULE_REGISTRY.get(rule_id)
            if fn is None:
                continue
            selected = fn(hunk)
            if selected is not None:
                break

        if selected is None:
            selected = RuleOutput(
                rule_id="manual_fallback",
                action="manual_required",
                resolved_lines=[],
                confidence=0.1,
                safe_to_apply=False,
                notes="No deterministic rule could safely resolve this conflict.",
            )

        suggestion = {
            "hunk_id": hunk_id,
            "rule_id": selected.rule_id,
            "action": selected.action,
            "resolved_lines": selected.resolved_lines,
            "confidence": round(selected.confidence, 4),
            "safe_to_apply": selected.safe_to_apply,
            "deterministic_hash": _hash(selected.rule_id, hunk_id, selected.resolved_lines),
            "notes": selected.notes,
        }
        suggestions.append(suggestion)
        explanations.append(_explanation(hunk, selected))

        if selected.safe_to_apply and selected.confidence >= 0.95:
            resolved_hunks += 1
            history_preview.append(
                {
                    "action_id": f"act_{len(history_preview) + 1}",
                    "timestamp": generated_at,
                    "actor": "rule",
                    "hunk_id": hunk_id,
                    "before": hunk.get("base_lines", []),
                    "after": selected.resolved_lines,
                    "rule_id": selected.rule_id,
                    "undo_group": f"grp_{len(history_preview) + 1}",
                }
            )
        else:
            manual_hunks += 1

    return {
        "schema_version": "1.0.0",
        "protocol_version": analysis.get("protocol_version", "1.0.0"),
        "file": analysis.get("file", "unknown"),
        "suggestions": suggestions,
        "explanations": explanations,
        "history_preview": history_preview,
        "summary": {
            "resolved_hunks": resolved_hunks,
            "manual_hunks": manual_hunks,
        },
    }
