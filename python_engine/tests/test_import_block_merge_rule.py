from conflictcraft_rules.rules.import_block_merge_rule import apply


def test_import_block_merge_rule_merges_and_deduplicates() -> None:
    hunk = {
        "base_lines": ["import a from 'a';"],
        "ours_lines": ["import b from 'b';", "import a from 'a';"],
        "theirs_lines": ["import c from 'c';"],
    }

    out = apply(hunk)
    assert out is not None
    assert out.rule_id == "import_block_merge"
    assert out.safe_to_apply is True
    assert out.resolved_lines == [
        "import a from 'a';",
        "import b from 'b';",
        "import c from 'c';",
    ]
