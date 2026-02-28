"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameSnapshot, PersistenceAdapter } from "@dungeonbreak/engine";
import { AssistantFrameProvider, ModelContextRegistry } from "@assistant-ui/react";
import {
  buildActionGroups,
  createPersistence,
  extractCutsceneQueue,
  GameEngine,
  initialFeed,
  toFeedMessages,
  type ActionGroup,
  type CutsceneMessage,
  type FeedMessage,
  type PlayerAction,
  type PlayUiAction,
} from "@dungeonbreak/engine";
import { z } from "zod/v3";
import { ActionPanel } from "@/components/game/action-panel";
import { CutsceneQueueModal } from "@/components/game/cutscene-queue-modal";
import { FeedPanel } from "@/components/game/feed-panel";
import { StatusPanel } from "@/components/game/status-panel";
import { dispatchFrameAction } from "@/lib/assistant-frame/frame-actions";

const AUTO_SLOT_ID = "autosave";
const AUTO_SLOT_NAME = "Auto Save";
const NAMED_SLOT_ID = "slot-a";
const NAMED_SLOT_NAME = "Slot A";

type ReadyState = {
  engine: GameEngine;
  persistence: PersistenceAdapter;
};

type PlayerDispatchResult =
  | { ok: true; status: Record<string, unknown>; look: string; escaped: boolean }
  | { ok: false; error: string };

const formatStatus = (status: Record<string, unknown>): string => {
  const lines = [
    `Depth ${String(status.depth ?? "?")} - ${String(status.roomId ?? "?")}`,
    `Act ${String(status.act ?? "?")} / Chapter ${String(status.chapter ?? "?")}`,
    `HP ${String(status.health ?? "?")} | Energy ${String(status.energy ?? "?")} | Level ${String(status.level ?? "?")}`,
    `Faction ${String(status.faction ?? "?")} | Reputation ${String(status.reputation ?? "?")}`,
  ];
  return lines.join("\n");
};

const makeSystemMessage = (id: string, text: string): FeedMessage => ({
  id,
  text,
  tone: "system",
});

