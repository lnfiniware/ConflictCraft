from __future__ import annotations

from conflictcraft_rules.models import RuleOutput


RULE_ID = "whitespace_ignore"


def _normalize(lines: list[str]) -> str:
    return "\n".join(" ".join(line.split()) for line in lines).strip()


def apply(hunk: dict) -> RuleOutput | None:
    ours = hunk.get("ours_lines", [])
    theirs = hunk.get("theirs_lines", [])

    if _normalize(ours) != _normalize(theirs):
        return None

    return RuleOutput(
        rule_id=RULE_ID,
        action="keep_ours",
        resolved_lines=list(ours),
        confidence=1.0,
        safe_to_apply=True,
        notes="Whitespace-only divergence; semantic content identical.",
    )
