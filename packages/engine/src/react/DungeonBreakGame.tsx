"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameSnapshot } from "../escape-the-dungeon/core/types";
import { GameEngine } from "../escape-the-dungeon/engine/game";
import { createPersistence, type PersistenceAdapter } from "../escape-the-dungeon/persistence/indexeddb";
import { buildActionGroups, extractCutsceneQueue, initialFeed, toFeedMessages } from "../escape-the-dungeon/ui/presenter";
import type { ActionGroup, CutsceneMessage, FeedMessage, PlayUiAction } from "../escape-the-dungeon/ui/types";

const AUTO_SLOT_ID = "autosave";
const AUTO_SLOT_NAME = "Auto Save";

type ReadyState = {
  engine: GameEngine;
  persistence: PersistenceAdapter;
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.9rem",
  gridTemplateColumns: "minmax(220px, 280px) minmax(420px, 1fr) minmax(240px, 340px)",
  minHeight: "70vh",
};

const columnStyle: React.CSSProperties = {
  border: "1px solid #d6d6d6",
  borderRadius: "10px",
  padding: "0.7rem",
  overflow: "auto",
  background: "white",
};

const messageStyle: React.CSSProperties = {
  borderBottom: "1px solid #efefef",
  paddingBottom: "0.35rem",
  marginBottom: "0.35rem",
  whiteSpace: "pre-wrap",
};

export interface DungeonBreakGameProps {
  seed?: number;
  title?: string;
}

export function DungeonBreakGame({ seed = 7, title = "Escape the Dungeon" }: DungeonBreakGameProps) {
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
    setMessages((current) => [...current, ...nextMessages].slice(-360));
  }, []);

  const refresh = useCallback((engine: GameEngine) => {
    setGroups(buildActionGroups(engine));
    setSnapshot(engine.snapshot());
    setStatus(engine.status());
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const engine = GameEngine.create(seed);
      const persistence = createPersistence();
      const bootMessages: FeedMessage[] = [];

      const loaded = await persistence.loadSlot(AUTO_SLOT_ID);
      if (loaded) {
        engine.restore(loaded.snapshot);
        bootMessages.push({
          id: `sys-${messageCounter.current++}`,
          text: `Loaded '${loaded.name}' from autosave.`,
          tone: "system",
        });
      } else {
        await persistence.saveSlot(AUTO_SLOT_ID, engine.snapshot(), AUTO_SLOT_NAME);
        bootMessages.push({
          id: `sys-${messageCounter.current++}`,
          text: "No autosave found. New run started.",
          tone: "system",
        });
      }
      bootMessages.push(...initialFeed(engine));

      if (!mounted) {
        return;
      }
      setReady({ engine, persistence });
      setMessages(bootMessages);
      refresh(engine);
    };

    void boot();
    return () => {
      mounted = false;
    };
  }, [refresh, seed]);

  const blockedByCutscene = cutsceneQueue.length > 0;

  const runAction = useCallback(
    async (action: PlayUiAction) => {
      if (!ready || busy || blockedByCutscene) {
        return;
      }

      setBusy(true);
      try {
        const { engine, persistence } = ready;

        if (action.kind === "system") {
          if (action.systemAction === "look") {
            appendMessages([{ id: `sys-${messageCounter.current++}`, text: engine.look(), tone: "system" }]);
          } else if (action.systemAction === "status") {
            appendMessages([
              { id: `sys-${messageCounter.current++}`, text: JSON.stringify(engine.status(), null, 2), tone: "system" },
            ]);
          }
          return;
        }

        const result = engine.dispatch(action.playerAction);
        appendMessages(toFeedMessages(result));
        const cutscenes = extractCutsceneQueue(result);
        if (cutscenes.length > 0) {
          setCutsceneQueue((current) => [...current, ...cutscenes]);
        }

        await persistence.saveSlot(AUTO_SLOT_ID, engine.snapshot(), AUTO_SLOT_NAME);
        refresh(engine);
      } finally {
        setBusy(false);
      }
    },
    [appendMessages, blockedByCutscene, busy, ready, refresh],
  );

  const grid = useMemo(() => ({ ...gridStyle, opacity: busy ? 0.9 : 1 }), [busy]);
  const player = snapshot ? snapshot.entities[snapshot.playerId] : null;
  const currentCutscene = cutsceneQueue[0];

  if (!snapshot || !ready || !player) {
    return (
      <div style={{ border: "1px solid #d6d6d6", borderRadius: "10px", padding: "1rem" }}>
        Loading {title}...
      </div>
    );
  }

  return (
    <div data-testid="dungeonbreak-engine-component">
      <div style={{ marginBottom: "0.8rem" }}>
        <h2 style={{ fontSize: "1.35rem", marginBottom: "0.3rem" }}>{title}</h2>
        <p style={{ color: "#555", margin: 0 }}>Button-first gameplay. One action equals one turn.</p>
      </div>
      <div style={grid}>
        <section style={columnStyle}>
          {groups.map((group) => (
            <div key={group.id} style={{ marginBottom: "0.7rem" }}>
              <h3 style={{ marginBottom: "0.35rem" }}>{group.title}</h3>
              {group.items.map((item) => (
                <div key={item.id} style={{ marginBottom: "0.25rem" }}>
                  <button
                    data-testid={item.id}
                    disabled={busy || blockedByCutscene || !item.available}
                    onClick={() => {
                      void runAction(item.action);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.45rem",
                      borderRadius: "8px",
                      border: "1px solid #d0d0d0",
                      background: item.available ? "#f5f5f5" : "#fdfdfd",
                      cursor: item.available ? "pointer" : "not-allowed",
                    }}
                    type="button"
                  >
                    {item.label}
                  </button>
                  {!item.available && item.blockedReasons.length > 0 ? (
                    <div style={{ color: "#7a7a7a", fontSize: "0.75rem", marginTop: "0.12rem" }}>
                      {item.blockedReasons.join("; ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </section>

        <section style={columnStyle}>
          {messages.map((message) => (
            <div key={message.id} style={messageStyle}>
              {message.text}
            </div>
          ))}
        </section>

        <section style={columnStyle}>
          <h3>Status</h3>
          <p>
            Depth {String(status.depth ?? player.depth)} - {String(status.roomId ?? player.roomId)}
          </p>
          <p>
            Act {String(status.act ?? "?")} / Chapter {String(status.chapter ?? "?")}
          </p>
          <p>
            HP {String(status.health ?? player.health)} | Energy {String(status.energy ?? player.energy)}
          </p>
          <p>
            Level {String(status.level ?? 1)} | XP {String(player.xp)}
          </p>
          <p>
            Pressure {String(status.pressure ?? "-")} / {String(status.pressureCap ?? "-")}
          </p>
          <h4>Traits</h4>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(status.traits ?? player.traits, null, 2)}</pre>
          <h4>Features</h4>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(status.features ?? player.features, null, 2)}</pre>
        </section>
      </div>

      {currentCutscene ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ background: "white", borderRadius: "12px", padding: "1rem", width: "min(620px, 100%)" }}>
            <h3 style={{ marginTop: 0 }}>{currentCutscene.title}</h3>
            <p>{currentCutscene.text}</p>
            <button
              onClick={() => setCutsceneQueue((current) => current.slice(1))}
              style={{ padding: "0.45rem 0.8rem", borderRadius: "8px", border: "1px solid #d0d0d0" }}
              type="button"
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
