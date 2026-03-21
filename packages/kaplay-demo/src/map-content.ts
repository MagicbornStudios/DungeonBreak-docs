import type { GameSnapshot } from "@dungeonbreak/engine";

export interface MapExitSummary {
  direction: string;
  feature: string;
  roomId: string;
}

type StatusRecord = Record<string, unknown>;

const titleCase = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const buildMapDetailLines = (
  snapshot: GameSnapshot,
  status: StatusRecord,
  discoveredCount: number,
  totalRooms: number,
  exits: MapExitSummary[]
): string[] => {
  const currentRoomId = String(
    status.roomId ?? snapshot.entities[snapshot.playerId]?.roomId ?? ""
  );
  const roomFeature = String(status.roomFeature ?? "unknown");
  const pressure = `${String(status.pressure ?? "?")} / ${String(status.pressureCap ?? "?")}`;
  const manaCrystalCount = String(status.manaCrystalCount ?? "?");
  const ticksUntilBossSpawn = String(status.ticksUntilBossSpawn ?? "?");
  const hostileNpcCount = String(status.hostileNpcCount ?? "0");
  const documentedDepths = Array.isArray(status.documentedDepths)
    ? status.documentedDepths.map((depth) => String(depth)).join(", ")
    : "";
  const fog =
    status.fogMetrics &&
    typeof status.fogMetrics === "object" &&
    !Array.isArray(status.fogMetrics)
      ? (status.fogMetrics as Record<string, unknown>)
      : {};

  return [
    `Depth ${String(status.depth ?? "?")} map progress: ${discoveredCount}/${totalRooms} rooms known.`,
    `Current room: ${currentRoomId} (${titleCase(roomFeature)})`,
    exits.length > 0
      ? `Known exits: ${exits.map((exit) => `${exit.direction.toUpperCase()} -> ${titleCase(exit.feature)}`).join(", ")}`
      : "Known exits: none",
    `Mana crystals: ${manaCrystalCount}`,
    `Boss pressure: next spawn in ${ticksUntilBossSpawn} tick(s) | hostile NPCs ${hostileNpcCount}`,
    documentedDepths.length > 0
      ? `Documented floors: ${documentedDepths}`
      : "Documented floors: none",
    `Pressure: ${pressure}`,
    `Fog radius: ${String(fog.radius ?? "?")} | clarity ${String(fog.clarity ?? "?")}`,
  ];
};
