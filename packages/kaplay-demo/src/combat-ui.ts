import { ENTITY_TYPE_NAME_BY_ID, type ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import type { SceneCallbacks } from "./scene-contracts";
import { UI_TAG } from "./shared";
import { drawMutedTextAtom, drawSurfaceAtom, drawTextAtom } from "./ui/atoms";

const COMBAT_SPRITE_SCALE = 3;
const USE_PREFIX_PATTERN = /^use\s+/i;

function encounterPriority(entityKind: string): number {
  if (entityKind === "boss") {
    return 0;
  }
  if (entityKind === "hostile") {
    return 1;
  }
  return 2;
}

function baseMaxHealth(entity: CombatEntitySnapshot): number {
  if (entity.isPlayer) {
    return 100;
  }
  if (entity.entityKind === "boss") {
    return 120;
  }
  if (entity.entityKind === "dungeoneer") {
    return 94;
  }
  return 70;
}

export interface CombatEntitySnapshot {
  entityId: string;
  name: string;
  isPlayer: boolean;
  entityKind: string;
  entityTypeId: string;
  archetypeHeading: string;
  depth: number;
  roomId: string;
  health: number;
  baseLevel: number;
  xp: number;
  inventory: Array<{ itemId: string; name: string }>;
}

interface CombatEventSnapshot {
  actorId: string;
  actorName: string;
  actionType: string;
  depth: number;
  roomId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface CombatSnapshot {
  playerId: string;
  entities: Record<string, CombatEntitySnapshot>;
  eventLog: CombatEventSnapshot[];
}

export function getCombatSnapshot(
  state: ReturnType<SceneCallbacks["getState"]>
): CombatSnapshot {
  return state.snapshot as unknown as CombatSnapshot;
}

export function currentEncounterEnemy(
  state: ReturnType<SceneCallbacks["getState"]>
): CombatEntitySnapshot | null {
  const snapshot = getCombatSnapshot(state);
  const player = snapshot.entities[snapshot.playerId];
  if (!player) {
    return null;
  }
  const enemies = Object.values(snapshot.entities)
    .filter((entity) => {
      if (entity.entityId === player.entityId) {
        return false;
      }
      if (entity.depth !== player.depth || entity.roomId !== player.roomId) {
        return false;
      }
      return entity.health > 0;
    })
    .sort((left, right) => {
      const leftPriority = encounterPriority(left.entityKind);
      const rightPriority = encounterPriority(right.entityKind);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return left.entityId.localeCompare(right.entityId);
    });
  return enemies[0] ?? null;
}

export function estimateMaxHealth(
  entity: CombatEntitySnapshot | null,
  fallback: number
): number {
  if (!entity) {
    return fallback;
  }
  const base = baseMaxHealth(entity);
  return Math.max(base, entity.health);
}

export function titleCaseLabel(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function entityTypeLabel(entity: CombatEntitySnapshot): string {
  return ENTITY_TYPE_NAME_BY_ID[entity.entityTypeId] ?? titleCaseLabel(entity.entityKind);
}

export function combatItemLabel(item: ActionItem): string {
  const label = item.label.replace(USE_PREFIX_PATTERN, "");
  return `Use ${titleCaseLabel(label)}`;
}

export function combatMessageLines(
  state: ReturnType<SceneCallbacks["getState"]>,
  enemy: CombatEntitySnapshot | null
): string[] {
  const snapshot = getCombatSnapshot(state);
  const player = snapshot.entities[snapshot.playerId];
  if (!player) {
    return ["Kael steadies for battle."];
  }
  const relevant = snapshot.eventLog.filter((event) => {
    if (event.depth !== player.depth || event.roomId !== player.roomId) {
      return false;
    }
    const targetId =
      typeof event.metadata?.targetId === "string"
        ? String(event.metadata.targetId)
        : null;
    return (
      event.actorId === player.entityId ||
      targetId === player.entityId ||
      (enemy
        ? event.actorId === enemy.entityId || targetId === enemy.entityId
        : false)
    );
  });
  const messages = relevant
    .slice(-3)
    .map((event) => event.message.trim())
    .filter(Boolean);
  if (messages.length > 0) {
    return messages;
  }
  if (enemy) {
    return [`${enemy.name} blocks the path.`, "Choose a command."];
  }
  return ["The encounter has broken.", "Return to navigation."];
}

export function moveRootSelection(
  current: "fight" | "spells" | "pack" | "flee",
  key: "up" | "down" | "left" | "right"
): "fight" | "spells" | "pack" | "flee" {
  if (current === "fight") {
    if (key === "right") {
      return "spells";
    }
    if (key === "down") {
      return "pack";
    }
    return current;
  }
  if (current === "spells") {
    if (key === "left") {
      return "fight";
    }
    if (key === "down") {
      return "flee";
    }
    return current;
  }
  if (current === "pack") {
    if (key === "up") {
      return "fight";
    }
    if (key === "right") {
      return "flee";
    }
    return current;
  }
  if (key === "up") {
    return "spells";
  }
  if (key === "left") {
    return "pack";
  }
  return current;
}

export function renderCombatHealthPanel(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  roleLabel: string,
  name: string,
  subtitle: string,
  health: number,
  maxHealth: number,
  tone: "good" | "danger"
): void {
  drawSurfaceAtom(k, x, y, width, 70, UI_TAG);
  drawMutedTextAtom(k, {
    x: x + 10,
    y: y + 8,
    text: roleLabel,
    size: 9,
    tag: UI_TAG,
  });
  drawTextAtom(k, { x: x + 10, y: y + 22, text: name, size: 11, tag: UI_TAG });
  drawMutedTextAtom(k, {
    x: x + 10,
    y: y + 36,
    text: subtitle,
    size: 9,
    tag: UI_TAG,
  });

  const barX = x + 10;
  const barY = y + 52;
  const barW = width - 20;
  const barRatio = Math.max(
    0,
    Math.min(1, maxHealth <= 0 ? 0 : health / maxHealth)
  );
  const barColor = tone === "danger" ? [214, 82, 88] : [90, 184, 118];

  k.add([
    k.rect(barW, 8, { radius: 4 }),
    k.pos(barX, barY),
    k.color(45, 45, 52),
    UI_TAG,
  ]);
  k.add([
    k.rect(Math.max(8, Math.floor(barW * barRatio)), 8, { radius: 4 }),
    k.pos(barX, barY),
    k.color(barColor[0], barColor[1], barColor[2]),
    UI_TAG,
  ]);
  drawTextAtom(k, {
    x: x + width - 56,
    y: y + 22,
    text: `${health}/${maxHealth}`,
    size: 9,
    tag: UI_TAG,
  });
}

export function renderEncounterBanner(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  enemyName: string,
  subtitle: string
): void {
  drawSurfaceAtom(k, x, y, width, 58, UI_TAG);
  drawMutedTextAtom(k, {
    x: x + 12,
    y: y + 10,
    text: "Hostile Encounter",
    size: 9,
    tag: UI_TAG,
  });
  drawTextAtom(k, {
    x: x + 12,
    y: y + 24,
    text: `${enemyName} blocks the room.`,
    size: 12,
    width: width - 24,
    tag: UI_TAG,
  });
  drawMutedTextAtom(k, {
    x: x + 12,
    y: y + 40,
    text: subtitle,
    size: 9,
    width: width - 24,
    tag: UI_TAG,
  });
}

export function renderCombatSprite(
  k: KAPLAYCtx,
  spriteName: string | null,
  x: number,
  y: number,
  options: {
    isPlayer?: boolean;
    scale?: number;
    animate?: boolean;
    showShadow?: boolean;
  } = {}
): void {
  if (!spriteName) {
    return;
  }
  const scale =
    options.scale ??
    (options.isPlayer ? COMBAT_SPRITE_SCALE + 0.3 : COMBAT_SPRITE_SCALE);
  if (options.showShadow) {
    k.add([
      k.rect(Math.max(18, scale * 18), Math.max(6, scale * 6), { radius: 4 }),
      k.pos(x - Math.max(9, scale * 9), y + Math.max(10, scale * 10)),
      k.color(16, 14, 18),
      k.opacity(0.55),
      UI_TAG,
    ]);
  }
  const sprite = k.add([
    k.sprite(spriteName),
    k.pos(x, y),
    k.anchor("center"),
    k.scale(scale),
    UI_TAG,
  ]);
  if (options.animate) {
    const baseY = y;
    sprite.onUpdate(() => {
      sprite.pos = k.vec2(x, baseY + Math.sin(k.time() * 4.6) * 2.2);
    });
  }
}
