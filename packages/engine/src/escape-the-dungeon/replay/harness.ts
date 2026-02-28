import { createHash } from "node:crypto";
import type { AttributeBlock, GameSnapshot, NumberMap, PlayerAction } from "../core/types";
import { GameEngine } from "../engine/game";

export interface ReplayFixtureSetup {
  disableHostileSpawn?: boolean;
  keepEntityIds?: string[];
  player?: {
    depth?: number;
    roomId?: string;
    reputation?: number;
    traits?: NumberMap;
    features?: NumberMap;
    attributes?: Partial<AttributeBlock>;
    unlockedSkills?: string[];
  };
  colocatedEnemy?: {
    entityId?: string;
    faction?: string;
    health?: number;
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
    if (spec.traits) {
      for (const [key, value] of Object.entries(spec.traits)) {
        player.traits[key as keyof typeof player.traits] = Number(value);
      }
    }
    if (spec.features) {
      for (const [key, value] of Object.entries(spec.features)) {
        player.features[key as keyof typeof player.features] = Number(value);
      }
    }
    if (spec.attributes) {
      for (const [key, value] of Object.entries(spec.attributes)) {
        if (value === undefined) {
          continue;
        }
        player.attributes[key as keyof AttributeBlock] = Number(value);
      }
    }
    for (const skillId of spec.unlockedSkills ?? []) {
      player.skills[skillId] = {
        skillId,
        name: skillId,
        unlocked: true,
        mastery: 0,
      };
    }
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
      if (typeof spec.health === "number") {
        enemy.health = spec.health;
      }
      if (spec.addLootTag && !enemy.inventory.some((item) => item.tags.includes("loot"))) {
        enemy.inventory.push({
          itemId: `fixture_loot_${enemy.entityId}`,
          name: "Fixture Loot",
          rarity: "common",
          description: "Replay fixture deterministic loot payload.",
          tags: ["loot"],
          traitDelta: {},
        });
      }
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
