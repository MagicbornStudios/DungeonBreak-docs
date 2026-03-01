"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EntityState, GameSnapshot } from "@dungeonbreak/engine";

type StatusPanelProps = {
  snapshot: GameSnapshot;
  status: Record<string, unknown>;
};

const formatNumber = (value: unknown): string => {
  if (typeof value !== "number") {
    return String(value ?? "-");
  }
  return Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
};

const typedRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
};

type GameplayDebugSectionProps = {
  nearby: EntityState[];
  traits: Record<string, unknown>;
  features: Record<string, unknown>;
  quests: Record<string, unknown>;
  recentEvents: unknown[];
  status: Record<string, unknown>;
  typedRecord: (v: unknown) => Record<string, unknown>;
  formatNumber: (v: unknown) => string;
};

function GameplayDebugSection({
  nearby,
  traits,
  features,
  quests,
  recentEvents,
  status,
  typedRecord,
  formatNumber,
}: GameplayDebugSectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="play-panel-card">
      <CardHeader>
        <Button
          className="w-full justify-between"
          variant="ghost"
          onClick={() => setOpen((o) => !o)}
          data-testid="gameplay-debug-toggle"
        >
          <CardTitle className="text-sm font-medium">Gameplay Debug</CardTitle>
          <span className="text-muted-foreground">{open ? "▼" : "▶"}</span>
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 pt-0">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Archetype Compass</p>
            <div className="play-kv-list">
              {Array.isArray(status.archetypeScores) && status.archetypeScores.length > 0 ? (
                status.archetypeScores.map((row, index) => {
                  const typed = typedRecord(row);
                  return (
                    <p key={`archetype-${String(typed.archetypeId ?? index)}`}>
                      {String(typed.label ?? typed.archetypeId ?? "unknown")}: {formatNumber(typed.score ?? 0)}
                    </p>
                  );
                })
              ) : (
                <p>no ranking data</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Traits</p>
            <div className="play-kv-list">
              {Object.entries(traits).map(([key, value]) => (
                <p key={key}>{key}: {formatNumber(value)}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Features</p>
            <div className="play-kv-list">
              {Object.entries(features).map(([key, value]) => (
                <p key={key}>{key}: {formatNumber(value)}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Nearby</p>
            <div className="play-list">
              {nearby.length === 0 ? <p>none</p> : nearby.map((entity) => (
                <p key={entity.entityId}>{entity.name} ({entity.faction})</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Quests</p>
            <div className="play-list">
              {Object.entries(quests).map(([questId, value]) => {
                const row = typedRecord(value);
                return (
                  <p key={questId}>
                    {questId}: {String(row.progress ?? 0)}/{String(row.required ?? "?")} ({row.complete ? "done" : "active"})
                  </p>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Recent Events</p>
            <div className="play-list">
              {recentEvents.length === 0 ? <p>none</p> : (recentEvents as { turnIndex: number; actionType: string; actorId: string; roomId: string }[]).map((event) => (
                <p key={`${event.turnIndex}-${event.actionType}-${event.actorId}`}>
                  t{event.turnIndex} {event.actionType}@{event.roomId}
                </p>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function StatusPanel({ snapshot, status }: StatusPanelProps) {
  const player = snapshot.entities[snapshot.playerId] as EntityState;
  const depth = Number(status.depth ?? player.depth);
  const roomId = String(status.roomId ?? player.roomId);
  const entities = Object.values(snapshot.entities) as EntityState[];

  const nearby = entities.filter((entity) => {
    if (entity.entityId === player.entityId || entity.health <= 0) {
      return false;
    }
    return entity.depth === depth && entity.roomId === roomId;
  });

  const traits = typedRecord(status.traits);
  const features = typedRecord(status.features);
  const quests = typedRecord(status.quests);
  const recentEvents = [...snapshot.eventLog].slice(-6).reverse();

  return (
    <section className="play-column play-status" data-testid="play-status-panel">
      <Card className="play-panel-card">
        <CardHeader>
          <CardTitle>Kael Status</CardTitle>
        </CardHeader>
        <CardContent className="play-status-grid">
          <p data-testid="status-location">Depth {depth} - {roomId}</p>
          <p data-testid="status-act-chapter">Act {String(status.act ?? "?")} / Chapter {String(status.chapter ?? "?")}</p>
          <p>HP {String(status.health ?? player.health)} | Energy {String(status.energy ?? player.energy)}</p>
          <p>Level {String(status.level ?? 1)} | XP {player.xp}</p>
          <p>Archetype {String(status.archetypeHeading ?? player.archetypeHeading)}</p>
          <p>Faction {String(status.faction ?? player.faction)} | Reputation {String(status.reputation ?? player.reputation)}</p>
          <p>Companion {String(status.companion ?? "none")}</p>
        </CardContent>
      </Card>

      <GameplayDebugSection
        nearby={nearby}
        traits={traits}
        features={features}
        quests={quests}
        recentEvents={recentEvents}
        status={status}
        typedRecord={typedRecord}
        formatNumber={formatNumber}
      />
    </section>
  );
}
