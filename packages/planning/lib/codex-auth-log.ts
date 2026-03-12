type LogPayload = Record<string, unknown>;

export async function logCodexAuth(_event: string, _payload: LogPayload = {}) {
  // No-op for planning app; optionally write to .planning/reports/codex-auth.log
}

export function getCodexAuthLogPath(): string {
  return ".planning/reports/codex-auth.log";
}
