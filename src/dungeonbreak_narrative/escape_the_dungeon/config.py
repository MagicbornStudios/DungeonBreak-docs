"""Configuration for Escape the Dungeon."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Tuple

from ..engine import load_game_traits_manifest


@dataclass(frozen=True)
class EscapeDungeonConfig:
    game_title: str = "Escape the Dungeon"
    player_name: str = "Kael"
    total_levels: int = 12
    level_rows: int = 5
    level_columns: int = 10
    level_room_count: int = 50
    chapters_per_act: int = 4
    random_seed: int = 7
    max_trait_value: float = 1.0
    min_trait_value: float = -1.0
    default_player_health: int = 100
    default_player_energy: float = 1.0
    default_npc_count: int = 6
    trait_names: Tuple[str, ...] = field(default_factory=tuple)

    @property
    def start_depth(self) -> int:
        return self.total_levels

    @property
    def rooms_per_level(self) -> int:
        # We keep room count explicit so "50 rooms per level" stays true even
        # if someone changes row/column defaults.
        return self.level_room_count

    @property
    def level_width(self) -> int:
        return self.level_columns

    @property
    def level_height(self) -> int:
        return self.level_rows

    @classmethod
    def from_manifest(cls, player_name: str = "Kael") -> "EscapeDungeonConfig":
        traits = tuple(load_game_traits_manifest())
        return cls(player_name=player_name, trait_names=traits)
