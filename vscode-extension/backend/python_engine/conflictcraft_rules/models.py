from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RuleOutput:
    rule_id: str
    action: str
    resolved_lines: list[str]
    confidence: float
    safe_to_apply: bool
    notes: str


def hunk_is_conflict(hunk: dict[str, Any]) -> bool:
    return bool(hunk.get("is_conflict", False))
