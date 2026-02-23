from copy import deepcopy

from conflictcraft_rules.engine import apply_rules


def test_pipeline_determinism_for_same_input() -> None:
    analysis = {
        "protocol_version": "1.0.0",
        "file": "auth.js",
        "meta": {"generated_at": "2026-02-23T00:00:00Z"},
        "hunks": [
            {
                "id": "hunk_1",
                "is_conflict": True,
                "base_lines": ["import a from 'a';"],
                "ours_lines": ["import a from 'a';", "import b from 'b';"],
                "theirs_lines": ["import c from 'c';", "import a from 'a';"],
            }
        ],
    }

    first = apply_rules(deepcopy(analysis))
    second = apply_rules(deepcopy(analysis))

    assert first == second
