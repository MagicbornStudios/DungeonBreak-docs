"""Reusable prerequisite checks for actions, dialogue, and skills."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Sequence

from ..entities.models import EntityState, ItemInstance
from ..world.map import RoomNode


@dataclass(frozen=True)
class Prerequisite:
    kind: str
    key: str = ""
    value: str | float | int | None = None
    description: str = ""


@dataclass(frozen=True)
class AvailabilityResult:
    available: bool
    blocked_reasons: tuple[str, ...] = ()


@dataclass
class PrerequisiteContext:
    actor: EntityState
    room: RoomNode
    nearby_entities: Sequence[EntityState] = ()
    target: EntityState | None = None
    exits: Sequence[str] = ()
    extra_flags: dict[str, bool] = field(default_factory=dict)


def _inventory_has_tag(items: Iterable[ItemInstance], tag: str) -> bool:
    lowered = (tag or "").strip().lower()
    if not lowered:
        return False
    for item in items:
        if lowered in {value.lower() for value in item.tags}:
            return True
    return False


def _target_for_context(ctx: PrerequisiteContext) -> EntityState | None:
    if ctx.target is not None:
        return ctx.target
    if ctx.nearby_entities:
        return ctx.nearby_entities[0]
    return None


def evaluate_prerequisite(prereq: Prerequisite, ctx: PrerequisiteContext) -> tuple[bool, str]:
    kind = prereq.kind.strip().lower()
    key = prereq.key.strip()
    reason = prereq.description or f"{prereq.kind}:{prereq.key}"

    if kind == "room_feature_is":
        return (ctx.room.feature == str(prereq.value), reason)
    if kind == "room_has_item_tag":
        return (ctx.room.has_item_tag(key), reason)
    if kind == "room_lacks_item_tag":
        return (not ctx.room.has_item_tag(key), reason)
    if kind == "exits_include":
        lowered = key.lower()
        return (lowered in {value.lower() for value in ctx.exits}, reason)
    if kind == "min_attribute":
        current = int(getattr(ctx.actor.attributes, key, 0))
        return (current >= int(prereq.value or 0), reason)
    if kind == "min_trait":
        current = float(ctx.actor.traits.values.get(key, 0.0))
        return (current >= float(prereq.value or 0.0), reason)
    if kind == "min_feature":
        current = float(ctx.actor.features.values.get(key, 0.0))
        return (current >= float(prereq.value or 0.0), reason)
    if kind == "has_inventory_tag":
        return (_inventory_has_tag(ctx.actor.inventory, key), reason)
    if kind == "target_exists":
        return (_target_for_context(ctx) is not None, reason)
    if kind == "target_has_item_tag":
        target = _target_for_context(ctx)
        if target is None:
            return (False, reason)
        return (_inventory_has_tag(target.inventory, key), reason)
    if kind == "skill_unlocked":
        skill_state = ctx.actor.skills.get(key)
        return (skill_state is not None and bool(skill_state.unlocked), reason)
    if kind == "min_level":
        return (ctx.actor.level >= int(prereq.value or 0), reason)
    if kind == "flag_true":
        return (bool(ctx.extra_flags.get(key, False)), reason)

    # Unknown prerequisite kinds are treated as blocked to avoid silent bypasses.
    return (False, f"unknown_prerequisite:{prereq.kind}")


def evaluate_prerequisites(
    prerequisites: Iterable[Prerequisite],
    ctx: PrerequisiteContext,
) -> AvailabilityResult:
    blocked: list[str] = []
    for prereq in prerequisites:
        passed, reason = evaluate_prerequisite(prereq, ctx)
        if not passed:
            blocked.append(reason)
    return AvailabilityResult(available=not blocked, blocked_reasons=tuple(blocked))
