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
    defender_defeated: bool = False
    weapon_used: str | None = None


@dataclass
class CombatSystem:
    random_seed: int = 13

    def __post_init__(self) -> None:
        self._rng = Random(self.random_seed)

    def spar(
        self,
        attacker: EntityState,
        defender: EntityState,
        weapon_power: int = 0,
        weapon_name: str | None = None,
        lethal: bool = False,
    ) -> CombatResult:
        attack_roll = int(attacker.effective_attribute("might")) + attacker.level + int(weapon_power) + self._rng.randint(0, 4)
        defense_roll = int(defender.effective_attribute("agility")) + defender.level + self._rng.randint(0, 4)
        damage_to_defender = max(1, attack_roll - defense_roll // 2)
        damage_to_attacker = max(0, defense_roll // 4 - 1)

        min_health = 0 if lethal else 1
        defender.health = max(min_health, defender.health - damage_to_defender)
        attacker.health = max(1, attacker.health - damage_to_attacker)
        attacker.total_xp += 2.0
        defender.total_xp += 1.0
        defender_defeated = defender.health <= 0

        weapon_text = f" using {weapon_name}" if weapon_name else ""
        summary = (
            f"{attacker.name} attacks {defender.name}{weapon_text}: "
            f"{defender.name} -{damage_to_defender} hp, {attacker.name} -{damage_to_attacker} hp."
        )
        if defender_defeated:
            summary += f" {defender.name} is defeated."
        return CombatResult(
            attacker=attacker.entity_id,
            defender=defender.entity_id,
            damage_to_defender=damage_to_defender,
            damage_to_attacker=damage_to_attacker,
            summary=summary,
            defender_defeated=defender_defeated,
            weapon_used=weapon_name,
        )