export function PlayGameShell() {
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [groups, setGroups] = useState<ActionGroup[]>([]);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [status, setStatus] = useState<Record<string, unknown>>({});
  const [cutsceneQueue, setCutsceneQueue] = useState<CutsceneMessage[]>([]);
  const messageCounter = useRef(1000);
  const readyRef = useRef<ReadyState | null>(null);
  const cutsceneQueueRef = useRef<CutsceneMessage[]>([]);
  const dispatchPlayerActionRef = useRef<(action: PlayerAction) => Promise<PlayerDispatchResult>>(
    async () => ({ ok: false, error: "engine_not_ready" }),
  );

  const appendMessages = useCallback((nextMessages: FeedMessage[]) => {
    if (nextMessages.length === 0) {
      return;
    }
    setMessages((current) => [...current, ...nextMessages].slice(-320));
  }, []);

  const refreshFromEngine = useCallback((engine: GameEngine) => {
    setGroups(buildActionGroups(engine));
    setSnapshot(engine.snapshot());
    setStatus(engine.status());
  }, []);

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    cutsceneQueueRef.current = cutsceneQueue;
  }, [cutsceneQueue]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const engine = GameEngine.create(7);
      const persistence = createPersistence();

      const bootMessages: FeedMessage[] = [];
      const loaded = await persistence.loadSlot(AUTO_SLOT_ID);
      if (loaded) {
        engine.restore(loaded.snapshot);
        bootMessages.push(makeSystemMessage(`sys-${messageCounter.current++}`, `Loaded '${loaded.name}' from autosave.`));
      } else {
        await persistence.saveSlot(AUTO_SLOT_ID, engine.snapshot(), AUTO_SLOT_NAME);
        bootMessages.push(makeSystemMessage(`sys-${messageCounter.current++}`, "No autosave found. New run started."));
      }

      bootMessages.push(...initialFeed(engine));

      if (!mounted) {
        return;
      }

      setReady({ engine, persistence });
      setMessages(bootMessages);
      refreshFromEngine(engine);
    };

    void boot();

    return () => {
      mounted = false;
    };
  }, [refreshFromEngine]);

  const blockedByCutscene = cutsceneQueue.length > 0;

  const runSystemAction = useCallback(
    async (action: PlayUiAction & { kind: "system" }) => {
      if (!ready) {
        return;
      }
      const { engine, persistence } = ready;

      if (action.systemAction === "look") {
        appendMessages([makeSystemMessage(`sys-${messageCounter.current++}`, engine.look())]);
        return;
      }

      if (action.systemAction === "status") {
        appendMessages([makeSystemMessage(`sys-${messageCounter.current++}`, formatStatus(engine.status()))]);
        return;
      }

      if (action.systemAction === "save_slot") {
        await persistence.saveSlot(NAMED_SLOT_ID, engine.snapshot(), NAMED_SLOT_NAME);
        appendMessages([makeSystemMessage(`sys-${messageCounter.current++}`, "Saved Slot A.")]);
        return;
      }

      if (action.systemAction === "load_slot") {
        const loaded = await persistence.loadSlot(NAMED_SLOT_ID);
        if (!loaded) {
          appendMessages([makeSystemMessage(`sys-${messageCounter.current++}`, "Slot A is empty.")]);
          return;
        }
        engine.restore(loaded.snapshot);
        refreshFromEngine(engine);
        appendMessages([
          makeSystemMessage(`sys-${messageCounter.current++}`, "Loaded Slot A."),
          makeSystemMessage(`sys-${messageCounter.current++}`, engine.look()),
        ]);
      }
    },
    [appendMessages, ready, refreshFromEngine],
  );

  const dispatchPlayerAction = useCallback(
    async (playerAction: PlayerAction): Promise<PlayerDispatchResult> => {
      if (!ready) {
        return { ok: false, error: "engine_not_ready" };
      }
      if (busy) {
        return { ok: false, error: "turn_busy" };
      }
      if (blockedByCutscene) {
        return { ok: false, error: "cutscene_blocking" };
      }

      setBusy(true);
      try {
        const { engine, persistence } = ready;
        const result = engine.dispatch(playerAction);
        const feedRows = toFeedMessages(result);
        appendMessages(feedRows);

        const cutscenes = extractCutsceneQueue(result);
        if (cutscenes.length > 0) {
          setCutsceneQueue((current) => [...current, ...cutscenes]);
        }

        if (result.escaped) {
          appendMessages([makeSystemMessage(`sys-${messageCounter.current++}`, "Kael escaped the dungeon.")]);
        }

        await persistence.saveSlot(AUTO_SLOT_ID, engine.snapshot(), AUTO_SLOT_NAME);
        refreshFromEngine(engine);
        return {
          ok: true,
          escaped: result.escaped,
          status: engine.status(),
          look: engine.look(),
        };
      } finally {
        setBusy(false);
      }
    },
    [appendMessages, blockedByCutscene, busy, ready, refreshFromEngine],
  );

  useEffect(() => {
    dispatchPlayerActionRef.current = dispatchPlayerAction;
  }, [dispatchPlayerAction]);

  const onAction = useCallback(
    async (action: PlayUiAction) => {
      if (!ready || busy || blockedByCutscene) {
        return;
      }
      if (action.kind === "system") {
        setBusy(true);
        try {
          await runSystemAction(action);
        } finally {
          setBusy(false);
        }
        return;
      }
      await dispatchPlayerAction(action.playerAction);
    },
    [blockedByCutscene, busy, dispatchPlayerAction, ready, runSystemAction],
  );

  useEffect(() => {
    const registry = new ModelContextRegistry();
    registry.addInstruction(
      "You are operating Escape the Dungeon through structured tools. Prefer legal actions and keep one action per turn.",
    );

    registry.addTool({
      toolName: "game_status",
      description: "Read the current game status and look text.",
      parameters: z.object({}),
      execute: async () => {
        const current = readyRef.current;
        if (!current) {
          return { ok: false, error: "engine_not_ready" };
        }
        return {
          ok: true,
          status: current.engine.status(),
          look: current.engine.look(),
          cutsceneBlocked: cutsceneQueueRef.current.length > 0,
        };
      },
    });

    registry.addTool({
      toolName: "list_actions",
      description: "List grouped actions currently available to Kael.",
      parameters: z.object({}),
      execute: async () => {
        const current = readyRef.current;
        if (!current) {
          return { ok: false, error: "engine_not_ready" };
        }
        return {
          ok: true,
          groups: buildActionGroups(current.engine),
        };
      },
    });

    registry.addTool({
      toolName: "dispatch_action",
      description: "Dispatch one gameplay action for Kael.",
      parameters: z.object({
        action_type: z.string().min(1),
        payload: z.record(z.unknown()).optional(),
      }),
      execute: async ({ action_type, payload }) => {
        return dispatchFrameAction(action_type, payload, dispatchPlayerActionRef.current);
      },
    });

    registry.addTool({
      toolName: "dismiss_cutscene",
      description: "Dismiss the next blocking cutscene entry.",
      parameters: z.object({}),
      execute: async () => {
        if (cutsceneQueueRef.current.length <= 0) {
          return { ok: false, error: "no_cutscene_pending" };
        }
        setCutsceneQueue((current) => current.slice(1));
        return { ok: true };
      },
    });

    const unsubscribe = AssistantFrameProvider.addModelContextProvider(registry);
    return () => {
      unsubscribe();
      AssistantFrameProvider.dispose();
    };
  }, []);

  const dismissCutscene = useCallback(() => {
    setCutsceneQueue((current) => current.slice(1));
  }, []);

  const shellClass = useMemo(
    () => (busy ? "play-grid play-grid-busy" : "play-grid"),
    [busy],
  );

  if (!ready || !snapshot) {
    return <div className="play-loading" data-testid="play-loading">Loading game...</div>;
  }

  return (
    <div className="play-shell" data-testid="play-game-shell">
      <div className={shellClass}>
        <ActionPanel blockedByCutscene={blockedByCutscene} busy={busy} groups={groups} onAction={onAction} />
        <FeedPanel messages={messages} status={busy ? "busy" : "idle"} />
        <StatusPanel snapshot={snapshot} status={status} />
      </div>
      <CutsceneQueueModal onDismissNext={dismissCutscene} queue={cutsceneQueue} />
    </div>
  );
}
