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
                "hunk_id": "25f28fd278c6f1c8fc92ec3206f4f6fbe88ff6b97ea6f685d35ddf877c8e4bf4",
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
    assert first["suggestions"][0]["hunk_id"] == analysis["hunks"][0]["hunk_id"]
