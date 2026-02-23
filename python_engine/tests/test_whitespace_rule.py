from conflictcraft_rules.rules.whitespace_rule import apply


def test_whitespace_rule_resolves_semantically_equal_changes() -> None:
    hunk = {
        "ours_lines": ["const value = 1;"],
        "theirs_lines": ["const   value   =   1;"],
    }

    out = apply(hunk)
    assert out is not None
    assert out.rule_id == "whitespace_ignore"
    assert out.safe_to_apply is True
    assert out.confidence == 1.0
