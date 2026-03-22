import { createHash } from "node:crypto";

import type { GameSnapshot } from "@dungeonbreak/engine";

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
  return `{${entries.join(",")}}`;
};

export const hashSnapshot = (snapshot: GameSnapshot): string => {
  const serialized = stableStringify(snapshot);
  return createHash("sha256").update(serialized).digest("hex");
};
