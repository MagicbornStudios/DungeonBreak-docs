/**
 * In-memory ring buffer for backend/Codex debug log lines.
 * Used by the live Server/Codex log panel (SSE) and optional console tail.
 */

const MAX_LINES = 150;
const MAX_LINE_LENGTH = 1024;

const lines: string[] = [];
let index = 0;
const subscribers = new Set<(line: string) => void>();

function truncate(s: string): string {
  if (s.length <= MAX_LINE_LENGTH) return s;
  return s.slice(0, MAX_LINE_LENGTH) + "...";
}

export function append(line: string): void {
  const trimmed = truncate(String(line).trim());
  if (!trimmed) return;
  if (lines.length < MAX_LINES) {
    lines.push(trimmed);
  } else {
    lines[index % MAX_LINES] = trimmed;
  }
  index++;
  for (const cb of subscribers) cb(trimmed);
}

export function getLines(): string[] {
  if (lines.length < MAX_LINES) return [...lines];
  const start = index % MAX_LINES;
  return [...lines.slice(start), ...lines.slice(0, start)];
}

export function subscribe(callback: (line: string) => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/** Last chat request outcome for status endpoint (no PII). */
export type LastChatOutcome = {
  route: "stream" | "planning-chat";
  replyLength: number;
  lastError?: string;
  timestamp: number;
};

let lastChatOutcome: LastChatOutcome | null = null;

export function setLastChatOutcome(outcome: LastChatOutcome): void {
  lastChatOutcome = outcome;
}

export function getLastChatOutcome(): LastChatOutcome | null {
  return lastChatOutcome;
}
