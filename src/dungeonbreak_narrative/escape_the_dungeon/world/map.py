"""Dungeon object model and generation helpers.

This module intentionally exposes concrete game-world objects:
- Dungeon
- Level
- RoomNode

Each level is generated with 50 rooms by default.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from random import Random
from typing import Any, Iterable

from ..config import EscapeDungeonConfig
from ..integration.adventurelib_base import ensure_vertical_directions, room_class

ROOM_FEATURE_CORRIDOR = "corridor"
ROOM_FEATURE_START = "start"
ROOM_FEATURE_EXIT = "exit"
ROOM_FEATURE_STAIRS_UP = "stairs_up"
ROOM_FEATURE_STAIRS_DOWN = "stairs_down"
ROOM_FEATURE_ESCAPE_GATE = "escape_gate"
ROOM_FEATURE_TRAINING = "training"
ROOM_FEATURE_DIALOGUE = "dialogue"
ROOM_FEATURE_REST = "rest"
ROOM_FEATURE_TREASURE = "treasure"
ROOM_FEATURE_COMBAT = "combat"

# Compatibility alias with earlier naming.
ROOM_FEATURE_ENTRANCE = ROOM_FEATURE_START


@dataclass
class RoomItemState:
    item_id: str
    name: str
    rarity: str
    description: str
    tags: tuple[str, ...]
    vector_delta: dict[str, float]
    is_present: bool = True


@dataclass
class RoomNode:
    room_id: str
    depth: int
    chapter_number: int
    row: int
    column: int
    index: int
    feature: str
    description: str
    room: Any
    base_vector: dict[str, float]
    items: list[RoomItemState] = field(default_factory=list)

    def present_items(self) -> list[RoomItemState]:
        return [item for item in self.items if item.is_present]

    def has_item_tag(self, tag: str) -> bool:
        return any(item.is_present and tag in item.tags for item in self.items)

    def take_first_item_with_tag(self, tag: str) -> RoomItemState | None:
        for item in self.items:
            if item.is_present and tag in item.tags:
                item.is_present = False
                return item
        return None

    def take_first_present_item(self) -> RoomItemState | None:
        for item in self.items:
            if item.is_present:
                item.is_present = False
                return item
        return None

    def effective_vector(self, trait_names: Iterable[str]) -> dict[str, float]:
        result = {trait: float(self.base_vector.get(trait, 0.0)) for trait in trait_names}
        for item in self.items:
            if not item.is_present:
                continue
            for trait, value in item.vector_delta.items():
                result[trait] = float(result.get(trait, 0.0)) + float(value)
        return result


@dataclass
class Level:
    depth: int
    chapter_number: int
    rows: int
    columns: int
    rooms: dict[str, RoomNode]
    start_room_id: str
    exit_room_id: str

    @property
    def room_count(self) -> int:
        return len(self.rooms)


@dataclass
class Dungeon:
    title: str
    levels: dict[int, Level]
    total_levels: int
    start_depth: int
    start_room_id: str
    escape_depth: int
    escape_room_id: str
    chapters_per_act: int

    def get_level(self, depth: int) -> Level:
        return self.levels[depth]

    def get_room(self, depth: int, room_id: str) -> RoomNode:
        return self.levels[depth].rooms[room_id]

    def chapter_for_depth(self, depth: int) -> int:
        return self.total_levels - depth + 1

    def act_for_depth(self, depth: int, chapters_per_act: int | None = None) -> int:
        cpp = self.chapters_per_act if chapters_per_act is None else chapters_per_act
        chapter = self.chapter_for_depth(depth)
        return ((chapter - 1) // cpp) + 1

    def exits_for(self, depth: int, room_id: str) -> list[str]:
        return list(self.get_room(depth, room_id).room.exits())

    def step(self, depth: int, room_id: str, direction: str) -> tuple[int, str] | None:
        source = self.get_room(depth, room_id)
        try:
            target = source.room.exit(direction)
        except KeyError:
            return None
        if target is None:
            return None
        return int(getattr(target, "_depth")), str(getattr(target, "_room_id"))


def _room_id(depth: int, index: int) -> str:
    return f"L{depth:02d}_R{index:03d}"


def _row_col(index: int, columns: int) -> tuple[int, int]:
    return index // columns, index % columns


def _feature_base_vector(feature: str, trait_names: tuple[str, ...]) -> dict[str, float]:
    vec = {trait: 0.0 for trait in trait_names}

    def bump(trait: str, value: float) -> None:
        if trait in vec:
            vec[trait] += float(value)

    if feature == ROOM_FEATURE_TRAINING:
        bump("Constraint", 0.45)
        bump("Direction", 0.30)
    elif feature == ROOM_FEATURE_DIALOGUE:
        bump("Empathy", 0.40)
        bump("Comprehension", 0.20)
    elif feature == ROOM_FEATURE_REST:
        bump("Equilibrium", 0.50)
        bump("Levity", 0.20)
    elif feature == ROOM_FEATURE_TREASURE:
        bump("Projection", 0.45)
        bump("Survival", 0.25)
    elif feature == ROOM_FEATURE_COMBAT:
        bump("Survival", 0.40)
        bump("Direction", 0.25)
    elif feature == ROOM_FEATURE_STAIRS_UP:
        bump("Direction", 0.35)
        bump("Projection", 0.15)
    elif feature == ROOM_FEATURE_ESCAPE_GATE:
        bump("Freedom", 0.55)
        bump("Projection", 0.35)
    elif feature == ROOM_FEATURE_START:
        bump("Comprehension", 0.20)
    return vec


def _items_for_room(feature: str, depth: int, index: int, trait_names: tuple[str, ...]) -> list[RoomItemState]:
    def vec(**kwargs: float) -> dict[str, float]:
        result = {trait: 0.0 for trait in trait_names}
        for key, value in kwargs.items():
            if key in result:
                result[key] = float(value)
        return result

    if feature == ROOM_FEATURE_TREASURE:
        return [
            RoomItemState(
                item_id=f"treasure_cache_{depth}_{index}",
                name="Treasure Cache",
                rarity="rare",
                description="A sealed chest filled with useful salvage.",
                tags=("treasure", "loot"),
                vector_delta=vec(Projection=0.40, Survival=0.20),
            )
        ]
    if feature == ROOM_FEATURE_COMBAT:
        return [
            RoomItemState(
                item_id=f"worn_blade_{depth}_{index}",
                name="Worn Blade",
                rarity="common",
                description="Old steel, but still sharp enough to matter.",
                tags=("weapon",),
                vector_delta=vec(Direction=0.15, Survival=0.15),
            )
        ]
    return []


def _special_feature_indices(room_count: int, start_idx: int, exit_idx: int, rng: Random) -> dict[int, str]:
    pool = [i for i in range(room_count) if i not in (start_idx, exit_idx)]
    rng.shuffle(pool)
    return {
        pool[0]: ROOM_FEATURE_TRAINING,
        pool[1]: ROOM_FEATURE_DIALOGUE,
        pool[2]: ROOM_FEATURE_REST,
        pool[3]: ROOM_FEATURE_TREASURE,
        pool[4]: ROOM_FEATURE_COMBAT,
    }


def build_dungeon_world(config: EscapeDungeonConfig) -> Dungeon:
    ensure_vertical_directions()
    room_cls = room_class()
    rng = Random(config.random_seed)

    rows = int(config.level_rows)
    columns = int(config.level_columns)
    room_count = int(config.rooms_per_level)
    if rows * columns != room_count:
        raise ValueError(
            f"Invalid layout: rows*columns={rows*columns} but rooms_per_level={room_count}. "
            "Set a layout that multiplies to 50."
        )

    levels: dict[int, Level] = {}

    for depth in range(config.total_levels, 0, -1):
        chapter_number = config.total_levels - depth + 1
        start_idx = 0
        exit_idx = room_count - 1
        special_map = _special_feature_indices(room_count, start_idx, exit_idx, rng)
        rooms: dict[str, RoomNode] = {}

        for index in range(room_count):
            row, column = _row_col(index, columns)
            rid = _room_id(depth, index)

            feature = ROOM_FEATURE_CORRIDOR
            if index == start_idx:
                feature = ROOM_FEATURE_START if depth == config.total_levels else ROOM_FEATURE_STAIRS_DOWN
            elif index == exit_idx:
                feature = ROOM_FEATURE_ESCAPE_GATE if depth == 1 else ROOM_FEATURE_STAIRS_UP
            elif index in special_map:
                feature = special_map[index]

            base_vector = _feature_base_vector(feature, config.trait_names)
            items = _items_for_room(feature, depth, index, config.trait_names)
            description = (
                f"Depth {depth}, room {index + 1}/{room_count}. "
                f"Feature: {feature.replace('_', ' ')}."
            )

            room = room_cls(description)
            setattr(room, "_depth", depth)
            setattr(room, "_room_id", rid)
            setattr(room, "_feature", feature)

            rooms[rid] = RoomNode(
                room_id=rid,
                depth=depth,
                chapter_number=chapter_number,
                row=row,
                column=column,
                index=index,
                feature=feature,
                description=description,
                room=room,
                base_vector=base_vector,
                items=items,
            )

        # Link room exits inside the level.
        for index in range(room_count):
            row, column = _row_col(index, columns)
            rid = _room_id(depth, index)
            node = rooms[rid]

            north_idx = index - columns
            south_idx = index + columns
            west_idx = index - 1
            east_idx = index + 1

            if row > 0:
                node.room.north = rooms[_room_id(depth, north_idx)].room
            if row < rows - 1:
                node.room.south = rooms[_room_id(depth, south_idx)].room
            if column > 0:
                node.room.west = rooms[_room_id(depth, west_idx)].room
            if column < columns - 1:
                node.room.east = rooms[_room_id(depth, east_idx)].room

        level = Level(
            depth=depth,
            chapter_number=chapter_number,
            rows=rows,
            columns=columns,
            rooms=rooms,
            start_room_id=_room_id(depth, start_idx),
            exit_room_id=_room_id(depth, exit_idx),
        )
        levels[depth] = level

    # Link vertical exits from each level to the next one up.
    for depth in range(config.total_levels, 1, -1):
        current_level = levels[depth]
        upper_level = levels[depth - 1]
        current_exit = current_level.rooms[current_level.exit_room_id]
        upper_start = upper_level.rooms[upper_level.start_room_id]
        current_exit.room.up = upper_start.room

    return Dungeon(
        title=config.game_title,
        levels=levels,
        total_levels=config.total_levels,
        start_depth=config.start_depth,
        start_room_id=levels[config.start_depth].start_room_id,
        escape_depth=1,
        escape_room_id=levels[1].exit_room_id,
        chapters_per_act=config.chapters_per_act,
    )


# Compatibility aliases used by other modules.
DungeonWorld = Dungeon
DungeonLevel = Level
DungeonRoom = RoomNode
