"""Cutscene trigger and presentation pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

from ..entities.models import EntityState


@dataclass(frozen=True)
class CutsceneDefinition:
    cutscene_id: str
    title: str
    text: str
    trigger_kind: str
    once: bool = True
    required_action_type: str | None = None
    required_item_tag: str | None = None
    required_skill_id: str | None = None
    min_attribute: tuple[str, int] | None = None
    min_fame: float | None = None


@dataclass(frozen=True)
class CutsceneContext:
    actor: EntityState
    action_type: str
    found_item_tags: tuple[str, ...] = ()
    unlocked_skill_ids: tuple[str, ...] = ()
    chapter_completed: int | None = None
    escaped: bool = False


@dataclass(frozen=True)
class CutsceneHit:
    cutscene_id: str
    title: str
    text: str


@dataclass
class CutsceneDirector:
    definitions: tuple[CutsceneDefinition, ...]
    seen_cutscenes: set[str] = field(default_factory=set)

    def _matches(self, definition: CutsceneDefinition, ctx: CutsceneContext) -> bool:
        if definition.required_action_type and definition.required_action_type != ctx.action_type:
            return False
        kind = definition.trigger_kind
        if kind == "item_tag":
            return definition.required_item_tag in set(ctx.found_item_tags)
        if kind == "skill_unlock":
            return definition.required_skill_id in set(ctx.unlocked_skill_ids)
        if kind == "attribute_milestone":
            if definition.min_attribute is None:
                return False
            stat, threshold = definition.min_attribute
            return int(getattr(ctx.actor.attributes, stat, 0)) >= int(threshold)
        if kind == "fame_milestone":
            if definition.min_fame is None:
                return False
            return float(ctx.actor.features.get("Fame", 0.0)) >= float(definition.min_fame)
        if kind == "chapter_complete":
            return ctx.chapter_completed is not None
        if kind == "escape":
            return bool(ctx.escaped)
        return False

    def trigger(self, ctx: CutsceneContext) -> list[CutsceneHit]:
        hits: list[CutsceneHit] = []
        for definition in self.definitions:
            if definition.once and definition.cutscene_id in self.seen_cutscenes:
                continue
            if not self._matches(definition, ctx):
                continue
            if definition.once:
                self.seen_cutscenes.add(definition.cutscene_id)
            hits.append(
                CutsceneHit(
                    cutscene_id=definition.cutscene_id,
                    title=definition.title,
                    text=definition.text,
                )
            )
        return hits


def build_default_cutscene_director() -> CutsceneDirector:
    definitions = (
        CutsceneDefinition(
            cutscene_id="cutscene_treasure_first",
            title="A Locked Cache",
            text="The chest seal breaks. Someone passed here before you, and they were in a hurry.",
            trigger_kind="item_tag",
            required_item_tag="treasure",
            once=True,
        ),
        CutsceneDefinition(
            cutscene_id="cutscene_training_might",
            title="Steel Memory",
            text="Your stance stops shaking. The dungeon no longer feels bigger than you.",
            trigger_kind="attribute_milestone",
            required_action_type="train",
            min_attribute=("might", 8),
            once=True,
        ),
        CutsceneDefinition(
            cutscene_id="cutscene_stream_first",
            title="Signal in the Dark",
            text="A weak stream signal catches. The audience count moves from zero to one.",
            trigger_kind="fame_milestone",
            required_action_type="live_stream",
            min_fame=1.0,
            once=True,
        ),
        CutsceneDefinition(
            cutscene_id="cutscene_shadow_hand_unlock",
            title="Hands Like Smoke",
            text="You map weight and motion in a blink. Theft feels less like chance and more like geometry.",
            trigger_kind="skill_unlock",
            required_skill_id="shadow_hand",
            once=True,
        ),
        CutsceneDefinition(
            cutscene_id="cutscene_chapter_complete",
            title="Chapter Closed",
            text="Another level is behind you. The dungeon's story has one less page to write.",
            trigger_kind="chapter_complete",
            once=False,
        ),
        CutsceneDefinition(
            cutscene_id="cutscene_escape",
            title="Surface Air",
            text="The final gate opens. Kael steps out carrying twelve chapters of proof.",
            trigger_kind="escape",
            once=True,
        ),
    )
    return CutsceneDirector(definitions=definitions)
