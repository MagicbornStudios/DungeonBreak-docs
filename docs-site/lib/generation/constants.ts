import { createHash } from "node:crypto";

export const AUDIO_QUEUE = "ai-audio";
export const IMAGE_QUEUE = "ai-image";

export const GENERATION_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
} as const;

export const AUDIO_ASSET_TYPES = {
  DIALOGUE_VOICE: "dialogue_voice",
  WEAPON_SFX: "weapon_sfx",
  ITEM_SFX: "item_sfx",
} as const;

export const IMAGE_ASSET_TYPES = {
  CHARACTER_PORTRAIT: "character_portrait",
  WEAPON_ART: "weapon_art",
  ITEM_ART: "item_art",
} as const;

export const AUDIO_TASK_SLUGS = {
  DIALOGUE: "generate-dialogue-audio",
  WEAPON: "generate-weapon-sfx",
  ITEM: "generate-item-sfx",
} as const;

export const IMAGE_TASK_SLUGS = {
  CHARACTER: "generate-character-image",
  WEAPON: "generate-weapon-image",
  ITEM: "generate-item-image",
} as const;

export type AudioSourceType = "dialogueLine" | "weapon" | "item";
export type ImageSourceType = "character" | "weapon" | "item";

function stableStringify(input: unknown): string {
  if (input === null || typeof input !== "object") {
    return JSON.stringify(input);
  }

  if (Array.isArray(input)) {
    return `[${input.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = input as Record<string, unknown>;
  const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
  const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${pairs.join(",")}}`;
}

export function createGenerationIdempotencyKey(data: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(data)).digest("hex");
}

export function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
