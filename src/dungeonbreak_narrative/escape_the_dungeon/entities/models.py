"""Entity, attributes, traits, items, and quests."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Sequence


@dataclass
class TraitVector:
    values: dict[str, float]
    min_value: float = -1.0
    max_value: float = 1.0

    @classmethod
    def zeros(
        cls,
        trait_names: Sequence[str],
        min_value: float = -1.0,
        max_value: float = 1.0,
    ) -> "TraitVector":
        return cls(values={name: 0.0 for name in trait_names}, min_value=min_value, max_value=max_value)

    def apply(self, delta: Mapping[str, float]) -> None:
        for key, value in delta.items():
            old = float(self.values.get(key, 0.0))
            new_value = old + float(value)
            clamped = max(self.min_value, min(self.max_value, new_value))
            self.values[key] = clamped

    def top(self, limit: int = 5) -> list[tuple[str, float]]:
        rows = list(self.values.items())
        rows.sort(key=lambda row: abs(row[1]), reverse=True)
        return rows[: max(1, int(limit))]


@dataclass
class FeatureVector:
    values: dict[str, float]
    min_values: dict[str, float] = field(default_factory=dict)
    max_values: dict[str, float] = field(default_factory=dict)

    @classmethod
    def defaults(cls) -> "FeatureVector":
        return cls(
            values={
                "Fame": 0.0,
                "Effort": 100.0,
                "Awareness": 0.0,
                "Guile": 0.0,
                "Momentum": 0.0,
            },
            min_values={"Fame": 0.0, "Effort": 0.0, "Momentum": 0.0},
            max_values={"Effort": 100.0},
        )

    def get(self, key: str, default: float = 0.0) -> float:
        return float(self.values.get(key, default))

    def set(self, key: str, value: float) -> None:
        min_value = self.min_values.get(key)
        max_value = self.max_values.get(key)
        current = float(value)
        if min_value is not None:
            current = max(float(min_value), current)
        if max_value is not None:
            current = min(float(max_value), current)
        self.values[key] = current

    def apply(self, delta: Mapping[str, float]) -> None:
        for key, value in delta.items():
            current = float(self.values.get(key, 0.0)) + float(value)
            self.set(key, current)


@dataclass
class AttributeBlock:
    might: int = 5
    agility: int = 5
    insight: int = 5
    willpower: int = 5

    def train(self, stat: str = "might", amount: int = 1) -> None:
        if not hasattr(self, stat):
            return
        setattr(self, stat, int(getattr(self, stat)) + int(amount))


@dataclass(frozen=True)
class ItemInstance:
    item_id: str
    name: str
    rarity: str
    description: str
    tags: tuple[str, ...] = ()
    trait_delta: dict[str, float] = field(default_factory=dict)


@dataclass
class SkillState:
    skill_id: str
    name: str
    unlocked: bool = False
    mastery: float = 0.0


@dataclass(frozen=True)
class DeedMemory:
    deed_id: str
    chapter_number: int
    turn_index: int
    summary: str
    text_hash: str
    vector: tuple[float, ...]
    trait_delta: dict[str, float] = field(default_factory=dict)
    feature_delta: dict[str, float] = field(default_factory=dict)


@dataclass
class QuestState:
    quest_id: str
    title: str
    description: str
    target_depth: int
    required_progress: int = 1
    progress: int = 0
    is_complete: bool = False

    def advance(self, amount: int = 1) -> None:
        if self.is_complete:
            return
        self.progress += int(amount)
        if self.progress >= self.required_progress:
            self.progress = self.required_progress
            self.is_complete = True


@dataclass
class EntityState:
    entity_id: str
    name: str
    is_player: bool
    depth: int
    room_id: str
    traits: TraitVector
    attributes: AttributeBlock = field(default_factory=AttributeBlock)
    features: FeatureVector = field(default_factory=FeatureVector.defaults)
    inventory: list[ItemInstance] = field(default_factory=list)
    skills: dict[str, SkillState] = field(default_factory=dict)
    deeds: list[DeedMemory] = field(default_factory=list)
    health: int = 100
    energy: float = 1.0
    total_xp: float = 0.0

    @property
    def level(self) -> int:
        return 1 + int(self.total_xp // 30.0)

    def spend_energy(self, amount: float) -> bool:
        if self.energy < amount:
            return False
        self.energy = max(0.0, self.energy - amount)
        return True

    def recover_energy(self, amount: float) -> None:
        self.energy = min(1.0, self.energy + amount)
