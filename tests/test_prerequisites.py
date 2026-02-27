from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.narrative.prerequisites import (
    Prerequisite,
    PrerequisiteContext,
    evaluate_prerequisite,
    evaluate_prerequisites,
)


def test_min_feature_prerequisite(game) -> None:
    room = game.world.get_room(game.player.depth, game.player.room_id)
    ctx = PrerequisiteContext(actor=game.player, room=room)
    result = evaluate_prerequisites(
        [Prerequisite("min_feature", key="Effort", value=10.0, description="Need effort")],
        ctx,
    )
    assert result.available


def test_exits_include_prerequisite_blocks_invalid_direction(game) -> None:
    room = game.world.get_room(game.player.depth, game.player.room_id)
    exits = game.world.exits_for(game.player.depth, game.player.room_id)
    ctx = PrerequisiteContext(actor=game.player, room=room, exits=exits)
    passed, _reason = evaluate_prerequisite(
        Prerequisite("exits_include", key="north", description="No north exit"),
        ctx,
    )
    assert passed is False


def test_unknown_prerequisite_kind_is_blocked(game) -> None:
    room = game.world.get_room(game.player.depth, game.player.room_id)
    ctx = PrerequisiteContext(actor=game.player, room=room)
    result = evaluate_prerequisites([Prerequisite("not_a_real_kind", key="x")], ctx)
    assert result.available is False
    assert result.blocked_reasons
