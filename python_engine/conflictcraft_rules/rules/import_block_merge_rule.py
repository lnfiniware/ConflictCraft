from __future__ import annotations

from conflictcraft_rules.models import RuleOutput


RULE_ID = "import_block_merge"


def _is_import(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("import ") or stripped.startswith("from ")


def apply(hunk: dict) -> RuleOutput | None:
    base_lines = hunk.get("base_lines", [])
    ours_lines = hunk.get("ours_lines", [])
    theirs_lines = hunk.get("theirs_lines", [])

    all_lines = base_lines + ours_lines + theirs_lines
    non_empty = [line for line in all_lines if line.strip()]

    if not non_empty:
        return None
    if not all(_is_import(line) for line in non_empty):
        return None

    merged = sorted(set(line.strip() for line in non_empty))

    return RuleOutput(
        rule_id=RULE_ID,
        action="combine",
        resolved_lines=merged,
        confidence=0.99,
        safe_to_apply=True,
        notes="Merged import statements with stable ordering and de-duplication.",
    )
