from __future__ import annotations

import json

from conflictcraft_rules.models import RuleOutput


RULE_ID = "json_key_merge"


def _parse_json_obj(lines: list[str]) -> dict | None:
    text = "\n".join(lines).strip()
    if not text:
        return {}
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(value, dict):
        return None
    return value


def _changed_keys(base: dict, other: dict) -> set[str]:
    keys = set(base) | set(other)
    changed: set[str] = set()
    for key in keys:
        if base.get(key) != other.get(key):
            changed.add(key)
    return changed


def apply(hunk: dict) -> RuleOutput | None:
    base_obj = _parse_json_obj(hunk.get("base_lines", []))
    ours_obj = _parse_json_obj(hunk.get("ours_lines", []))
    theirs_obj = _parse_json_obj(hunk.get("theirs_lines", []))

    if base_obj is None or ours_obj is None or theirs_obj is None:
        return None

    ours_changes = _changed_keys(base_obj, ours_obj)
    theirs_changes = _changed_keys(base_obj, theirs_obj)

    if ours_changes & theirs_changes:
        return None

    merged = dict(base_obj)
    merged.update(ours_obj)
    merged.update(theirs_obj)

    resolved = json.dumps(merged, indent=2, sort_keys=True).splitlines()

    return RuleOutput(
        rule_id=RULE_ID,
        action="combine",
        resolved_lines=resolved,
        confidence=0.98,
        safe_to_apply=True,
        notes="Merged non-overlapping JSON key changes.",
    )
