from __future__ import annotations

import re

from conflictcraft_rules.models import RuleOutput


RULE_ID = "function_signature_conflict"
_SIG_PATTERN = re.compile(r"(^\s*def\s+\w+\s*\()|(^\s*function\s+\w+\s*\()|(^\s*\w+\s*\([^)]*\)\s*\{)")


def _contains_signature(lines: list[str]) -> bool:
    for line in lines:
        if _SIG_PATTERN.search(line):
            return True
    return False


def apply(hunk: dict) -> RuleOutput | None:
    ours = hunk.get("ours_lines", [])
    theirs = hunk.get("theirs_lines", [])

    if not (_contains_signature(ours) or _contains_signature(theirs)):
        return None

    if ours == theirs:
        return None

    return RuleOutput(
        rule_id=RULE_ID,
        action="manual_required",
        resolved_lines=[],
        confidence=0.2,
        safe_to_apply=False,
        notes="Function signature conflict requires manual verification.",
    )
