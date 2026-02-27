from __future__ import annotations


def test_status_includes_phase09_fields(game) -> None:
    snapshot = game.status()
    assert "fame" in snapshot
    assert "effort" in snapshot
    assert "features" in snapshot
    assert "available_actions" in snapshot
    assert "skills_unlockable" in snapshot
    assert "semantic_cache_size" in snapshot


def test_recent_deeds_and_cutscenes_shapes(game) -> None:
    game.live_stream(simulate_npcs=False)
    deeds = game.recent_deeds(limit=3)
    cutscenes = game.recent_cutscenes(limit=3)
    assert deeds
    assert {"deed_id", "chapter", "turn", "summary"}.issubset(deeds[0].keys())
    assert {"turn_index", "title", "message"}.issubset(cutscenes[0].keys())
