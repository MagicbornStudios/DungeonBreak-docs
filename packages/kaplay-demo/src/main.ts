import kaplay from "kaplay";
import {
  ACTION_CATALOG,
  ACTION_CONTRACTS,
  ACTION_INTENTS,
  ACTION_POLICIES,
  ARCHETYPE_PACK,
  CUTSCENE_PACK,
  DIALOGUE_PACK,
  EVENT_PACK,
  initialFeed,
  ITEM_PACK,
  QUEST_PACK,
  ROOM_TEMPLATES,
  SKILL_PACK,
  type CutsceneMessage,
  type FeedMessage,
  type PlayUiAction,
} from "@dungeonbreak/engine";
import {
  createGameBridge,
  loadGameBridge,
  saveGame,
  dispatch,
  refreshState,
  type GameState,
  type DispatchResult,
} from "./engine-bridge";
import { registerFirstPersonScene } from "./first-person";
import { registerGridScene } from "./grid";
import { addCutsceneOverlay } from "./shared";
import type { SceneCallbacks } from "./scene-contracts";
import { createUiStateStore } from "./ui-state-store";
import { formatActionButtonLabel } from "./action-renderer";

const W = 800;
const H = 600;
const DEFAULT_CONTENT_PACK_URL = "/game/content-pack.bundle.v1.json";

type ContentPackBundle = {
  schemaVersion: string;
  enginePackage?: { name?: string; version?: string };
  hashes: Record<string, string>;
  packs: Record<string, unknown>;
};

const RUNTIME_PACKS: Record<string, unknown> = {
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
};

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(obj)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, stableNormalize(obj[key])]),
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
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function computeRuntimeHashes(): Promise<Record<string, string>> {
  const entries = await Promise.all(
    Object.entries(RUNTIME_PACKS).map(async ([key, value]) => [key, await sha256Hex(stableJson(value))] as const),
  );
  return Object.fromEntries(entries);
}

function readContentPackUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("contentPackUrl");
  if (!raw) return null;
  if (raw === "default") return DEFAULT_CONTENT_PACK_URL;
  return raw;
}

function isContentPackStrictMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("contentPackStrict") === "1";
}

async function loadContentPackBundle(url: string): Promise<ContentPackBundle> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch content pack bundle (${response.status})`);
  }
  return (await response.json()) as ContentPackBundle;
}

async function verifyContentPackParity(bundle: ContentPackBundle): Promise<{ ok: boolean; mismatches: string[] }> {
  const runtimeHashes = await computeRuntimeHashes();
  const mismatches: string[] = [];
  for (const key of Object.keys(runtimeHashes)) {
    const expected = bundle.hashes[key];
    const actual = runtimeHashes[key];
    if (!expected) {
      mismatches.push(`${key}: missing expected hash`);
      continue;
    }
    if (expected !== actual) {
      mismatches.push(`${key}: expected ${expected.slice(0, 8)} got ${actual.slice(0, 8)}`);
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}

function readCanonicalSeedFromBundle(bundle: ContentPackBundle): number | null {
  const actionContracts = bundle.packs?.actionContracts;
  if (!actionContracts || typeof actionContracts !== "object") {
    return null;
  }
  const seed = (actionContracts as Record<string, unknown>).canonicalSeedV1;
  if (typeof seed !== "number" || !Number.isFinite(seed)) {
    return null;
  }
  return seed;
}

function main() {
  const k = kaplay({
    width: W,
    height: H,
    scale: 1,
    crisp: true,
    background: [15, 23, 42],
  });

  k.setBackground(15, 23, 42);

  let state: GameState | null = null;
  const feedLines: string[] = [];
  let cutsceneQueue: CutsceneMessage[] = [];
  let refreshFn: () => void = () => {};
  const uiStore = createUiStateStore();

  const addFeed = (msgs: FeedMessage[]) => {
    for (const msg of msgs) {
      feedLines.push(msg.text);
    }
  };

  const setRefresh = (fn: () => void) => {
    refreshFn = fn;
  };

  const processCutscenes = () => {
    if (cutsceneQueue.length === 0) {
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

  const doAction = (action: PlayUiAction) => {
    if (!state) return;
    const preActionGroups = state.groups;

    if (action.kind === "system") {
      if (action.systemAction === "look" || action.systemAction === "status") {
        state = refreshState(state);
        refreshFn();
        return;
      }

      if (action.systemAction === "save_slot") {
        void saveGame(state).then(() => {
          feedLines.push("Saved to autosave slot.");
          refreshFn();
        });
        return;
      }

      if (action.systemAction === "load_slot") {
        void loadGameBridge().then((loaded) => {
          if (!loaded) {
            feedLines.push("No autosave found.");
            refreshFn();
            return;
          }
          state = loaded;
          feedLines.push("Loaded autosave.");
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

    if (action.playerAction.actionType === "talk" || action.playerAction.actionType === "choose_dialogue") {
      const sourceItem = preActionGroups
        .flatMap((group) => group.items)
        .find((item) => JSON.stringify(item.action) === JSON.stringify(action));
      const label = sourceItem ? formatActionButtonLabel(sourceItem) : action.playerAction.actionType;
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

    void saveGame(state).then(() => refreshFn());
  };

  const boot = async () => {
    uiStore.hydrate();
    const contentPackUrl = readContentPackUrl();
    const strictContentPack = isContentPackStrictMode();
    let configuredSeed = 7;

    if (contentPackUrl) {
      try {
        const bundle = await loadContentPackBundle(contentPackUrl);
        const parity = await verifyContentPackParity(bundle);
        const bundleSeed = readCanonicalSeedFromBundle(bundle);
        configuredSeed = bundleSeed ?? 7;
        if (parity.ok) {
          feedLines.push(`[content-pack] parity OK (${contentPackUrl})`);
        } else {
          const details = parity.mismatches.slice(0, 4).join("; ");
          const message = `[content-pack] parity mismatch (${contentPackUrl}): ${details}`;
          if (strictContentPack) {
            throw new Error(message);
          }
          feedLines.push(message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (strictContentPack) {
          throw error;
        }
        feedLines.push(`[content-pack] load skipped: ${message}`);
      }
    }

    const loaded = await loadGameBridge(configuredSeed);
    state = loaded ?? createGameBridge(configuredSeed);

    if (!loaded) {
      addFeed(initialFeed(state.engine));
      await saveGame(state);
    } else {
      feedLines.push("Autosave loaded.");
    }
    uiStore.setFogFromStatus(state.status);

    const callbacks: SceneCallbacks = {
      getState: () => state as GameState,
      getUiState: () => uiStore.getState(),
      doAction,
      setRefresh,
      feedLines,
    };

    registerFirstPersonScene(k, callbacks);
    registerGridScene(k, callbacks);

    k.go("firstPerson");
  };

  k.scene("menu", () => {
    k.add([
      k.text("Escape the Dungeon", { size: 32 }),
      k.pos(W / 2, H / 2 - 60),
      k.color(255, 255, 255),
      k.anchor("center"),
    ]);
    k.add([
      k.text("Loading...", { size: 14 }),
      k.pos(W / 2, H / 2),
      k.color(180, 180, 180),
      k.anchor("center"),
    ]);
  });

  k.go("menu");
  void boot();
}

main();
