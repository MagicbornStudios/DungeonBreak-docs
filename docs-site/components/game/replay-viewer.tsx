"use client";

import { useMemo, useState } from "react";
import {
  buildActionGroups,
  GameEngine,
  initialFeed,
  toFeedMessages,
  type FeedMessage,
  type GameSnapshot,
  type PlayerAction,
} from "@dungeonbreak/engine";
import { ActionPanel } from "@/components/game/action-panel";

type ActionTraceEntry = {
  playerTurn: number;
  action: { actionType: string; payload?: Record<string, unknown> };
};
import { FeedPanel } from "@/components/game/feed-panel";
import { StatusPanel } from "@/components/game/status-panel";
type ReportRun = {
  actionTrace: ActionTraceEntry[];
  turnTimeline?: Array<{ playerTurn: number; selectedAction?: { actionType: string } }>;
};

type ReplayReport = {
  seed: number;
  run: ReportRun;
};

type ReplayViewerProps = {
  report: ReplayReport;
};

function replayToTurn(
  seed: number,
  actionTrace: ActionTraceEntry[],
  upToTurn: number,
): {
  snapshot: GameSnapshot;
  messages: FeedMessage[];
  status: Record<string, unknown>;
  engine: GameEngine;
} {
  const engine = GameEngine.create(seed);
  const messages: FeedMessage[] = [...initialFeed(engine)];

  for (let i = 0; i < upToTurn && i < actionTrace.length; i++) {
    const action = actionTrace[i].action as PlayerAction;
    const result = engine.dispatch(action);
    messages.push(...toFeedMessages(result));
  }

  return {
    snapshot: engine.snapshot(),
    messages: messages.slice(-360),
    status: engine.status(),
    engine,
  };
}

export function ReplayViewer({ report }: ReplayViewerProps) {
  const { seed, run } = report;
  const { actionTrace } = run;
  const [currentTurn, setCurrentTurn] = useState(0);

  const { snapshot, messages, status, engine } = useMemo(() => {
    return replayToTurn(seed, actionTrace, currentTurn);
  }, [seed, actionTrace, currentTurn]);

  const groups = useMemo(() => buildActionGroups(engine), [engine]);

  const player = snapshot?.entities?.[snapshot.playerId];
  if (!snapshot || !player) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="replay-viewer">
      <div className="rounded border bg-muted/20 p-2">
        <p className="text-xs text-muted-foreground mb-2">
          Replay viewer — click a turn to seek. Read-only.
        </p>
        <div className="play-grid">
          <ActionPanel
            groups={groups}
            onAction={() => {}}
            busy={true}
            blockedByCutscene={true}
          />
          <FeedPanel messages={messages} status="idle" />
          <StatusPanel snapshot={snapshot} status={status} />
        </div>
      </div>

      <ReplayTimeline
        actionTrace={actionTrace}
        currentTurn={currentTurn}
        onSeek={setCurrentTurn}
      />
    </div>
  );
}

type ReplayTimelineProps = {
  actionTrace: ActionTraceEntry[];
  currentTurn: number;
  onSeek: (turn: number) => void;
};

function ReplayTimeline({
  actionTrace,
  currentTurn,
  onSeek,
}: ReplayTimelineProps) {
  return (
    <section className="rounded border p-3" data-testid="replay-timeline">
      <h3 className="text-sm font-medium mb-2">Timeline — click to seek</h3>
      <div className="max-h-[280px] overflow-y-auto space-y-1 font-mono text-xs">
        <button
          type="button"
          onClick={() => onSeek(0)}
          className={`block w-full text-left px-2 py-1.5 rounded ${currentTurn === 0 ? "bg-primary/20 border border-primary/50" : "hover:bg-muted/50"}`}
        >
          [0] Initial
        </button>
        {actionTrace.map((row, i) => {
          const turn = i + 1;
          const actionType = row.action?.actionType ?? "?";
          const isCurrent = currentTurn === turn;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(turn)}
              className={`block w-full text-left px-2 py-1.5 rounded ${isCurrent ? "bg-primary/20 border border-primary/50" : "hover:bg-muted/50"}`}
            >
              [{turn}] {actionType}
            </button>
          );
        })}
      </div>
    </section>
  );
}
