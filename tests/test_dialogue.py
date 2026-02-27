from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.world.map import ROOM_FEATURE_TREASURE


def _move_player_to_treasure_room(game) -> None:
    level = game.world.get_level(game.player.depth)
    treasure = next(room for room in level.rooms.values() if room.feature == ROOM_FEATURE_TREASURE)
    game.player.room_id = treasure.room_id


def test_treasure_dialogue_swaps_when_item_removed(game) -> None:
    _move_player_to_treasure_room(game)
    room = game.world.get_room(game.player.depth, game.player.room_id)

    options_present = {row["option_id"]: row for row in game.evaluate_dialogue_options()}
    assert options_present["loot_treasure"]["available"] is True

    room.take_first_item_with_tag("treasure")
    options_absent = {row["option_id"]: row for row in game.evaluate_dialogue_options()}
    assert options_absent["loot_treasure"]["available"] is False
    assert options_absent["wish_something_else_was_here"]["available"] is True


def test_dialogue_blocked_reasons_are_exposed(game) -> None:
    _move_player_to_treasure_room(game)
    room = game.world.get_room(game.player.depth, game.player.room_id)
    room.take_first_item_with_tag("treasure")
    rows = {row["option_id"]: row for row in game.evaluate_dialogue_options()}
    assert "required_item_missing" in rows["loot_treasure"]["blocked_reasons"]
