"""Dialogue-space model with vector ranges and room-state conditions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

from ..entities.models import EntityState
from ..world.map import RoomItemState, RoomNode


def _map_add(a: dict[str, float], b: dict[str, float]) -> dict[str, float]:
    keys = set(a) | set(b)
    return {k: float(a.get(k, 0.0)) + float(b.get(k, 0.0)) for k in keys}


def _map_distance(a: dict[str, float], b: dict[str, float], trait_names: Iterable[str]) -> float:
    total = 0.0
    for trait in trait_names:
        da = float(a.get(trait, 0.0))
        db = float(b.get(trait, 0.0))
        diff = da - db
        total += diff * diff
    return float(total ** 0.5)


@dataclass(frozen=True)
class DialogueOption:
    option_id: str
    label: str
    line: str
    cluster_id: str
    anchor_vector: dict[str, float]
    radius: float
    effect_vector: dict[str, float]
    response_text: str
    requires_room_feature: str | None = None
    requires_item_tag_present: str | None = None
    requires_item_tag_absent: str | None = None
    take_item_tag: str | None = None


@dataclass(frozen=True)
class DialogueCluster:
    cluster_id: str
    title: str
    center_vector: dict[str, float]
    radius: float
    options: tuple[DialogueOption, ...]


@dataclass(frozen=True)
class DialogueMatch:
    option_id: str
    label: str
    line: str
    cluster_id: str
    distance: float
    response_text: str


@dataclass(frozen=True)
class DialogueOptionEvaluation:
    option_id: str
    label: str
    cluster_id: str
    available: bool
    distance: float
    blocked_reasons: tuple[str, ...]
    line: str
    response_text: str


@dataclass
class DialogueDirector:
    trait_names: tuple[str, ...]
    clusters: dict[str, DialogueCluster]

    def room_context_vector(self, entity: EntityState, room: RoomNode) -> dict[str, float]:
        return _map_add(entity.traits.values, room.effective_vector(self.trait_names))

    def evaluate_options(self, entity: EntityState, room: RoomNode) -> list[DialogueOptionEvaluation]:
        context_vector = self.room_context_vector(entity, room)
        rows: list[DialogueOptionEvaluation] = []
        for cluster in self.clusters.values():
            cluster_distance = _map_distance(context_vector, cluster.center_vector, self.trait_names)
            for option in cluster.options:
                distance = _map_distance(context_vector, option.anchor_vector, self.trait_names)
                blocked: list[str] = []
                if cluster_distance > cluster.radius:
                    blocked.append("cluster_out_of_range")
                if option.requires_room_feature and option.requires_room_feature != room.feature:
                    blocked.append("room_feature_mismatch")
                if option.requires_item_tag_present and not room.has_item_tag(option.requires_item_tag_present):
                    blocked.append("required_item_missing")
                if option.requires_item_tag_absent and room.has_item_tag(option.requires_item_tag_absent):
                    blocked.append("forbidden_item_present")
                if distance > option.radius:
                    blocked.append("option_out_of_range")
                rows.append(
                    DialogueOptionEvaluation(
                        option_id=option.option_id,
                        label=option.label,
                        cluster_id=option.cluster_id,
                        available=not blocked,
                        distance=distance,
                        blocked_reasons=tuple(blocked),
                        line=option.line,
                        response_text=option.response_text,
                    )
                )
        rows.sort(key=lambda row: row.distance)
        return rows

    def available_options(self, entity: EntityState, room: RoomNode) -> list[DialogueMatch]:
        matches: list[DialogueMatch] = []
        for row in self.evaluate_options(entity, room):
            if not row.available:
                continue
            matches.append(
                DialogueMatch(
                    option_id=row.option_id,
                    label=row.label,
                    line=row.line,
                    cluster_id=row.cluster_id,
                    distance=row.distance,
                    response_text=row.response_text,
                )
            )
        return matches

    def _find_option(self, option_id: str) -> DialogueOption | None:
        lowered = option_id.strip().lower()
        for cluster in self.clusters.values():
            for option in cluster.options:
                if option.option_id.lower() == lowered:
                    return option
        return None

    def choose_option(
        self,
        entity: EntityState,
        room: RoomNode,
        option_id: str,
    ) -> tuple[str, list[str], dict[str, float], RoomItemState | None]:
        warnings: list[str] = []
        option = self._find_option(option_id)
        if option is None:
            return "That dialogue option does not exist.", ["dialogue_option_unknown"], {}, None

        evaluations = {
            row.option_id.lower(): row
            for row in self.evaluate_options(entity, room)
        }
        evaluation = evaluations.get(option.option_id.lower())
        if evaluation is None:
            return "That dialogue option does not exist.", ["dialogue_option_unknown"], {}, None
        if not evaluation.available:
            reasons = ",".join(evaluation.blocked_reasons) if evaluation.blocked_reasons else "unknown"
            return "That option is out of range right now.", [f"dialogue_option_out_of_range:{reasons}"], {}, None

        entity.traits.apply(option.effect_vector)
        taken_item = None
        if option.take_item_tag:
            taken_item = room.take_first_item_with_tag(option.take_item_tag)
            if taken_item is None:
                warnings.append("dialogue_item_missing")
        return option.response_text, warnings, dict(option.effect_vector), taken_item


def _vector(trait_names: tuple[str, ...], **kwargs: float) -> dict[str, float]:
    data = {trait: 0.0 for trait in trait_names}
    for key, value in kwargs.items():
        if key in data:
            data[key] = float(value)
    return data


def build_default_dialogue_director(trait_names: tuple[str, ...]) -> DialogueDirector:
    clusters: dict[str, DialogueCluster] = {}

    treasure_cluster = DialogueCluster(
        cluster_id="treasure_cluster",
        title="Treasure choices",
        center_vector=_vector(trait_names, Projection=0.5, Survival=0.4),
        radius=2.0,
        options=(
            DialogueOption(
                option_id="loot_treasure",
                label="Loot the treasure cache",
                line="I pry open the cache and take what I can.",
                cluster_id="treasure_cluster",
                anchor_vector=_vector(trait_names, Projection=0.6, Survival=0.5),
                radius=1.6,
                effect_vector=_vector(trait_names, Construction=0.10, Survival=0.15),
                response_text="You salvage useful supplies from the opened cache.",
                requires_item_tag_present="treasure",
                take_item_tag="treasure",
            ),
            DialogueOption(
                option_id="wish_something_else_was_here",
                label="Say: I wish something else was here",
                line="I wish something else was here.",
                cluster_id="treasure_cluster",
                anchor_vector=_vector(trait_names, Comprehension=0.2, Projection=0.25),
                radius=2.1,
                effect_vector=_vector(trait_names, Comprehension=0.06, Levity=-0.02),
                response_text="You stare at the empty corner and note what has changed.",
                requires_item_tag_absent="treasure",
            ),
        ),
    )

    training_cluster = DialogueCluster(
        cluster_id="training_cluster",
        title="Training mindset",
        center_vector=_vector(trait_names, Constraint=0.5, Direction=0.4),
        radius=2.0,
        options=(
            DialogueOption(
                option_id="discipline_oath",
                label="Make a discipline oath",
                line="No wasted motion. No wasted turns.",
                cluster_id="training_cluster",
                anchor_vector=_vector(trait_names, Constraint=0.55, Direction=0.35),
                radius=1.8,
                effect_vector=_vector(trait_names, Constraint=0.10, Direction=0.08),
                response_text="You lock into a strict routine.",
                requires_room_feature="training",
            ),
        ),
    )

    social_cluster = DialogueCluster(
        cluster_id="social_cluster",
        title="Social options",
        center_vector=_vector(trait_names, Empathy=0.35, Comprehension=0.25),
        radius=2.0,
        options=(
            DialogueOption(
                option_id="ask_for_routes",
                label="Ask about hidden routes",
                line="Tell me what path you saw last.",
                cluster_id="social_cluster",
                anchor_vector=_vector(trait_names, Empathy=0.45, Comprehension=0.35),
                radius=1.9,
                effect_vector=_vector(trait_names, Comprehension=0.09, Empathy=0.06),
                response_text="The reply gives you clues about nearby corridors.",
                requires_room_feature="dialogue",
            ),
        ),
    )

    clusters[treasure_cluster.cluster_id] = treasure_cluster
    clusters[training_cluster.cluster_id] = training_cluster
    clusters[social_cluster.cluster_id] = social_cluster
    return DialogueDirector(trait_names=trait_names, clusters=clusters)
