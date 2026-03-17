import { ACTION_TYPE, type ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { firstItemByActionType, itemsByActionType } from "./action-renderer";
import {
  combatItemLabel,
  combatMessageLines,
  currentEncounterEnemy,
  estimateMaxHealth,
  getCombatSnapshot,
  moveRootSelection,
  renderCombatHealthPanel,
  renderCombatSprite,
  renderEncounterBanner,
  titleCaseLabel,
} from "./combat-ui";
import {
  resolveEntityCombatSprite,
  resolveItemSprite,
  resolveSpellSprite,
} from "./content-visuals";
import { hasEncounter } from "./scene-blocks";
import type { SceneCallbacks } from "./scene-contracts";
import { renderSceneLayout } from "./scene-layout";
import { addButton, clearUi, LINE_H, PAD, UI_TAG } from "./shared";
import { drawMutedTextAtom, drawSurfaceAtom, drawTextAtom } from "./ui/atoms";

const W = 560;
const NAV_ROW_Y = 64;
const COMBAT_FIELD_H = 336;
const COMBAT_FIELD_GAP = 8;
const COMBAT_BOX_H = 112;
const COMBAT_BOX_GAP = 8;
const COMBAT_MENU_ICON_SCALE = 1.05;

type CombatMenuMode = "root" | "fight" | "spells" | "pack";
type CombatRootAction = "fight" | "spells" | "pack" | "flee";

interface CombatMenuEntry {
  label: string;
  enabled: boolean;
  tone: "neutral" | "good" | "warn" | "danger" | "accent";
  onChoose?: () => void;
  spriteName?: string;
}

function menuModeTitle(menuMode: Exclude<CombatMenuMode, "root">): string {
  if (menuMode === "fight") {
    return "Fight";
  }
  if (menuMode === "spells") {
    return "Combat Spells";
  }
  return "Bag";
}

function preparedSpellSlots(state: ReturnType<SceneCallbacks["getState"]>) {
  return state.engine.preparedSpellSlots();
}

export function registerCombatScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  k.scene("gridCombat", () => {
    let menuMode: CombatMenuMode = "root";
    let rootSelection: CombatRootAction = "fight";
    let submenuIndex = 0;

    const render = () => {
      clearUi(k);
      const state = cb.getState();
      const snapshot = getCombatSnapshot(state);
      const player = snapshot.entities[snapshot.playerId] ?? null;
      const enemy = currentEncounterEnemy(state);
      const fight = firstItemByActionType(state, ACTION_TYPE.FIGHT);
      const fleeOptions = itemsByActionType(state, ACTION_TYPE.FLEE).filter(
        (item) => item.available
      );
      const spellOptions = preparedSpellSlots(state).filter(
        (slot) => slot.skillId
      );
      const packOptions = itemsByActionType(state, "use_item").filter(
        (item) => item.available
      );
      const enemySprite = resolveEntityCombatSprite(
        enemy?.entityKind ?? "hostile",
        enemy?.archetypeHeading,
        false
      );
      const playerSprite = resolveEntityCombatSprite(
        player?.entityKind ?? "player",
        player?.archetypeHeading,
        true
      );

      if (!(enemy && player)) {
        renderSceneLayout(k, {
          width: W,
          title: "Encounter",
          subtitle: "[Esc] Return",
        });
        drawSurfaceAtom(k, PAD, NAV_ROW_Y, W - PAD * 2, 160, UI_TAG);
        drawTextAtom(k, {
          x: PAD + 16,
          y: NAV_ROW_Y + 24,
          text: "No enemy is in front of Kael.",
          size: 14,
          tag: UI_TAG,
        });
        addButton(
          k,
          PAD + 16,
          NAV_ROW_Y + 72,
          220,
          "Return to exploration",
          () => k.go("gridNavigation"),
          true,
          { tone: "accent" }
        );
        return;
      }

      const contentY = renderSceneLayout(k, {
        width: W,
        title: "Encounter",
        subtitle: enemy.name,
      });

      const fieldX = PAD;
      const fieldY = contentY;
      const fieldW = W - PAD * 2;
      const fieldBottom = fieldY + COMBAT_FIELD_H;
      drawSurfaceAtom(k, fieldX, fieldY, fieldW, COMBAT_FIELD_H, UI_TAG);

      k.add([
        k.rect(fieldW - 24, 112, { radius: 6 }),
        k.pos(fieldX + 12, fieldY + 88),
        k.color(63, 114, 163),
        k.opacity(0.12),
        UI_TAG,
      ]);
      k.add([
        k.rect(188, 18, { radius: 9 }),
        k.pos(fieldX + 56, fieldBottom - 84),
        k.color(44, 72, 56),
        k.opacity(0.45),
        UI_TAG,
      ]);
      k.add([
        k.rect(188, 18, { radius: 9 }),
        k.pos(fieldX + fieldW - 238, fieldY + 196),
        k.color(72, 72, 52),
        k.opacity(0.45),
        UI_TAG,
      ]);

      renderEncounterBanner(
        k,
        fieldX + 12,
        fieldY + 14,
        250,
        enemy.name,
        `${titleCaseLabel(enemy.entityKind)} Lv.${Math.max(1, enemy.baseLevel)}`
      );

      const enemyPanelX = fieldX + fieldW - 246;
      const enemyPanelY = fieldY + 78;
      const playerPanelX = fieldX + 16;
      const playerPanelY = fieldBottom - 86;

      renderCombatHealthPanel(
        k,
        enemyPanelX,
        enemyPanelY,
        230,
        "Enemy",
        enemy.name,
        `${titleCaseLabel(enemy.entityKind)} Lv.${Math.max(1, enemy.baseLevel)}`,
        enemy.health,
        estimateMaxHealth(enemy, 70),
        "danger"
      );
      renderCombatHealthPanel(
        k,
        playerPanelX,
        playerPanelY,
        230,
        "Kael",
        player.name,
        `Lv.${Math.max(1, Number(state.status.level ?? player.baseLevel))}  Energy ${String(state.status.energy ?? "?")}`,
        Number(state.status.health ?? player.health),
        estimateMaxHealth(player, 100),
        "good"
      );

      renderCombatSprite(k, enemySprite, fieldX + fieldW - 132, fieldY + 228, {
        scale: 2.55,
        animate: true,
        showShadow: true,
      });
      renderCombatSprite(k, playerSprite, fieldX + 152, fieldBottom - 54, {
        isPlayer: true,
        scale: 2.7,
        animate: true,
        showShadow: true,
      });
      drawMutedTextAtom(k, {
        x: fieldX + 128,
        y: fieldBottom - 132,
        text: "Kael",
        size: 10,
        tag: UI_TAG,
      });

      const messageY = fieldBottom + COMBAT_FIELD_GAP;
      const messageW = Math.floor((fieldW - COMBAT_BOX_GAP) * 0.56);
      const menuX = fieldX + messageW + COMBAT_BOX_GAP;
      const menuW = fieldW - messageW - COMBAT_BOX_GAP;
      drawSurfaceAtom(k, fieldX, messageY, messageW, COMBAT_BOX_H, UI_TAG);
      drawSurfaceAtom(k, menuX, messageY, menuW, COMBAT_BOX_H, UI_TAG);

      drawMutedTextAtom(k, {
        x: fieldX + 12,
        y: messageY + 10,
        text: "Battle Flow",
        size: 10,
        tag: UI_TAG,
      });

      const messageLines = combatMessageLines(state, enemy);
      let lineY = messageY + 28;
      for (const line of messageLines) {
        drawTextAtom(k, {
          x: fieldX + 12,
          y: lineY,
          text: line,
          size: 10,
          width: messageW - 24,
          tag: UI_TAG,
        });
        lineY += LINE_H;
      }

      const executeCombatAction = (action: ActionItem | null) => {
        if (!action?.available) {
          return;
        }
        menuMode = "root";
        submenuIndex = 0;
        cb.doAction(action.action);
        if (!hasEncounter(cb.getState())) {
          k.go("gridNavigation");
        }
      };

      const executeRandomFlee = () => {
        if (fleeOptions.length === 0) {
          return;
        }
        const picked =
          fleeOptions[Math.floor(Math.random() * fleeOptions.length)] ??
          fleeOptions[0] ??
          null;
        executeCombatAction(picked);
      };

      const submenuEntries: Record<
        Exclude<CombatMenuMode, "root">,
        CombatMenuEntry[]
      > = {
        fight: [
          {
            label: enemy ? `Attack ${enemy.name}` : "Attack",
            enabled: Boolean(fight?.available),
            tone: "danger",
            onChoose: () => executeCombatAction(fight),
          },
        ],
        spells:
          spellOptions.length > 0
            ? spellOptions.map((slot) => {
                const skillId = String(slot.skillId ?? "");
                return {
                  label: `Slot ${slot.slotIndex + 1}: ${slot.name}`,
                  enabled: slot.available,
                  tone: "accent" as const,
                  onChoose: () => cb.castSpell(skillId),
                  spriteName: resolveSpellSprite(skillId) ?? undefined,
                };
              })
            : [
                {
                  label: "No spells learned",
                  enabled: false,
                  tone: "neutral" as const,
                },
              ],
        pack:
          packOptions.length > 0
            ? packOptions.map((item) => {
                const itemId =
                  item.action.kind === "player"
                    ? String(item.action.playerAction.payload.itemId ?? "")
                    : "";
                return {
                  label: combatItemLabel(item),
                  enabled: item.available,
                  tone: "good" as const,
                  onChoose: () => executeCombatAction(item),
                  spriteName: resolveItemSprite(itemId) ?? undefined,
                };
              })
            : [
                {
                  label: "Pack is empty",
                  enabled: false,
                  tone: "neutral" as const,
                },
              ],
      };

      if (menuMode !== "root") {
        const entries = submenuEntries[menuMode];
        submenuIndex = Math.max(0, Math.min(submenuIndex, entries.length - 1));
        drawMutedTextAtom(k, {
          x: menuX + 12,
          y: messageY + 10,
          text: menuModeTitle(menuMode),
          size: 10,
          tag: UI_TAG,
        });
        let entryY = messageY + 28;
        for (let index = 0; index < entries.length; index += 1) {
          const entry = entries[index];
          if (!entry) {
            continue;
          }
          const selected = index === submenuIndex;
          addButton(
            k,
            menuX + 10,
            entryY,
            menuW - 20,
            `${selected ? "> " : ""}${entry.label}`,
            () => entry.onChoose?.(),
            entry.enabled,
            { tone: selected ? entry.tone : "neutral", compact: true }
          );
          if (entry.spriteName) {
            renderCombatSprite(
              k,
              entry.spriteName,
              menuX + menuW - 42,
              entryY + 10,
              { scale: COMBAT_MENU_ICON_SCALE }
            );
          }
          entryY += 24;
        }
      } else {
        drawMutedTextAtom(k, {
          x: menuX + 12,
          y: messageY + 10,
          text: "Actions",
          size: 10,
          tag: UI_TAG,
        });

        const rootOptions: Array<{
          id: CombatRootAction;
          label: string;
          tone: CombatMenuEntry["tone"];
          enabled: boolean;
          onChoose: () => void;
        }> = [
          {
            id: "fight",
            label: "Fight",
            tone: "danger",
            enabled: Boolean(fight?.available),
            onChoose: () => {
              menuMode = "fight";
              submenuIndex = 0;
              render();
            },
          },
          {
            id: "spells",
            label: "Spells",
            tone: "accent",
            enabled: spellOptions.length > 0,
            onChoose: () => {
              menuMode = "spells";
              submenuIndex = 0;
              render();
            },
          },
          {
            id: "pack",
            label: "Bag",
            tone: "good",
            enabled: true,
            onChoose: () => {
              menuMode = "pack";
              submenuIndex = 0;
              render();
            },
          },
          {
            id: "flee",
            label: "Run",
            tone: "warn",
            enabled: fleeOptions.length > 0,
            onChoose: executeRandomFlee,
          },
        ];

        const boxInnerW = menuW - 24;
        const buttonW = Math.floor((boxInnerW - 8) / 2);
        const firstRowY = messageY + 30;
        const secondRowY = firstRowY + 30;

        const positionFor = (
          id: CombatRootAction
        ): { x: number; y: number } => {
          if (id === "fight") {
            return { x: menuX + 12, y: firstRowY };
          }
          if (id === "spells") {
            return { x: menuX + 12 + buttonW + 8, y: firstRowY };
          }
          if (id === "pack") {
            return { x: menuX + 12, y: secondRowY };
          }
          return { x: menuX + 12 + buttonW + 8, y: secondRowY };
        };

        for (const option of rootOptions) {
          const position = positionFor(option.id);
          const selected = rootSelection === option.id;
          addButton(
            k,
            position.x,
            position.y,
            buttonW,
            `${selected ? "> " : ""}${option.label}`,
            option.onChoose,
            option.enabled,
            { tone: selected ? option.tone : "neutral", compact: true }
          );
        }
      }
    };

    const moveSubmenu = (delta: number) => {
      const state = cb.getState();
      const spellOptions = preparedSpellSlots(state).filter(
        (slot) => slot.skillId
      );
      const packOptions = itemsByActionType(state, "use_item").filter(
        (item) => item.available
      );
      const lengths: Record<Exclude<CombatMenuMode, "root">, number> = {
        fight: 1,
        spells: Math.max(1, spellOptions.length),
        pack: Math.max(1, packOptions.length),
      };
      const max = lengths[menuMode as Exclude<CombatMenuMode, "root">] ?? 1;
      submenuIndex = (submenuIndex + delta + max) % max;
      render();
    };

    const confirmSelection = () => {
      const state = cb.getState();
      const fight = firstItemByActionType(state, ACTION_TYPE.FIGHT);
      const fleeOptions = itemsByActionType(state, ACTION_TYPE.FLEE).filter(
        (item) => item.available
      );
      const spellOptions = preparedSpellSlots(state).filter(
        (slot) => slot.skillId
      );
      const packOptions = itemsByActionType(state, "use_item").filter(
        (item) => item.available
      );

      const executeCombatAction = (action: ActionItem | null) => {
        if (!action?.available) {
          return;
        }
        menuMode = "root";
        submenuIndex = 0;
        cb.doAction(action.action);
        if (!hasEncounter(cb.getState())) {
          k.go("gridNavigation");
        }
      };

      if (menuMode === "root") {
        if (rootSelection === "fight") {
          menuMode = "fight";
          submenuIndex = 0;
          render();
          return;
        }
        if (rootSelection === "spells") {
          menuMode = "spells";
          submenuIndex = 0;
          render();
          return;
        }
        if (rootSelection === "pack") {
          menuMode = "pack";
          submenuIndex = 0;
          render();
          return;
        }
        if (fleeOptions.length > 0) {
          const picked =
            fleeOptions[Math.floor(Math.random() * fleeOptions.length)] ??
            fleeOptions[0] ??
            null;
          executeCombatAction(picked);
        }
        return;
      }

      if (menuMode === "fight") {
        executeCombatAction(fight);
        return;
      }
      if (menuMode === "spells") {
        const selected = spellOptions[submenuIndex] ?? null;
        if (!(selected?.skillId && selected.available)) {
          return;
        }
        menuMode = "root";
        submenuIndex = 0;
        cb.castSpell(selected.skillId);
        if (!hasEncounter(cb.getState())) {
          k.go("gridNavigation");
        }
        return;
      }
      executeCombatAction(packOptions[submenuIndex] ?? null);
    };

    const moveMenu = (direction: "up" | "down" | "left" | "right") => {
      if (menuMode === "root") {
        rootSelection = moveRootSelection(rootSelection, direction);
        render();
        return;
      }
      if (direction === "up") {
        moveSubmenu(-1);
        return;
      }
      if (direction === "down") {
        moveSubmenu(1);
      }
    };

    k.onKeyPress("up", () => moveMenu("up"));
    k.onKeyPress("down", () => moveMenu("down"));
    k.onKeyPress("left", () => moveMenu("left"));
    k.onKeyPress("right", () => moveMenu("right"));
    k.onKeyPress("w", () => moveMenu("up"));
    k.onKeyPress("s", () => moveMenu("down"));
    k.onKeyPress("a", () => moveMenu("left"));
    k.onKeyPress("d", () => moveMenu("right"));
    k.onKeyPress("enter", confirmSelection);
    k.onKeyPress("space", confirmSelection);
    k.onKeyPress("escape", () => {
      if (menuMode !== "root") {
        menuMode = "root";
        submenuIndex = 0;
        render();
        return;
      }
      k.go("gridNavigation");
    });

    cb.setRefresh(render);
    render();
  });
}
