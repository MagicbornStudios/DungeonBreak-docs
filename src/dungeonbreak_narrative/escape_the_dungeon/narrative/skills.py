"""Skill vectors and prerequisite-driven unlock/use rules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from ..entities.models import EntityState, SkillState
from ..world.map import RoomNode
from .prerequisites import Prerequisite, PrerequisiteContext, evaluate_prerequisites


def _distance(a: dict[str, float], b: dict[str, float], trait_names: Iterable[str]) -> float:
    total = 0.0
    for trait in trait_names:
        diff = float(a.get(trait, 0.0)) - float(b.get(trait, 0.0))
        total += diff * diff
    return float(total ** 0.5)


def _vector(trait_names: tuple[str, ...], **kwargs: float) -> dict[str, float]:
    values = {trait: 0.0 for trait in trait_names}
    for key, value in kwargs.items():
        if key in values:
            values[key] = float(value)
    return values


@dataclass(frozen=True)
class SkillDefinition:
    skill_id: str
    name: str
    description: str
    vector_profile: dict[str, float]
    unlock_radius: float
    unlock_requirements: tuple[Prerequisite, ...] = ()
    use_requirements: tuple[Prerequisite, ...] = ()
    trait_bonus: dict[str, float] = None  # type: ignore[assignment]
    feature_bonus: dict[str, float] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        object.__setattr__(self, "trait_bonus", dict(self.trait_bonus or {}))
        object.__setattr__(self, "feature_bonus", dict(self.feature_bonus or {}))


@dataclass(frozen=True)
class SkillEligibility:
    skill_id: str
    name: str
    available: bool
    distance: float
    blocked_reasons: tuple[str, ...]


@dataclass
class SkillDirector:
    trait_names: tuple[str, ...]
    skills: dict[str, SkillDefinition]

    def evaluate_unlocks(
        self,
        actor: EntityState,
        room: RoomNode,
        nearby_entities: list[EntityState] | None = None,
    ) -> list[SkillEligibility]:
        nearby = nearby_entities or []
        rows: list[SkillEligibility] = []
        for definition in self.skills.values():
            state = actor.skills.get(definition.skill_id)
            if state is not None and state.unlocked:
                continue
            distance = _distance(actor.traits.values, definition.vector_profile, self.trait_names)
            ctx = PrerequisiteContext(
                actor=actor,
                room=room,
                nearby_entities=nearby,
            )
            prereq_result = evaluate_prerequisites(definition.unlock_requirements, ctx)
            reasons = list(prereq_result.blocked_reasons)
            if distance > definition.unlock_radius:
                reasons.append("skill_vector_distance")
            rows.append(
                SkillEligibility(
                    skill_id=definition.skill_id,
                    name=definition.name,
                    available=not reasons,
                    distance=distance,
                    blocked_reasons=tuple(reasons),
                )
            )
        rows.sort(key=lambda row: row.distance)
        return rows

    def unlock_new_skills(
        self,
        actor: EntityState,
        room: RoomNode,
        nearby_entities: list[EntityState] | None = None,
    ) -> list[SkillDefinition]:
        unlocked: list[SkillDefinition] = []
        for eligibility in self.evaluate_unlocks(actor=actor, room=room, nearby_entities=nearby_entities):
            if not eligibility.available:
                continue
            definition = self.skills[eligibility.skill_id]
            actor.skills[definition.skill_id] = SkillState(
                skill_id=definition.skill_id,
                name=definition.name,
                unlocked=True,
                mastery=0.0,
            )
            actor.traits.apply(definition.trait_bonus)
            actor.features.apply(definition.feature_bonus)
            unlocked.append(definition)
        return unlocked

    def can_use(
        self,
        actor: EntityState,
        room: RoomNode,
        skill_id: str,
        nearby_entities: list[EntityState] | None = None,
    ) -> SkillEligibility:
        definition = self.skills.get(skill_id)
        if definition is None:
            return SkillEligibility(
                skill_id=skill_id,
                name=skill_id,
                available=False,
                distance=999.0,
                blocked_reasons=("unknown_skill",),
            )
        state = actor.skills.get(skill_id)
        if state is None or not state.unlocked:
            return SkillEligibility(
                skill_id=skill_id,
                name=definition.name,
                available=False,
                distance=999.0,
                blocked_reasons=("skill_locked",),
            )
        nearby = nearby_entities or []
        ctx = PrerequisiteContext(actor=actor, room=room, nearby_entities=nearby)
        prereq_result = evaluate_prerequisites(definition.use_requirements, ctx)
        return SkillEligibility(
            skill_id=skill_id,
            name=definition.name,
            available=prereq_result.available,
            distance=_distance(actor.traits.values, definition.vector_profile, self.trait_names),
            blocked_reasons=prereq_result.blocked_reasons,
        )


def build_default_skill_director(trait_names: tuple[str, ...]) -> SkillDirector:
    skills = {
        "keen_eye": SkillDefinition(
            skill_id="keen_eye",
            name="Keen Eye",
            description="Perceive value and patterns in crowded rooms.",
            vector_profile=_vector(trait_names, Comprehension=0.35, Survival=0.25),
            unlock_radius=1.8,
            unlock_requirements=(
                Prerequisite("min_attribute", key="insight", value=6, description="Need Insight 6+"),
                Prerequisite("min_trait", key="Comprehension", value=0.05, description="Need Comprehension focus"),
            ),
            trait_bonus=_vector(trait_names, Comprehension=0.06),
            feature_bonus={"Awareness": 0.25},
        ),
        "shadow_hand": SkillDefinition(
            skill_id="shadow_hand",
            name="Shadow Hand",
            description="Steal from distracted targets when opportunity appears.",
            vector_profile=_vector(trait_names, Constraint=0.25, Survival=0.35, Projection=0.20),
            unlock_radius=1.9,
            unlock_requirements=(
                Prerequisite("skill_unlocked", key="keen_eye", description="Need Keen Eye"),
                Prerequisite("min_attribute", key="agility", value=6, description="Need Agility 6+"),
                Prerequisite("min_feature", key="Awareness", value=0.20, description="Need Awareness"),
            ),
            use_requirements=(
                Prerequisite("target_exists", description="Need a target"),
                Prerequisite("target_has_item_tag", key="loot", description="Target must carry loot"),
            ),
            trait_bonus=_vector(trait_names, Survival=0.05, Constraint=0.04),
            feature_bonus={"Guile": 0.25},
        ),
        "battle_broadcast": SkillDefinition(
            skill_id="battle_broadcast",
            name="Battle Broadcast",
            description="Turn danger into audience momentum while streaming.",
            vector_profile=_vector(trait_names, Direction=0.35, Projection=0.25, Survival=0.30),
            unlock_radius=2.0,
            unlock_requirements=(
                Prerequisite("min_attribute", key="might", value=7, description="Need Might 7+"),
                Prerequisite("min_feature", key="Fame", value=5.0, description="Need Fame 5+"),
            ),
            trait_bonus=_vector(trait_names, Direction=0.06, Projection=0.05),
            feature_bonus={"Momentum": 0.5},
        ),
    }
    return SkillDirector(trait_names=trait_names, skills=skills)
