"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameSnapshot, PersistenceAdapter } from "@dungeonbreak/engine";
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
  type PlayUiAction,
} from "@dungeonbreak/engine";
import { ActionPanel } from "@/components/game/action-panel";
import { CutsceneQueueModal } from "@/components/game/cutscene-queue-modal";
import { FeedPanel } from "@/components/game/feed-panel";
import { StatusPanel } from "@/components/game/status-panel";

const AUTO_SLOT_ID = "autosave";
const AUTO_SLOT_NAME = "Auto Save";
const NAMED_SLOT_ID = "slot-a";
const NAMED_SLOT_NAME = "Slot A";

type ReadyState = {
  engine: GameEngine;
  persistence: PersistenceAdapter;
};

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

  const onAction = useCallback(
    async (action: PlayUiAction) => {
      if (!ready || busy || blockedByCutscene) {
        return;
      }

      setBusy(true);
      try {
        const { engine, persistence } = ready;

        if (action.kind === "system") {
          await runSystemAction(action);
          return;
        }

        const result = engine.dispatch(action.playerAction);
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
      } finally {
        setBusy(false);
      }
    },
    [appendMessages, blockedByCutscene, busy, ready, refreshFromEngine, runSystemAction],
  );

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
