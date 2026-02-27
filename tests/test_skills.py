from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.entities.models import SkillState
from dungeonbreak_narrative.escape_the_dungeon.narrative.skills import build_default_skill_director


def test_keen_eye_becomes_unlockable_when_requirements_met(game) -> None:
    director = build_default_skill_director(game.config.trait_names)
    actor = game.player
    room = game.world.get_room(actor.depth, actor.room_id)
    actor.attributes.insight = 6
    actor.traits.apply({"Comprehension": 0.2})

    evaluations = director.evaluate_unlocks(actor=actor, room=room, nearby_entities=[])
    keen_eye = next(row for row in evaluations if row.skill_id == "keen_eye")
    assert keen_eye.available is True


def test_unlock_new_skills_writes_skill_state(game) -> None:
    director = build_default_skill_director(game.config.trait_names)
    actor = game.player
    room = game.world.get_room(actor.depth, actor.room_id)
    actor.attributes.insight = 6
    actor.traits.apply({"Comprehension": 0.2})
    unlocked = director.unlock_new_skills(actor=actor, room=room, nearby_entities=[])
    assert any(skill.skill_id == "keen_eye" for skill in unlocked)
    assert actor.skills["keen_eye"].unlocked is True


def test_shadow_hand_use_is_blocked_when_locked(game) -> None:
    director = build_default_skill_director(game.config.trait_names)
    actor = game.player
    room = game.world.get_room(actor.depth, actor.room_id)
    eligibility = director.can_use(actor=actor, room=room, skill_id="shadow_hand", nearby_entities=[])
    assert eligibility.available is False
    assert "skill_locked" in eligibility.blocked_reasons


def test_shadow_hand_use_checks_target_loot(game) -> None:
    actor = game.player
    actor.skills["shadow_hand"] = SkillState(skill_id="shadow_hand", name="Shadow Hand", unlocked=True)
    room = game.world.get_room(actor.depth, actor.room_id)
    eligibility = game.skills.can_use(actor=actor, room=room, skill_id="shadow_hand", nearby_entities=[])
    assert eligibility.available is False
