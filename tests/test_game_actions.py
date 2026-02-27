from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.entities.models import ItemInstance, SkillState
from dungeonbreak_narrative.escape_the_dungeon.world.map import ROOM_FEATURE_RUNE_FORGE, ROOM_FEATURE_TREASURE


def test_live_stream_spends_effort_and_gains_fame(game) -> None:
    before_fame = game.player.features.get("Fame")
    before_effort = game.player.features.get("Effort")
    events = game.live_stream(simulate_npcs=False)
    assert events
    assert events[0].action_type == "live_stream"
    assert game.player.features.get("Effort") == before_effort - 10.0
    assert game.player.features.get("Fame") > before_fame
    assert len(game.player.deeds) >= 1


def test_stream_action_becomes_blocked_when_effort_low(game) -> None:
    game.player.features.set("Effort", 5.0)
    rows = game.available_actions(include_blocked=True)
    stream = next(row for row in rows if row.action_type == "live_stream")
    assert stream.available is False
    assert "Need Effort >= 10" in stream.blocked_reasons


def test_search_treasure_can_trigger_cutscene(game) -> None:
    level = game.world.get_level(game.player.depth)
    treasure = next(room for room in level.rooms.values() if room.feature == ROOM_FEATURE_TREASURE)
    game.player.room_id = treasure.room_id
    events = game.search(simulate_npcs=False)
    assert any(event.action_type == "search" for event in events)
    assert any(event.action_type == "cutscene" for event in events)


def test_steal_requires_skill_and_then_succeeds(game) -> None:
    target = next(entity for entity in game.entities.values() if entity.entity_kind == "dungeoneer" and not entity.is_player)
    target.depth = game.player.depth
    target.room_id = game.player.room_id
    if not target.inventory:
        target.inventory.append(
            ItemInstance(
                item_id="target_loot",
                name="Target Loot",
                rarity="common",
                description="test",
                tags=("loot",),
                trait_delta={},
            )
        )

    blocked_events = game.steal(target_id=target.entity_id, simulate_npcs=False)
    assert "cannot use 'steal'" in blocked_events[0].message

    game.player.skills["shadow_hand"] = SkillState(skill_id="shadow_hand", name="Shadow Hand", unlocked=True)
    success_events = game.steal(target_id=target.entity_id, simulate_npcs=False)
    assert "steals" in success_events[0].message
    assert any("loot" in {tag.lower() for tag in item.tags} for item in game.player.inventory)


def test_available_dialogue_options_reflect_room_state(game) -> None:
    level = game.world.get_level(game.player.depth)
    treasure = next(room for room in level.rooms.values() if room.feature == ROOM_FEATURE_TREASURE)
    game.player.room_id = treasure.room_id
    options = {row["option_id"] for row in game.available_dialogue_options()}
    assert "loot_treasure" in options


def test_recruit_companion_respects_single_slot(game) -> None:
    target = next(entity for entity in game.entities.values() if entity.entity_kind == "dungeoneer" and entity.depth == game.player.depth)
    target.room_id = game.player.room_id
    events = game.recruit(target_id=target.entity_id, simulate_npcs=False)
    assert "joins" in events[0].message
    assert game.active_companion_id == target.entity_id

    another = next(
        entity
        for entity in game.entities.values()
        if entity.entity_kind == "dungeoneer" and entity.entity_id != target.entity_id and entity.depth == game.player.depth
    )
    another.room_id = game.player.room_id
    blocked = game.recruit(target_id=another.entity_id, simulate_npcs=False)
    assert "cannot use 'recruit'" in blocked[0].message


def test_murder_requires_faction_or_reputation_gate(game) -> None:
    target = next(entity for entity in game.entities.values() if entity.entity_kind == "dungeoneer" and entity.depth == game.player.depth)
    target.room_id = game.player.room_id
    blocked = game.murder(target_id=target.entity_id, simulate_npcs=False)
    assert "cannot use 'murder'" in blocked[0].message

    game.player.faction = "laughing_face"
    game.player.traits.apply({"Survival": 0.5})
    allowed = game.murder(target_id=target.entity_id, simulate_npcs=False)
    assert any("attempted murder" in event.message or "commits murder" in event.message for event in allowed)


def test_evolve_skill_requires_rune_forge(game) -> None:
    game.player.skills["appraisal"] = SkillState(skill_id="appraisal", name="Appraisal", unlocked=True)
    blocked = game.evolve_skill("deep_appraisal", simulate_npcs=False)
    assert "cannot use 'evolve_skill'" in blocked[0].message

    rune_room = next(room for room in game.world.get_level(game.player.depth).rooms.values() if room.feature == ROOM_FEATURE_RUNE_FORGE)
    game.player.room_id = rune_room.room_id
    game.player.attributes.insight = 8
    game.player.features.apply({"Awareness": 0.5})
    events = game.evolve_skill("deep_appraisal", simulate_npcs=False)
    assert any("evolves skill deep_appraisal" in event.message for event in events)
