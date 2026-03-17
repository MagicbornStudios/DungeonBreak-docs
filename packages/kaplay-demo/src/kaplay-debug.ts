interface KaplayDebugEvent {
  scope: string;
  event: string;
  detail?: Record<string, unknown>;
  at: string;
}

interface KaplayDebugButton {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tag?: string;
}

declare global {
  interface Window {
    __KAPLAY_DEBUG_EVENTS__?: KaplayDebugEvent[];
    __KAPLAY_DEBUG_BUTTONS__?: KaplayDebugButton[];
  }
}

const MAX_DEBUG_EVENTS = 200;

function appendKaplayDebugEvent(entry: KaplayDebugEvent): void {
  if (typeof window === "undefined") {
    return;
  }
  const existing = window.__KAPLAY_DEBUG_EVENTS__ ?? [];
  existing.push(entry);
  if (existing.length > MAX_DEBUG_EVENTS) {
    existing.splice(0, existing.length - MAX_DEBUG_EVENTS);
  }
  window.__KAPLAY_DEBUG_EVENTS__ = existing;
}

export function recordKaplayDebug(
  scope: string,
  event: string,
  detail?: Record<string, unknown>
): void {
  const entry: KaplayDebugEvent = {
    scope,
    event,
    detail,
    at: new Date().toISOString(),
  };
  appendKaplayDebugEvent(entry);
}

export function logKaplayDebug(
  scope: string,
  event: string,
  detail?: Record<string, unknown>
): void {
  recordKaplayDebug(scope, event, detail);
  if (detail) {
    console.info(`[kaplay ${scope}] ${event}`, detail);
    return;
  }
  console.info(`[kaplay ${scope}] ${event}`);
}

export function logKaplayDebugError(
  scope: string,
  event: string,
  error: unknown,
  detail?: Record<string, unknown>
): void {
  const message = error instanceof Error ? error.message : String(error);
  const payload = detail ? { ...detail, error: message } : { error: message };
  const entry: KaplayDebugEvent = {
    scope,
    event,
    detail: payload,
    at: new Date().toISOString(),
  };
  appendKaplayDebugEvent(entry);
  console.error(`[kaplay ${scope}] ${event}`, error, detail ?? {});
}

export function readKaplayDebugEvents(): KaplayDebugEvent[] {
  if (typeof window === "undefined") {
    return [];
  }
  return [...(window.__KAPLAY_DEBUG_EVENTS__ ?? [])];
}

export function resetKaplayDebugButtons(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.__KAPLAY_DEBUG_BUTTONS__ = [];
}

export function resetKaplayDebugButtonsByTag(tag: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const buttons = window.__KAPLAY_DEBUG_BUTTONS__ ?? [];
  window.__KAPLAY_DEBUG_BUTTONS__ = buttons.filter((button) => {
    return button.tag !== tag;
  });
}

export function registerKaplayDebugButton(button: KaplayDebugButton): void {
  if (typeof window === "undefined") {
    return;
  }
  const buttons = window.__KAPLAY_DEBUG_BUTTONS__ ?? [];
  buttons.push(button);
  window.__KAPLAY_DEBUG_BUTTONS__ = buttons;
}
