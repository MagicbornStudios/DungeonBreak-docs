"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function StatusPanel({ snapshot, status }: StatusPanelProps) {
  const player = snapshot.entities[snapshot.playerId] as EntityState;
  const depth = Number(status.depth ?? player.depth);
  const roomId = String(status.roomId ?? player.roomId);

  const nearby = Object.values(snapshot.entities).filter((entity) => {
    if (entity.entityId === player.entityId || entity.health <= 0) {
      return false;
    }
    return entity.depth === depth && entity.roomId === roomId;
  });

  const traits = typedRecord(status.traits);
  const features = typedRecord(status.features);
  const quests = typedRecord(status.quests);
  const recentEvents = snapshot.eventLog.slice(-6).reverse();

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

      <Card className="play-panel-card">
        <CardHeader>
          <CardTitle>Archetype Compass</CardTitle>
        </CardHeader>
        <CardContent className="play-kv-list">
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
        </CardContent>
      </Card>

      <Card className="play-panel-card">
        <CardHeader>
          <CardTitle>Traits</CardTitle>
        </CardHeader>
        <CardContent className="play-kv-list">
          {Object.entries(traits).map(([key, value]) => (
            <p key={key}>{key}: {formatNumber(value)}</p>
          ))}
        </CardContent>
      </Card>

      <Card className="play-panel-card">
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent className="play-kv-list">
          {Object.entries(features).map(([key, value]) => (
            <p key={key}>{key}: {formatNumber(value)}</p>
          ))}
        </CardContent>
      </Card>

      <Card className="play-panel-card">
        <CardHeader>
          <CardTitle>Nearby</CardTitle>
        </CardHeader>
        <CardContent className="play-list">
          {nearby.length === 0 ? <p>none</p> : nearby.map((entity) => (
            <p key={entity.entityId}>{entity.name} ({entity.faction})</p>
          ))}
        </CardContent>
      </Card>

      <Card className="play-panel-card">
        <CardHeader>
          <CardTitle>Quests</CardTitle>
        </CardHeader>
        <CardContent className="play-list">
          {Object.entries(quests).map(([questId, value]) => {
            const row = typedRecord(value);
            return (
              <p key={questId}>
                {questId}: {String(row.progress ?? 0)}/{String(row.required ?? "?")} ({row.complete ? "done" : "active"})
              </p>
            );
          })}
        </CardContent>
      </Card>

      <Card className="play-panel-card">
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="play-list">
          {recentEvents.length === 0 ? <p>none</p> : recentEvents.map((event) => (
            <p key={`${event.turnIndex}-${event.actionType}-${event.actorId}`}>
              t{event.turnIndex} {event.actionType}@{event.roomId}
            </p>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
