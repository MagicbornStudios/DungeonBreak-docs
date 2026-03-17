import {
  ACTION_CATALOG,
  ACTION_CONTRACTS,
  ACTION_INTENTS,
  ACTION_POLICIES,
  ACTION_TYPE,
  ARCHETYPE_PACK,
  CONTENT_SCHEMA_DOCUMENT,
  type ContentPackBundle,
  CUTSCENE_PACK,
  type CutsceneMessage,
  DIALOGUE_PACK,
  decodeContentPackBundle,
  EVENT_PACK,
  type FeedMessage,
  ITEM_PACK,
  initialFeed,
  type PlayUiAction,
  QUEST_PACK,
  ROOM_TEMPLATES,
  SKILL_PACK,
} from "@dungeonbreak/engine";
import kaplay from "kaplay";
import { formatActionButtonLabel } from "./action-renderer";
import {
  applyContentBundleVisualOverrides,
  preloadContentSprites,
} from "./content-visuals";
import {
  createGameBridge,
  type DispatchResult,
  dispatch,
  dispatchPreparedSpell,
  type GameState,
  loadGameBridge,
  refreshState,
  saveGame,
} from "./engine-bridge";
import { registerGridScene } from "./grid";
import { registerKaplayDebugButton } from "./kaplay-debug";
import { resetDiscoveryProgress } from "./navigation-helpers";
import type { SceneCallbacks } from "./scene-contracts";
import { addCutsceneOverlay, clearUi, UI_TAG } from "./shared";
import {
  DISPLAY_FONT_FAMILY,
  tonePalette,
  type UiTone,
  UI_FONT_FAMILY,
  uiPalette,
} from "./theme-tokens";
import { createUiStateStore } from "./ui-state-store";

const W = 800;
const H = 600;
const DEFAULT_CONTENT_PACK_URL = "/game/content-pack.bundle.v1.json";
const MENU_BUTTON_W = 264;
const OPENING_BEAT = {
  id: "opening-bad-teleport",
  title: "Bad Teleport",
  text: 'The spell tears sideways and slams Kael into the bottom floor.\n\n"Guess I got to get out."',
  turnIndex: 0,
} as const;

const RUNTIME_PACKS = {
  contentSchema: CONTENT_SCHEMA_DOCUMENT,
  actionCatalog: ACTION_CATALOG,
  actionIntents: ACTION_INTENTS,
  actionPolicies: ACTION_POLICIES,
  actionContracts: ACTION_CONTRACTS,
  roomTemplates: ROOM_TEMPLATES,
  itemPack: ITEM_PACK,
  skillPack: SKILL_PACK,
  archetypePack: ARCHETYPE_PACK,
  dialoguePack: DIALOGUE_PACK,
  cutscenePack: CUTSCENE_PACK,
  questPack: QUEST_PACK,
  eventPack: EVENT_PACK,
} satisfies Record<string, unknown>;
type RuntimePackKey = keyof typeof RUNTIME_PACKS;
interface MenuStatusCard {
  tone: UiTone;
  eyebrow: string;
  title: string;
  body: string;
}

async function waitForUiFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }
  await Promise.all([
    document.fonts.load(`16px "${UI_FONT_FAMILY}"`),
    document.fonts.load(`16px "${DISPLAY_FONT_FAMILY}"`),
  ]);
}

