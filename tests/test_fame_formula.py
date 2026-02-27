from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.narrative.fame import FameFormulaInput, compute_fame_gain


def test_fame_gain_positive_with_effort() -> None:
    result = compute_fame_gain(
        FameFormulaInput(
            current_fame=0.0,
            effort_spent=10.0,
            room_vector={"Projection": 0.5, "Direction": 0.3},
            action_novelty=1.0,
            risk_level=0.5,
            momentum=0.2,
            has_broadcast_skill=False,
        )
    )
    assert result.gain > 0.0
    assert result.base_gain == 1.0


def test_fame_gain_has_diminishing_returns() -> None:
    low = compute_fame_gain(
        FameFormulaInput(
            current_fame=0.0,
            effort_spent=10.0,
            room_vector={"Projection": 0.4},
            action_novelty=1.0,
            risk_level=0.3,
            momentum=0.0,
            has_broadcast_skill=False,
        )
    )
    high = compute_fame_gain(
        FameFormulaInput(
            current_fame=300.0,
            effort_spent=10.0,
            room_vector={"Projection": 0.4},
            action_novelty=1.0,
            risk_level=0.3,
            momentum=0.0,
            has_broadcast_skill=False,
        )
    )
    assert high.gain < low.gain


def test_broadcast_skill_increases_fame_gain() -> None:
    base = compute_fame_gain(
        FameFormulaInput(
            current_fame=10.0,
            effort_spent=10.0,
            room_vector={"Projection": 0.2},
            action_novelty=0.9,
            risk_level=0.3,
            momentum=0.1,
            has_broadcast_skill=False,
        )
    )
    boosted = compute_fame_gain(
        FameFormulaInput(
            current_fame=10.0,
            effort_spent=10.0,
            room_vector={"Projection": 0.2},
            action_novelty=0.9,
            risk_level=0.3,
            momentum=0.1,
            has_broadcast_skill=True,
        )
    )
    assert boosted.gain > base.gain
