from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.entities.models import EntityState, FeatureVector, TraitVector
from dungeonbreak_narrative.escape_the_dungeon.narrative.cutscenes import (
    CutsceneContext,
    build_default_cutscene_director,
)


def _actor() -> EntityState:
    return EntityState(
        entity_id="kael",
        name="Kael",
        is_player=True,
        depth=12,
        room_id="L12_R001",
        traits=TraitVector.zeros(("Comprehension", "Projection")),
        features=FeatureVector.defaults(),
    )


def test_item_cutscene_triggers_once() -> None:
    director = build_default_cutscene_director()
    actor = _actor()
    first = director.trigger(
        CutsceneContext(
            actor=actor,
            action_type="search",
            found_item_tags=("treasure",),
        )
    )
    second = director.trigger(
        CutsceneContext(
            actor=actor,
            action_type="search",
            found_item_tags=("treasure",),
        )
    )
    assert first
    assert any(hit.cutscene_id == "cutscene_treasure_first" for hit in first)
    assert not any(hit.cutscene_id == "cutscene_treasure_first" for hit in second)


def test_fame_cutscene_triggers_on_stream() -> None:
    director = build_default_cutscene_director()
    actor = _actor()
    actor.features.apply({"Fame": 2.0})
    hits = director.trigger(
        CutsceneContext(
            actor=actor,
            action_type="live_stream",
            found_item_tags=(),
        )
    )
    assert any(hit.cutscene_id == "cutscene_stream_first" for hit in hits)
