from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
from typing import Any

if __package__ is None or __package__ == "":
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from conflictcraft_rules.engine import apply_rules


def _starts_with(line: str, prefix: str) -> bool:
    return line.startswith(prefix)


def _hunk_payload(base_lines: list[str], ours_lines: list[str], theirs_lines: list[str]) -> str:
    normalized_base = base_lines if base_lines else list(ours_lines)
    return (
        "base\n"
        + "\n".join(normalized_base)
        + "\n---\nours\n"
        + "\n".join(ours_lines)
        + "\n---\ntheirs\n"
        + "\n".join(theirs_lines)
        + "\n"
    )


def _compute_hunk_id(base_lines: list[str], ours_lines: list[str], theirs_lines: list[str]) -> str:
    payload = _hunk_payload(base_lines, ours_lines, theirs_lines)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _apply_suggestions_to_conflict_file(
    conflict_file: Path,
    suggestions: list[dict[str, Any]],
    out_path: Path,
    min_confidence: float = 0.95,
) -> None:
    lines = conflict_file.read_text(encoding="utf-8").splitlines()

    suggestion_map = {
        s["hunk_id"]: s
        for s in suggestions
        if s.get("safe_to_apply") and float(s.get("confidence", 0.0)) >= min_confidence
    }

    out_lines: list[str] = []
    state = "normal"
    block_lines: list[str] = []
    ours_lines: list[str] = []
    theirs_lines: list[str] = []
    base_lines: list[str] = []
    for line in lines:
        if state == "normal":
            if _starts_with(line, "<<<<<<<"):
                state = "ours"
                block_lines = [line]
                ours_lines = []
                base_lines = []
                theirs_lines = []
            else:
                out_lines.append(line)
            continue

        block_lines.append(line)

        if state == "ours":
            if _starts_with(line, "|||||||"):
                state = "base"
            elif _starts_with(line, "======="):
                state = "theirs"
            else:
                ours_lines.append(line)
            continue

        if state == "base":
            if _starts_with(line, "======="):
                state = "theirs"
            else:
                base_lines.append(line)
            continue

        if state == "theirs":
            if _starts_with(line, ">>>>>>>"):
                hunk_id = _compute_hunk_id(base_lines, ours_lines, theirs_lines)
                selected = suggestion_map.get(hunk_id)
                if selected:
                    out_lines.extend(selected.get("resolved_lines", []))
                else:
                    out_lines.extend(block_lines)
                state = "normal"
                block_lines = []
                ours_lines = []
                base_lines = []
                theirs_lines = []
            else:
                theirs_lines.append(line)
            continue

    out_path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="ConflictCraft deterministic rule engine")
    parser.add_argument("--analysis", required=True, help="Path to analysis JSON from C++ engine")
    parser.add_argument("--out", required=True, help="Path to write rule-result JSON")
    parser.add_argument("--config", default="", help="Optional rule config path")
    parser.add_argument("--conflict-file", default="", help="Optional conflicted file for apply mode")
    parser.add_argument("--resolved-out", default="", help="Optional path for resolved output")

    args = parser.parse_args()

    analysis_path = Path(args.analysis)
    out_path = Path(args.out)
    config_path = args.config if args.config else None

    if not analysis_path.exists():
        print(json.dumps({"ok": False, "error": {"code": "analysis_missing", "message": f"analysis file not found: {analysis_path}"}}))
        return 2

    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
    result = apply_rules(analysis, config_path=config_path)

    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    if args.conflict_file and args.resolved_out:
        _apply_suggestions_to_conflict_file(
            conflict_file=Path(args.conflict_file),
            suggestions=result.get("suggestions", []),
            out_path=Path(args.resolved_out),
            min_confidence=0.95,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
