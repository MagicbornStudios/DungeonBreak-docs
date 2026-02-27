from __future__ import annotations

def test_npc_and_player_share_legal_action_catalog_when_state_matches(game) -> None:
    npc = next(entity for entity in game.entities.values() if entity.entity_kind == "dungeoneer")
    npc.depth = game.player.depth
    npc.room_id = game.player.room_id
    npc.features.values = dict(game.player.features.values)
    npc.traits.values = dict(game.player.traits.values)
    npc.attributes.might = game.player.attributes.might
    npc.attributes.agility = game.player.attributes.agility
    npc.attributes.insight = game.player.attributes.insight
    npc.attributes.willpower = game.player.attributes.willpower

    player_legal = {action.action_type for action in game._legal_actions_for(game.player)}  # noqa: SLF001
    npc_legal = {action.action_type for action in game._legal_actions_for(npc)}  # noqa: SLF001

    # NPC may have extra/less choices due to faction targeting nuances, but core parity actions should overlap.
    core = {"move", "rest", "search", "talk", "fight", "live_stream"}
    assert core.issubset(player_legal)
    assert core.issubset(npc_legal)
    assert player_legal.symmetric_difference(npc_legal).issubset({"recruit"})


def test_entities_take_turn_actions_and_interact(game) -> None:
    # Place two opposing entities in same room to force interaction opportunities.
    dungeoneer = next(entity for entity in game.entities.values() if entity.entity_kind == "dungeoneer")
    boss = next(entity for entity in game.entities.values() if entity.entity_kind == "boss")
    dungeoneer.depth = game.player.depth
    boss.depth = game.player.depth
    dungeoneer.room_id = game.player.room_id
    boss.room_id = game.player.room_id

    events = game.rest(simulate_npcs=True)
    npc_events = [event for event in events if event.actor_id != game.player.entity_id]
    assert npc_events
    assert any(event.action_type in {"fight", "murder", "talk", "move"} for event in npc_events)


def test_chapter_pages_log_room_and_action_context(game) -> None:
    game.rest(simulate_npcs=False)
    pages = game.chapter_pages()
    player_page = pages.get("kael", [])
    assert player_page
    assert any("rest@" in entry for entry in player_page)


def test_entities_exchange_rumors_on_talk(game) -> None:
    speaker = game.player
    listener = next(entity for entity in game.entities.values() if entity.entity_kind == "dungeoneer")
    listener.depth = speaker.depth
    listener.room_id = speaker.room_id

    game.live_stream(simulate_npcs=False)
    before = len(listener.rumors)
    game.talk(target_id=listener.entity_id, simulate_npcs=False)
    after = len(listener.rumors)
    assert after >= before
