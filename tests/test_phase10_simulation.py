from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.player.actions import action_move
from dungeonbreak_narrative.escape_the_dungeon.world.map import ROOM_FEATURE_RUNE_FORGE


def test_population_counts_include_dungeoneers_and_bosses(game) -> None:
    dungeoneers = [entity for entity in game.entities.values() if entity.entity_kind == "dungeoneer"]
    bosses = [entity for entity in game.entities.values() if entity.entity_kind == "boss"]
    assert len(dungeoneers) == game.config.total_levels * game.config.dungeoneers_per_level
    assert len(bosses) == game.config.total_levels


def test_hostile_spawn_occurs_each_turn_from_exit(game) -> None:
    events = game.rest(simulate_npcs=True)
    spawn_events = [event for event in events if event.action_type == "spawn"]
    assert len(spawn_events) >= game.config.hostile_spawn_per_turn
    for event in spawn_events:
        level = game.world.get_level(event.depth)
        assert event.room_id == level.exit_room_id

    hostiles = [entity for entity in game.entities.values() if entity.entity_kind == "hostile"]
    assert len(hostiles) >= game.config.hostile_spawn_per_turn


def test_player_skill_branch_is_exclusive(game) -> None:
    # Any action can trigger passive skill unlock checks.
    game.rest(simulate_npcs=False)
    has_appraisal = "appraisal" in game.player.skills and game.player.skills["appraisal"].unlocked
    has_xray = "xray" in game.player.skills and game.player.skills["xray"].unlocked
    assert has_appraisal != has_xray


def test_deterministic_global_event_increases_enemy_level_bonus(game) -> None:
    for _ in range(12):
        game.rest(simulate_npcs=True)
    assert "trap_doctrine" in game.global_event_flags
    assert game.global_enemy_level_bonus >= 2


def test_rumor_spread_from_live_stream(game) -> None:
    # Move one dungeoneer into player room so rumors can spread.
    target = next(entity for entity in game.entities.values() if entity.entity_kind == "dungeoneer" and entity.depth == game.player.depth)
    target.room_id = game.player.room_id
    game.live_stream(simulate_npcs=False)
    assert len(target.rumors) >= 1


def test_hostile_move_into_rune_forge_is_blocked(game) -> None:
    level = game.world.get_level(game.player.depth)
    rune_room = next(room for room in level.rooms.values() if room.feature == ROOM_FEATURE_RUNE_FORGE)
    # Find adjacent room to rune forge.
    adjacent = None
    direction_to_rune = None
    for direction in ["north", "south", "east", "west"]:
        step = game.world.step(rune_room.depth, rune_room.room_id, direction)
        if step is None:
            continue
        adjacent = game.world.get_room(step[0], step[1])
        opposite = {"north": "south", "south": "north", "east": "west", "west": "east"}[direction]
        direction_to_rune = opposite
        break
    assert adjacent is not None
    assert direction_to_rune is not None

    hostile = next(entity for entity in game.entities.values() if entity.entity_kind == "hostile") if any(
        entity.entity_kind == "hostile" for entity in game.entities.values()
    ) else None
    if hostile is None:
        game.rest(simulate_npcs=True)
        hostile = next(entity for entity in game.entities.values() if entity.entity_kind == "hostile")
    hostile.depth = adjacent.depth
    hostile.room_id = adjacent.room_id

    availability = game._availability_for_action(hostile, action_move(direction_to_rune))  # noqa: SLF001
    assert availability.available is False
