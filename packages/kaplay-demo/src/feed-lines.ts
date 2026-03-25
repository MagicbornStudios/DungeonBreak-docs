import { feedToneColor } from "./theme-tokens";

export type FeedLineKind =
  | "system"
  | "chapter"
  | "dialogue"
  | "combat"
  | "boss"
  | "live"
  | "player"
  | "dungeoneer"
  | "entity"
  | "narrator"
  | "plain";

export interface FormattedFeedLine {
  kind: FeedLineKind;
  color: readonly [number, number, number];
  displayText: string;
}

const DEVELOPER_FEED_PATTERNS = [
  "vector-runtime",
  "generated content",
  "debug",
  "standalone",
  "watcher",
  "build ",
  "server",
  "perf",
  "trace",
] as const;

interface ParsedFeedEvent {
  actionType: string;
  actorName: string;
  message: string;
  roomId: string;
  turnIndex: number;
}

const EVENT_LINE_REGEX =
  /^\[t(?<turnIndex>\d+)\]\s+(?<actorName>.+?)\s+(?<actionType>[a-z_]+)@(?<roomId>[^:]+):\s*(?<message>.*)$/i;
const WARNING_LINE_REGEX = /^\[t\d+\]\s+warning:\s*(?<warning>.+)$/i;

function parseFeedEventLine(line: string): ParsedFeedEvent | null {
  const match = EVENT_LINE_REGEX.exec(line.trim());
  if (!match?.groups) {
    return null;
  }
  return {
    actionType: match.groups.actionType,
    actorName: match.groups.actorName,
    message: match.groups.message,
    roomId: match.groups.roomId,
    turnIndex: Number(match.groups.turnIndex),
  };
}

function actorChannelForEvent(event: ParsedFeedEvent): {
  channel: FeedLineKind;
  label: string;
} {
  const actorLower = event.actorName.toLowerCase();
  const messageLower = event.message.toLowerCase();
  if (
    event.actionType === "stream" ||
    event.actionType === "live_stream" ||
    event.actionType === "live_stream_tick" ||
    messageLower.includes("livestream")
  ) {
    return { channel: "live", label: "LIVE" };
  }
  if (actorLower === "kael" || actorLower.includes("player")) {
    return { channel: "player", label: "YOU" };
  }
  if (actorLower.includes("boss") || messageLower.includes("boss")) {
    return { channel: "boss", label: "BOSS" };
  }
  if (
    messageLower.includes("dungeoneer") ||
    actorLower.includes("merchant") ||
    actorLower.includes("warden") ||
    actorLower.includes("delver") ||
    actorLower.includes("wanderer")
  ) {
    return { channel: "dungeoneer", label: "DUNGEONEER" };
  }
  if (
    event.actionType === "fight" ||
    event.actionType === "flee" ||
    messageLower.includes("attack") ||
    messageLower.includes("damage")
  ) {
    return { channel: "combat", label: "COMBAT" };
  }
  return { channel: "entity", label: "ENTITY" };
}

function plainFeedLine(line: string): FormattedFeedLine {
  const lower = line.toLowerCase();
  if (
    lower.includes("chapter") ||
    lower.includes("scene") ||
    line.startsWith("***")
  ) {
    return {
      kind: "chapter",
      color: feedToneColor.chapter,
      displayText: `* ${line}`,
    };
  }
  if (line.includes('"')) {
    return {
      kind: "dialogue",
      color: feedToneColor.dialogue,
      displayText: `> ${line}`,
    };
  }
  if (
    lower.includes("saved") ||
    lower.includes("loaded") ||
    lower.includes("autosave") ||
    lower.includes("journey") ||
    lower.includes("teleport")
  ) {
    return {
      kind: "system",
      color: feedToneColor.system,
      displayText: `[SYSTEM] ${line}`,
    };
  }
  if (
    lower.includes("you ") ||
    lower.includes("nearby") ||
    lower.includes("room")
  ) {
    return {
      kind: "narrator",
      color: feedToneColor.narrator,
      displayText: `[NARRATOR] ${line}`,
    };
  }
  return {
    kind: "plain",
    color: feedToneColor.plain,
    displayText: line,
  };
}

export function formatFeedLine(line: string): FormattedFeedLine {
  const warningMatch = WARNING_LINE_REGEX.exec(line.trim());
  if (warningMatch?.groups?.warning) {
    return {
      kind: "system",
      color: feedToneColor.system,
      displayText: `[SYSTEM] ${warningMatch.groups.warning}`,
    };
  }

  const event = parseFeedEventLine(line);
  if (!event) {
    return plainFeedLine(line);
  }

  const actorChannel = actorChannelForEvent(event);
  const message =
    event.message.length > 0
      ? event.message
      : `${event.actorName} ${event.actionType.split("_").join(" ")}`;
  const roomSuffix = event.roomId.length > 0 ? ` @ ${event.roomId}` : "";
  const actorSuffix =
    actorChannel.channel === "player" ? "" : ` ${event.actorName}`;
  return {
    kind: actorChannel.channel,
    color: feedToneColor[actorChannel.channel],
    displayText: `[${actorChannel.label}]${actorSuffix}${roomSuffix}: ${message}`,
  };
}

export function isPlayerFacingFeedLine(line: string): boolean {
  const normalized = line.trim();
  if (normalized.length === 0) {
    return false;
  }
  const lower = normalized.toLowerCase();
  return !DEVELOPER_FEED_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function gameplayFeedSnapshot(
  lines: readonly string[],
  maxLines = 6
): FormattedFeedLine[] {
  return lines
    .filter(isPlayerFacingFeedLine)
    .slice(-Math.max(1, maxLines))
    .map((line) => formatFeedLine(line));
}
