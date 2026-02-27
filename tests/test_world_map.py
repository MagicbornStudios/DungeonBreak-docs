from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.config import EscapeDungeonConfig
from dungeonbreak_narrative.escape_the_dungeon.world.map import (
    ROOM_FEATURE_ESCAPE_GATE,
    ROOM_FEATURE_RUNE_FORGE,
    ROOM_FEATURE_TREASURE,
    build_dungeon_world,
)


def test_world_has_12_levels_and_50_rooms_each() -> None:
    config = EscapeDungeonConfig.from_manifest(player_name="Kael")
    world = build_dungeon_world(config)
    assert len(world.levels) == 12
    for depth in range(1, 13):
        level = world.get_level(depth)
        assert level.room_count == 50
        assert level.start_room_id in level.rooms
        assert level.exit_room_id in level.rooms
        treasure_count = len([room for room in level.rooms.values() if room.feature == ROOM_FEATURE_TREASURE])
        rune_count = len([room for room in level.rooms.values() if room.feature == ROOM_FEATURE_RUNE_FORGE])
        assert treasure_count == config.treasure_rooms_per_level
        assert rune_count == config.rune_forge_rooms_per_level


def test_depth_one_exit_room_is_escape_gate() -> None:
    config = EscapeDungeonConfig.from_manifest(player_name="Kael")
    world = build_dungeon_world(config)
    level_one = world.get_level(1)
    exit_room = level_one.rooms[level_one.exit_room_id]
    assert exit_room.feature == ROOM_FEATURE_ESCAPE_GATE


def test_north_blocked_from_top_left_room() -> None:
    config = EscapeDungeonConfig.from_manifest(player_name="Kael")
    world = build_dungeon_world(config)
    start_depth = world.start_depth
    level = world.get_level(start_depth)
    room = level.rooms[level.start_room_id]
    exits = set(room.room.exits())
    assert "north" not in exits
