import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), ".logs");
const LOG_FILE = path.join(LOG_DIR, "codex-auth.log");

type LogPayload = Record<string, unknown>;

function safePayload(payload: LogPayload): LogPayload {
  const next: LogPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.length > 1200) {
      next[key] = `${value.slice(0, 1200)}...<truncated>`;
      continue;
    }
    next[key] = value;
  }
  return next;
}

export async function logCodexAuth(event: string, payload: LogPayload = {}) {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      event,
      ...safePayload(payload),
    };
    await appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Logging should never break auth flows.
  }
}

export function getCodexAuthLogPath() {
  return LOG_FILE;
}

