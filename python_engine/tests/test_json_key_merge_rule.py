from conflictcraft_rules.rules.json_key_merge_rule import apply


def test_json_key_merge_rule_merges_non_overlapping_keys() -> None:
    hunk = {
        "base_lines": ["{\"a\": 1}"],
        "ours_lines": ["{\"a\": 1, \"b\": 2}"],
        "theirs_lines": ["{\"a\": 1, \"c\": 3}"],
    }

    out = apply(hunk)
    assert out is not None
    assert out.rule_id == "json_key_merge"
    assert out.safe_to_apply is True
    assert "\"b\": 2" in "\n".join(out.resolved_lines)
    assert "\"c\": 3" in "\n".join(out.resolved_lines)


def test_json_key_merge_rule_returns_none_on_same_key_conflict() -> None:
    hunk = {
        "base_lines": ["{\"a\": 1}"],
        "ours_lines": ["{\"a\": 2}"],
        "theirs_lines": ["{\"a\": 3}"],
    }

    out = apply(hunk)
    assert out is None
