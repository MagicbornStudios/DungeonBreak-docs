from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.entities.models import (
    EntityState,
    FeatureVector,
    TraitVector,
)


def test_trait_vector_apply_clamps_to_bounds() -> None:
    traits = TraitVector.zeros(("Comprehension", "Survival"), min_value=-1.0, max_value=1.0)
    traits.apply({"Comprehension": 2.5, "Survival": -2.5})
    assert traits.values["Comprehension"] == 1.0
    assert traits.values["Survival"] == -1.0


def test_feature_vector_defaults_and_clamping() -> None:
    features = FeatureVector.defaults()
    features.apply({"Effort": -999.0, "Fame": -5.0, "Momentum": -2.0})
    assert features.get("Effort") == 0.0
    assert features.get("Fame") == 0.0
    assert features.get("Momentum") == 0.0

    features.apply({"Effort": 200.0})
    assert features.get("Effort") == 100.0


def test_entity_level_scales_from_xp() -> None:
    entity = EntityState(
        entity_id="e1",
        name="Tester",
        is_player=False,
        depth=1,
        room_id="room",
        traits=TraitVector.zeros(("Comprehension",)),
    )
    entity.total_xp = 0.0
    assert entity.level == 1
    entity.total_xp = 30.0
    assert entity.level == 2
    entity.total_xp = 89.9
    assert entity.level == 3
