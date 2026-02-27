import type { EntityState } from "@/lib/escape-the-dungeon/core/types";
import { DeterministicRng } from "@/lib/escape-the-dungeon/core/rng";

export interface SparResult {
  damage: number;
  defenderHealthAfter: number;
  defenderDefeated: boolean;
  weaponUsed: string;
  message: string;
}

export interface SparOptions {
  weaponPower?: number;
  weaponName?: string;
  lethal?: boolean;
}

const entityLevel = (entity: EntityState, baseXpPerLevel = 30): number => {
  return Math.max(1, entity.baseLevel + Math.floor(entity.xp / baseXpPerLevel));
};

export class CombatSystem {
  private readonly rng: DeterministicRng;

  constructor(seed = 10) {
    this.rng = new DeterministicRng(seed);
  }

  spar(attacker: EntityState, defender: EntityState, options: SparOptions = {}): SparResult {
    const attackerLevel = entityLevel(attacker);
    const defenderLevel = entityLevel(defender);
    const levelEdge = Math.max(-3, Math.min(5, attackerLevel - defenderLevel));

    const might = attacker.attributes.might;
    const agility = attacker.attributes.agility;
    const weaponPower = options.weaponPower ?? 1;
    const variance = this.rng.nextFloat() * 2.5;

    const baseDamage = 6 + might * 0.6 + agility * 0.35 + levelEdge * 1.1 + weaponPower * 2 + variance;
    const damage = Math.max(1, Math.round(baseDamage));

    const minHealth = options.lethal ? 0 : 1;
    const nextHealth = Math.max(minHealth, defender.health - damage);
    const defeated = nextHealth <= 0;

    defender.health = nextHealth;

    const weaponName = options.weaponName ?? "bare hands";
    const message = defeated
      ? `${attacker.name} defeats ${defender.name} using ${weaponName}.`
      : `${attacker.name} hits ${defender.name} for ${damage} using ${weaponName}.`;

    return {
      damage,
      defenderHealthAfter: nextHealth,
      defenderDefeated: defeated,
      weaponUsed: weaponName,
      message,
    };
  }
}
