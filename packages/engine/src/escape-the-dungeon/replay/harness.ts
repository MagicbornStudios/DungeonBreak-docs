import { createHash } from "node:crypto";
import type { CombatStatMap, GameSnapshot, NumberMap, PlayerAction } from "../core/types";
import { normalizeEntityStats } from "../core/entity-stat-domains";
import { setCurrentHp } from "../core/entity-stats";
import { GameEngine } from "../engine/game";

export interface ReplayFixtureSetup {
  disableHostileSpawn?: boolean;
  keepEntityIds?: string[];
  player?: {
    depth?: number;
    roomId?: string;
    reputation?: number;
    combatStats?: Partial<CombatStatMap>;
    narrativeStats?: NumberMap;
    runeStats?: NumberMap;
    unlockedSkills?: string[];
  };
  colocatedEnemy?: {
    entityId?: string;
    faction?: string;
    currentHp?: number;
    addLootTag?: boolean;
  };
}

export interface ReplayFixture {
  fixtureId: string;
  seed: number;
  actions: PlayerAction[];
  setup?: ReplayFixtureSetup;
  expectedSnapshotHash?: string;
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
  return `{${entries.join(",")}}`;
};

export const hashSnapshot = (snapshot: GameSnapshot): string => {
  const serialized = stableStringify(snapshot);
  return createHash("sha256").update(serialized).digest("hex");
};

export const applyReplayFixtureSetup = (game: GameEngine, setup?: ReplayFixtureSetup): void => {
  if (!setup) {
    return;
  }

  const player = game.player;

  if (setup.disableHostileSpawn) {
    game.state.config.hostileSpawnPerTurn = 0;
  }

  if (setup.player) {
    const spec = setup.player;
    if (typeof spec.depth === "number") {
      player.depth = Math.trunc(spec.depth);
    }
    if (typeof spec.roomId === "string" && spec.roomId.trim().length > 0) {
      player.roomId = spec.roomId.trim();
    }
    if (typeof spec.reputation === "number") {
      player.reputation = spec.reputation;
    }
    if (spec.combatStats) {
      player.combatStats = {
        ...player.combatStats,
        ...Object.fromEntries(
          Object.entries(spec.combatStats).map(([key, value]) => [
            key,
            Number(value ?? 0),
          ])
        ),
      };
    }
    if (spec.narrativeStats) {
      player.narrativeStats = {
        ...player.narrativeStats,
        ...Object.fromEntries(
          Object.entries(spec.narrativeStats).map(([key, value]) => [
            key,
            Number(value ?? 0),
          ])
        ),
      };
    }
    if (spec.runeStats) {
      player.runeStats = {
        ...player.runeStats,
        ...Object.fromEntries(
          Object.entries(spec.runeStats).map(([key, value]) => [
            key,
            Number(value ?? 0),
          ])
        ),
      };
    }
    for (const skillId of spec.unlockedSkills ?? []) {
      player.skills[skillId] = {
        skillId,
        name: skillId,
        unlocked: true,
        mastery: 0,
      };
    }
    normalizeEntityStats(player);
  }

  if (setup.keepEntityIds && setup.keepEntityIds.length > 0) {
    const keep = new Set<string>([player.entityId, ...setup.keepEntityIds]);
    for (const entityId of Object.keys(game.state.entities)) {
      if (!keep.has(entityId)) {
        delete game.state.entities[entityId];
      }
    }
  }

  if (setup.colocatedEnemy) {
    const spec = setup.colocatedEnemy;
    const enemy =
      (spec.entityId ? game.state.entities[spec.entityId] : undefined) ??
      Object.values(game.state.entities).find((entity) => !entity.isPlayer);
    if (enemy) {
      enemy.depth = player.depth;
      enemy.roomId = player.roomId;
      if (typeof spec.faction === "string" && spec.faction.trim().length > 0) {
        enemy.faction = spec.faction;
      }
      if (typeof spec.currentHp === "number") {
        setCurrentHp(enemy, spec.currentHp);
      }
      if (spec.addLootTag && !enemy.inventory.some((item) => item.tags.includes("loot"))) {
        enemy.inventory.push({
          itemId: `fixture_loot_${enemy.entityId}`,
          name: "Fixture Loot",
          rarity: "common",
          description: "Replay fixture deterministic loot payload.",
          tags: ["loot"],
          narrativeStatDelta: {},
        });
      }
      normalizeEntityStats(enemy);
    }
  }
};

export const runReplayFixture = (fixture: ReplayFixture): { snapshot: GameSnapshot; snapshotHash: string } => {
  const game = GameEngine.create(fixture.seed);
  applyReplayFixtureSetup(game, fixture.setup);
  if (!fixture.setup?.disableHostileSpawn) {
    game.state.config.hostileSpawnPerTurn = 0;
  }

  for (const action of fixture.actions) {
    game.dispatch(action);
  }
  const snapshot = game.snapshot();
  const snapshotHash = hashSnapshot(snapshot);
  return { snapshot, snapshotHash };
};
