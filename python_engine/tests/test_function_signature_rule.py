from conflictcraft_rules.rules.function_signature_rule import apply


def test_function_signature_rule_flags_manual_conflict() -> None:
    hunk = {
        "ours_lines": ["function render(user) {"],
        "theirs_lines": ["function render(user, role) {"],
    }

    out = apply(hunk)
    assert out is not None
    assert out.rule_id == "function_signature_conflict"
    assert out.action == "manual_required"
    assert out.safe_to_apply is False