function addMenuActionButton(
  k: ReturnType<typeof kaplay>,
  x: number,
  y: number,
  width: number,
  label: string,
  onClick: () => void,
  enabled: boolean,
  tone: UiTone
): number {
  const height = 36;
  const palette = tonePalette[tone];
  const shadow = k.add([
    k.rect(width, height, { radius: 8 }),
    k.pos(x, y),
    k.color(
      uiPalette.panelShadow[0],
      uiPalette.panelShadow[1],
      uiPalette.panelShadow[2]
    ),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  const button = k.add([
    k.rect(width - 2, height - 2, { radius: 7 }),
    k.pos(x + 1, y + 1),
    k.area(),
    k.color(
      enabled ? palette.bg[0] : 54,
      enabled ? palette.bg[1] : 41,
      enabled ? palette.bg[2] : 42
    ),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  registerKaplayDebugButton({
    label,
    x,
    y,
    width,
    height,
  });
  k.add([
    k.text(label, { font: UI_FONT_FAMILY, size: 13 }),
    k.pos(x + width / 2, y + 11),
    k.anchor("center"),
    k.color(
      enabled ? palette.fg[0] : 164,
      enabled ? palette.fg[1] : 150,
      enabled ? palette.fg[2] : 142
    ),
    UI_TAG,
  ]);

  if (enabled) {
    const hover = [
      Math.min(255, palette.bg[0] + 18),
      Math.min(255, palette.bg[1] + 18),
      Math.min(255, palette.bg[2] + 18),
    ] as const;
    button.onHover(() => {
      button.color = k.rgb(hover[0], hover[1], hover[2]);
      shadow.color = k.rgb(36, 18, 12);
    });
    button.onHoverEnd(() => {
      button.color = k.rgb(palette.bg[0], palette.bg[1], palette.bg[2]);
      shadow.color = k.rgb(
        uiPalette.panelShadow[0],
        uiPalette.panelShadow[1],
        uiPalette.panelShadow[2]
      );
    });
    button.onClick(onClick);
  }

  return y + height + 10;
}

function describeContinueState(
  continueState: GameState | null
): MenuStatusCard {
  if (!continueState) {
    return {
      tone: "neutral",
      eyebrow: "Fresh Descent",
      title: "Wake On The Twelfth Floor",
      body: "No prior journey waits in the dark. Start a new run and climb room by room toward daylight.",
    };
  }

  const locationLine =
    continueState.look
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ??
    `Depth ${String(continueState.status.depth ?? "?")}`;

  return {
    tone: "good",
    eyebrow: "Journey In Progress",
    title: "Continue The Descent",
    body: `${locationLine}. Kael can pick up the climb from the last safe pause.`,
  };
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(obj)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, stableNormalize(obj[key])])
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function computeRuntimeHashes(): Promise<Record<RuntimePackKey, string>> {
  const entries = await Promise.all(
    Object.entries(RUNTIME_PACKS).map(
      async ([key, value]) => [key, await sha256Hex(stableJson(value))] as const
    )
  );
  return Object.fromEntries(entries) as Record<RuntimePackKey, string>;
}

function readContentPackUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("contentPackUrl");
  if (!raw) {
    return null;
  }
  if (raw === "default") {
    return DEFAULT_CONTENT_PACK_URL;
  }
  return raw;
}

function isContentPackStrictMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("contentPackStrict") === "1";
}

async function loadContentPackBundle(url: string): Promise<ContentPackBundle> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch content pack bundle (${response.status})`);
  }
  return decodeContentPackBundle(await response.text());
}

async function verifyContentPackParity(
  bundle: ContentPackBundle
): Promise<{ ok: boolean; mismatches: string[] }> {
  const runtimeHashes = await computeRuntimeHashes();
  const mismatches: string[] = [];
  for (const key of Object.keys(runtimeHashes) as RuntimePackKey[]) {
    const expected = bundle.hashes[key];
    const actual = runtimeHashes[key];
    if (!expected) {
      mismatches.push(`${key}: missing expected hash`);
      continue;
    }
    if (expected !== actual) {
      mismatches.push(
        `${key}: expected ${expected.slice(0, 8)} got ${actual.slice(0, 8)}`
      );
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}

function readCanonicalSeedFromBundle(bundle: ContentPackBundle): number | null {
  const actionContracts = bundle.packs?.actionContracts;
  if (!actionContracts) {
    return null;
  }
  const seed = actionContracts.canonicalSeedV1;
  if (typeof seed !== "number" || !Number.isFinite(seed)) {
    return null;
  }
  return seed;
}

function postErrorToParent(error: unknown): void {
  try {
    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage(
        {
          origin: "dungeonbreak:kaplay",
          type: "kaplay-error",
          error: String(error),
        },
        "*"
      );
    }
  } catch {
    /* ignore */
  }
}

async function main() {
  await waitForUiFonts();

  if (typeof window !== "undefined") {
    window.onerror = (msg, _url, _line, _col, err) => {
      postErrorToParent(err ?? msg);
      return false;
    };
    window.onunhandledrejection = (e) => {
      postErrorToParent(e.reason);
    };
  }

  const k = kaplay({
    width: W,
    height: H,
    scale: 1,
    crisp: true,
    background: [15, 23, 42],
  });

  k.setBackground(15, 23, 42);
  const noop = () => {
    /* no-op */
  };
  let state: GameState | null = null;
  const feedLines: string[] = [];
  let cutsceneQueue: CutsceneMessage[] = [];
  let cutsceneReturnScene: string | null = null;
  let refreshFn: () => void = noop;
  let menuRefresh: () => void = noop;
  const uiStore = createUiStateStore();
  const bootDiagnostics: string[] = [];
  let configuredSeed = 7;
  let continueState: GameState | null = null;
  let runtimeReady = false;
  let bootError: string | null = null;
  let menuAlert: string | null = null;

  const requireState = (): GameState => {
    if (!state) {
      throw new Error("Game state is not initialized.");
    }
    return state;
  };

  const addFeed = (msgs: FeedMessage[]) => {
    for (const msg of msgs) {
      feedLines.push(msg.text);
    }
  };

  const pushBootMessage = (text: string) => {
    bootDiagnostics.push(text);
    console.info(`[kaplay boot] ${text}`);
  };

  const setRefresh = (fn: () => void) => {
    refreshFn = fn;
  };

  const processCutscenes = () => {
    if (cutsceneQueue.length === 0) {
      if (cutsceneReturnScene) {
        const nextScene = cutsceneReturnScene;
        cutsceneReturnScene = null;
        k.go(nextScene);
        return;
      }
      refreshFn();
      return;
    }

    const message = cutsceneQueue[0];
    k.destroyAll("cutscene");
    addCutsceneOverlay(k, W, H, message.title, message.text, () => {
      cutsceneQueue = cutsceneQueue.slice(1);
      processCutscenes();
    });
  };

  const seedFeedForSession = (messages: string[]) => {
    feedLines.length = 0;
    for (const message of messages) {
      feedLines.push(message);
    }
  };

  const enterGameplay = async (
    nextState: GameState,
    options?: { intro?: boolean; notice?: string }
  ) => {
    state = refreshState(nextState);
    cutsceneQueue = [];
    k.destroyAll("cutscene");

    if (options?.intro) {
      uiStore.reset();
      resetDiscoveryProgress();
      seedFeedForSession(
        initialFeed(state.engine).map((message) => message.text)
      );
    } else {
      seedFeedForSession([
        options?.notice ?? "The descent resumes.",
        state.look,
      ]);
      uiStore.hydrate();
    }

    uiStore.setFogFromStatus(state.status);
    await saveGame(state);

    if (options?.intro) {
      cutsceneQueue = [OPENING_BEAT];
      cutsceneReturnScene = "gridNavigation";
      k.go("gridIntro");
      processCutscenes();
      return;
    }

    k.go("gridNavigation");
    refreshFn();
  };

  const doAction = (action: PlayUiAction) => {
    if (!state) {
      return;
    }
    const preActionGroups = state.groups;

    if (action.kind === "system") {
      if (action.systemAction === "look" || action.systemAction === "status") {
        state = refreshState(state);
        refreshFn();
        return;
      }

      if (action.systemAction === "save_slot") {
        saveGame(state).then(() => {
          feedLines.push("Journey saved.");
          refreshFn();
        });
        return;
      }

      if (action.systemAction === "load_slot") {
        loadGameBridge().then((loaded) => {
          if (!loaded) {
            feedLines.push("No saved journey found.");
            refreshFn();
            return;
          }
          state = loaded;
          uiStore.setFogFromStatus(state.status);
          feedLines.push("Journey resumed.");
          refreshFn();
        });
        return;
      }
      return;
    }

    const result = dispatch(state, action.playerAction) as DispatchResult;
    if (!result.ok) {
      feedLines.push(result.error);
      refreshFn();
      return;
    }

    addFeed(result.feed);
    state = refreshState(state);
    uiStore.setFogFromStatus(state.status);

    if (
      action.playerAction.actionType === ACTION_TYPE.TALK ||
      action.playerAction.actionType === ACTION_TYPE.CHOOSE_DIALOGUE
    ) {
      const sourceItem = preActionGroups
        .flatMap((group) => group.items)
        .find((item) => JSON.stringify(item.action) === JSON.stringify(action));
      const label = sourceItem
        ? formatActionButtonLabel(sourceItem)
        : action.playerAction.actionType;
      uiStore.recordDialogueStep(action, Number(state.status.turn ?? 0), label);
    }

    if (result.cutscenes.length > 0) {
      cutsceneQueue = result.cutscenes;
      processCutscenes();
      return;
    }

    if (result.escaped) {
      feedLines.push("You escaped the dungeon.");
    }

    saveGame(state).then(() => refreshFn());
  };

  const castSpell = (skillId: string) => {
    if (!state) {
      return;
    }
    const result = dispatchPreparedSpell(state, skillId) as DispatchResult;
    if (!result.ok) {
      feedLines.push(result.error);
      refreshFn();
      return;
    }

    addFeed(result.feed);
    state = refreshState(state);
    uiStore.setFogFromStatus(state.status);

    if (result.cutscenes.length > 0) {
      cutsceneQueue = result.cutscenes;
      processCutscenes();
      return;
    }

    if (result.escaped) {
      feedLines.push("You escaped the dungeon.");
    }

    saveGame(state).then(() => refreshFn());
  };

  const prepareSpellSlot = (slotIndex: number, skillId: string | null) => {
    if (!state) {
      return;
    }
    const outcome =
      skillId === null
        ? state.engine.clearPreparedSpellSlot(slotIndex)
        : state.engine.prepareSpell(slotIndex, skillId);
    if (!outcome.ok) {
      feedLines.push(`Spell prep failed: ${outcome.reason}.`);
      refreshFn();
      return;
    }

    state = refreshState(state);
    feedLines.push(
      skillId === null
        ? `Cleared spell slot ${slotIndex + 1}.`
        : `Prepared ${skillId.replace(/_/g, " ")} in slot ${slotIndex + 1}.`
    );
    saveGame(state).then(() => refreshFn());
  };

  const boot = async () => {
    uiStore.hydrate();
    try {
      const contentPackUrl = readContentPackUrl();
      const strictContentPack = isContentPackStrictMode();

      if (contentPackUrl) {
        try {
          const bundle = await loadContentPackBundle(contentPackUrl);
          applyContentBundleVisualOverrides(bundle);
          const parity = await verifyContentPackParity(bundle);
          const bundleSeed = readCanonicalSeedFromBundle(bundle);
          configuredSeed = bundleSeed ?? 7;
          if (parity.ok) {
            pushBootMessage(`[content-pack] parity OK (${contentPackUrl})`);
          } else {
            const details = parity.mismatches.slice(0, 4).join("; ");
            const message = `[content-pack] parity mismatch (${contentPackUrl}): ${details}`;
            if (strictContentPack) {
              throw new Error(message);
            }
            pushBootMessage(message);
          }
        } catch (error) {
          applyContentBundleVisualOverrides(null);
          const message =
            error instanceof Error ? error.message : String(error);
          if (strictContentPack) {
            throw error;
          }
          pushBootMessage(`[content-pack] load skipped: ${message}`);
        }
      }
      preloadContentSprites(k);

      continueState = await loadGameBridge(configuredSeed);
      runtimeReady = true;
    } catch (error) {
      bootError = error instanceof Error ? error.message : String(error);
      console.error("[kaplay boot] failed to prepare menu runtime", error);
    }

    const callbacks: SceneCallbacks = {
      getState: requireState,
      getUiState: () => uiStore.getState(),
      doAction,
      castSpell,
      prepareSpellSlot,
      setRefresh,
      feedLines,
    };

    registerGridScene(k, callbacks);
    menuRefresh();
  };

  k.scene("menu", () => {
    const render = () => {
      clearUi(k);
      k.destroyAll("cutscene");

      let statusCard: MenuStatusCard;
      if (bootError) {
        statusCard = {
          tone: "danger",
          eyebrow: "Gate Closed",
          title: "The Dungeon Would Not Open",
          body: "Something interrupted the descent. Refresh the page and try again.",
        };
      } else if (runtimeReady) {
        statusCard = describeContinueState(continueState);
      } else {
        statusCard = {
          tone: "warn",
          eyebrow: "Opening The Gate",
          title: "The Descent Is Preparing",
          body: "The dungeon is waking up. New Game and Continue will unlock as soon as the run is ready.",
        };
      }

      k.add([k.rect(W, H), k.pos(0, 0), k.color(13, 10, 16), UI_TAG]);
      k.add([
        k.rect(240, H - 60, { radius: 28 }),
        k.pos(34, 30),
        k.color(61, 23, 18),
        k.opacity(0.28),
        UI_TAG,
      ]);
      k.add([
        k.rect(188, H - 100, { radius: 28 }),
        k.pos(W - 232, 52),
        k.color(44, 20, 18),
        k.opacity(0.22),
        UI_TAG,
      ]);
      k.add([
        k.rect(W - 56, H - 64, { radius: 26 }),
        k.pos(28, 32),
        k.color(24, 17, 20),
        k.opacity(0.98),
        UI_TAG,
      ]);
      k.add([
        k.rect(W - 84, 2, { radius: 1 }),
        k.pos(42, 44),
        k.color(184, 140, 76),
        UI_TAG,
      ]);
      k.add([
        k.rect(406, 256, { radius: 22 }),
        k.pos(58, 86),
        k.color(34, 22, 22),
        k.opacity(0.97),
        UI_TAG,
      ]);
      k.add([
        k.rect(250, 256, { radius: 22 }),
        k.pos(488, 86),
        k.color(31, 20, 20),
        k.opacity(0.97),
        UI_TAG,
      ]);
      k.add([
        k.rect(550, 170, { radius: 22 }),
        k.pos(125, 364),
        k.color(29, 19, 19),
        k.opacity(0.97),
        UI_TAG,
      ]);
      k.add([
        k.text("Escape the Dungeon", {
          font: DISPLAY_FONT_FAMILY,
          size: 32,
        }),
        k.pos(90, 122),
        k.color(244, 227, 193),
        UI_TAG,
      ]);
      k.add([
        k.text("ASH AND STONE", { font: UI_FONT_FAMILY, size: 10 }),
        k.pos(92, 98),
        k.color(198, 160, 110),
        UI_TAG,
      ]);
      k.add([
        k.rect(220, 2, { radius: 1 }),
        k.pos(92, 156),
        k.color(184, 140, 76),
        UI_TAG,
      ]);
      k.add([
        k.text(
          "A bad teleport hurls Kael to the bottom of the dungeon.\nEvery room is a decision: bargain, search, fight, rest, or push upward before the depths close in.",
          { font: UI_FONT_FAMILY, size: 13, width: 330 }
        ),
        k.pos(92, 182),
        k.color(226, 214, 194),
        UI_TAG,
      ]);
      k.add([
        k.text('"Guess I got to get out."', {
          font: DISPLAY_FONT_FAMILY,
          size: 12,
        }),
        k.pos(92, 270),
        k.color(209, 171, 120),
        UI_TAG,
      ]);
      k.add([
        k.text(statusCard.eyebrow.toUpperCase(), {
          font: UI_FONT_FAMILY,
          size: 10,
        }),
        k.pos(516, 110),
        k.color(198, 160, 110),
        UI_TAG,
      ]);
      k.add([
        k.text(statusCard.title, {
          font: DISPLAY_FONT_FAMILY,
          size: 20,
          width: 190,
        }),
        k.pos(516, 142),
        k.color(
          tonePalette[statusCard.tone].fg[0],
          tonePalette[statusCard.tone].fg[1],
          tonePalette[statusCard.tone].fg[2]
        ),
        UI_TAG,
      ]);
      k.add([
        k.rect(182, 2, { radius: 1 }),
        k.pos(516, 198),
        k.color(
          tonePalette[statusCard.tone].bg[0],
          tonePalette[statusCard.tone].bg[1],
          tonePalette[statusCard.tone].bg[2]
        ),
        UI_TAG,
      ]);
      k.add([
        k.text(statusCard.body, {
          font: UI_FONT_FAMILY,
          size: 11,
          width: 190,
        }),
        k.pos(516, 220),
        k.color(222, 211, 192),
        UI_TAG,
      ]);
      if (continueState) {
        k.add([
          k.text("Saved Journey", { font: UI_FONT_FAMILY, size: 10 }),
          k.pos(516, 286),
          k.color(163, 139, 112),
          UI_TAG,
        ]);
        k.add([
          k.text(
            `Depth ${String(continueState.status.depth ?? "?")} • Room ${String(continueState.status.roomId ?? "?")}`,
              { font: UI_FONT_FAMILY, size: 10, width: 190 }
          ),
          k.pos(516, 306),
          k.color(192, 234, 216),
          UI_TAG,
        ]);
      }

      let buttonY = 402;
      buttonY = addMenuActionButton(
        k,
        (W - MENU_BUTTON_W) / 2,
        buttonY,
        MENU_BUTTON_W,
        "New Game",
        () => {
          if (!runtimeReady || bootError) {
            return;
          }
          const freshState = createGameBridge(configuredSeed);
          enterGameplay(freshState, { intro: true }).catch((error: unknown) => {
            console.error("[menu] failed to start new game", error);
            menuAlert =
              "The gate shuddered shut. Try starting the descent again.";
            menuRefresh();
          });
        },
        runtimeReady && bootError === null,
        "accent"
      );
      buttonY = addMenuActionButton(
        k,
        (W - MENU_BUTTON_W) / 2,
        buttonY,
        MENU_BUTTON_W,
        "Continue",
        () => {
          if (!continueState) {
            return;
          }
          enterGameplay(continueState, {
            notice: "The descent resumes.",
          }).catch((error: unknown) => {
            console.error("[menu] failed to continue journey", error);
            menuAlert =
              "The saved journey would not wake. Try again in a moment.";
            menuRefresh();
          });
        },
        runtimeReady && continueState !== null && bootError === null,
        "good"
      );

      k.add([
        k.text("Step back into the dark and choose your way upward.", {
          font: UI_FONT_FAMILY,
          size: 11,
          width: 470,
        }),
        k.pos(W / 2, buttonY + 8),
        k.color(191, 176, 154),
        k.anchor("center"),
        UI_TAG,
      ]);

      if (menuAlert) {
        k.add([
          k.text(menuAlert, {
            font: UI_FONT_FAMILY,
            size: 10,
            width: 470,
          }),
          k.pos(W / 2, buttonY + 44),
          k.color(252, 206, 196),
          k.anchor("center"),
          UI_TAG,
        ]);
      }
    };

    menuRefresh = render;
    render();
  });

  k.scene("gridIntro", () => {
    clearUi(k);
    k.destroyAll("cutscene");
    k.add([k.rect(W, H), k.pos(0, 0), k.color(12, 9, 14), UI_TAG]);
    k.add([
      k.rect(W - 64, H - 96, { radius: 24 }),
      k.pos(32, 48),
      k.color(28, 18, 20),
      k.opacity(0.98),
      UI_TAG,
    ]);
    k.add([
      k.rect(W - 112, 2, { radius: 1 }),
      k.pos(56, 72),
      k.color(184, 140, 76),
      UI_TAG,
    ]);
    processCutscenes();
  });

  k.go("menu");
  boot().catch((error: unknown) => {
    postErrorToParent(error);
  });
}

main().catch((error: unknown) => {
  postErrorToParent(error);
});
