import type { ITerminalOptions } from "xterm";

export const PLAY_TERMINAL_ROWS = 28;
export const MAX_TRANSCRIPT_LINES = 220;

export type TerminalLineTone = "system" | "output" | "event" | "warning" | "error";

export const PLAY_TONE_COLORS: Record<TerminalLineTone, string> = {
  system: "cyan",
  output: "white",
  event: "green",
  warning: "yellow",
  error: "red",
};

export const PLAY_TERMINAL_OPTIONS: ITerminalOptions = {
  allowTransparency: true,
  convertEol: true,
  cursorBlink: true,
  disableStdin: false,
  fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
  fontSize: 14,
  letterSpacing: 0.2,
  lineHeight: 1.2,
  theme: {
    background: "#111827",
    black: "#111827",
    blue: "#60a5fa",
    brightBlack: "#374151",
    brightBlue: "#93c5fd",
    brightCyan: "#67e8f9",
    brightGreen: "#86efac",
    brightMagenta: "#f0abfc",
    brightRed: "#fca5a5",
    brightWhite: "#f9fafb",
    brightYellow: "#fde68a",
    cursor: "#fef08a",
    cyan: "#22d3ee",
    foreground: "#e5e7eb",
    green: "#4ade80",
    magenta: "#e879f9",
    red: "#f87171",
    selectionBackground: "#1f2937",
    white: "#d1d5db",
    yellow: "#facc15",
  },
};
