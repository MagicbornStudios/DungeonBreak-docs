"""Combat and sparring helpers."""

from __future__ import annotations

from dataclasses import dataclass
from random import Random

from ..entities.models import EntityState


@dataclass
class CombatResult:
    attacker: str
    defender: str
    damage_to_defender: int
    damage_to_attacker: int
    summary: str


@dataclass
class CombatSystem:
    random_seed: int = 13

    def __post_init__(self) -> None:
        self._rng = Random(self.random_seed)

    def spar(self, attacker: EntityState, defender: EntityState) -> CombatResult:
        attack_roll = attacker.attributes.might + self._rng.randint(0, 4)
        defense_roll = defender.attributes.agility + self._rng.randint(0, 4)
        damage_to_defender = max(1, attack_roll - defense_roll // 2)
        damage_to_attacker = max(0, defense_roll // 4 - 1)

        defender.health = max(1, defender.health - damage_to_defender)
        attacker.health = max(1, attacker.health - damage_to_attacker)
        attacker.total_xp += 2.0
        defender.total_xp += 1.0

        summary = (
            f"{attacker.name} spars with {defender.name}: "
            f"{defender.name} -{damage_to_defender} hp, {attacker.name} -{damage_to_attacker} hp."
        )
        return CombatResult(
            attacker=attacker.entity_id,
            defender=defender.entity_id,
            damage_to_defender=damage_to_defender,
            damage_to_attacker=damage_to_attacker,
            summary=summary,
        )
