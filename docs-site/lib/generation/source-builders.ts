import type { Payload } from "payload";
import {
  AUDIO_ASSET_TYPES,
  AUDIO_TASK_SLUGS,
  IMAGE_ASSET_TYPES,
  IMAGE_TASK_SLUGS,
  type AudioSourceType,
  type ImageSourceType,
} from "@/lib/generation/constants";

type SourceBuildResult = {
  assetData: Record<string, unknown>;
  taskSlug: string;
  idempotencyData: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): null | string {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalNumber(value: unknown): null | number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function relationId(value: unknown): null | number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value !== null && typeof value === "object") {
    return relationId((value as Record<string, unknown>).id);
  }
  return null;
}

async function resolveCharacterDefaults(
  payload: Payload,
  characterValue: unknown
): Promise<{ modelId: string; voiceId: string; characterId: null | number }> {
  const defaultModelId = process.env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2";
  const characterId = relationId(characterValue);
  if (!characterId) {
    return {
      characterId: null,
      modelId: defaultModelId,
      voiceId: "",
    };
  }

  const character = (await payload.findByID({
    collection: "characters",
    depth: 0,
    id: characterId,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>;

  return {
    characterId,
    modelId: asString(character.voiceModelId, defaultModelId),
    voiceId: asString(character.voiceId),
  };
}

export async function buildAudioSource(
  payload: Payload,
  sourceType: AudioSourceType,
  sourceId: number
): Promise<SourceBuildResult> {
  if (sourceType === "dialogueLine") {
    const line = (await payload.findByID({
      collection: "dialogue-lines",
      depth: 1,
      id: sourceId,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;

    const sourceTextOrPrompt = asString(line.lineText).trim();
    if (sourceTextOrPrompt.length === 0) {
      throw new Error("Dialogue line is missing lineText for generation.");
    }

    const defaults = await resolveCharacterDefaults(payload, line.character);
    const voiceId = asString(line.audioVoiceId, defaults.voiceId || "").trim();
    if (voiceId.length === 0) {
      throw new Error("Dialogue line generation requires a voiceId (line override or character default).");
    }

    const modelId = asString(
      line.audioModelId,
      defaults.modelId || process.env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2"
    );

    const seed = asOptionalNumber(line.audioSeed);
    const dialogueLineId = relationId(line.id) ?? sourceId;

    return {
      assetData: {
        assetType: AUDIO_ASSET_TYPES.DIALOGUE_VOICE,
        character: defaults.characterId,
        dialogueLine: dialogueLineId,
        item: null,
        modelId,
        provider: "elevenlabs",
        sourceTextOrPrompt,
        status: "queued",
        voiceId,
        weapon: null,
        ...(seed !== null ? { seed } : {}),
      },
      idempotencyData: {
        assetType: AUDIO_ASSET_TYPES.DIALOGUE_VOICE,
        modelId,
        seed,
        sourceId,
        sourceTextOrPrompt,
        sourceType,
        voiceId,
      },
      taskSlug: AUDIO_TASK_SLUGS.DIALOGUE,
    };
  }

  if (sourceType === "weapon") {
    const weapon = (await payload.findByID({
      collection: "weapons",
      depth: 0,
      id: sourceId,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;

    const sourceTextOrPrompt = asString(weapon.soundEffectPrompt).trim();
    if (sourceTextOrPrompt.length === 0) {
      throw new Error("Weapon generation requires soundEffectPrompt.");
    }

    const modelId = asString(
      weapon.audioModelId,
      process.env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2"
    );
    const seed = asOptionalNumber(weapon.audioSeed);

    return {
      assetData: {
        assetType: AUDIO_ASSET_TYPES.WEAPON_SFX,
        character: null,
        dialogueLine: null,
        item: null,
        modelId,
        provider: "elevenlabs",
        sourceTextOrPrompt,
        status: "queued",
        voiceId: "sfx",
        weapon: sourceId,
        ...(seed !== null ? { seed } : {}),
      },
      idempotencyData: {
        assetType: AUDIO_ASSET_TYPES.WEAPON_SFX,
        modelId,
        seed,
        sourceId,
        sourceTextOrPrompt,
        sourceType,
      },
      taskSlug: AUDIO_TASK_SLUGS.WEAPON,
    };
  }

  const item = (await payload.findByID({
    collection: "items",
    depth: 0,
    id: sourceId,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>;

  const sourceTextOrPrompt = asString(item.soundEffectPrompt).trim();
  if (sourceTextOrPrompt.length === 0) {
    throw new Error("Item generation requires soundEffectPrompt.");
  }

  const modelId = asString(
    item.audioModelId,
    process.env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2"
  );
  const seed = asOptionalNumber(item.audioSeed);

  return {
    assetData: {
      assetType: AUDIO_ASSET_TYPES.ITEM_SFX,
      character: null,
      dialogueLine: null,
      item: sourceId,
      modelId,
      provider: "elevenlabs",
      sourceTextOrPrompt,
      status: "queued",
      voiceId: "sfx",
      weapon: null,
      ...(seed !== null ? { seed } : {}),
    },
    idempotencyData: {
      assetType: AUDIO_ASSET_TYPES.ITEM_SFX,
      modelId,
      seed,
      sourceId,
      sourceTextOrPrompt,
      sourceType,
    },
    taskSlug: AUDIO_TASK_SLUGS.ITEM,
  };
}

export async function buildImageSource(
  payload: Payload,
  sourceType: ImageSourceType,
  sourceId: number
): Promise<SourceBuildResult> {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const quality = "auto";
  const size = "1024x1024";

  if (sourceType === "character") {
    const character = (await payload.findByID({
      collection: "characters",
      depth: 0,
      id: sourceId,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;

    const name = asString(character.name, "Unnamed Character");
    const prompt =
      asOptionalString(character.portraitPrompt) ||
      asOptionalString(character.summary) ||
      `Portrait concept art for ${name}`;

    return {
      assetData: {
        assetType: IMAGE_ASSET_TYPES.CHARACTER_PORTRAIT,
        character: sourceId,
        item: null,
        model,
        prompt,
        provider: "openai",
        quality,
        size,
        status: "queued",
        weapon: null,
      },
      idempotencyData: {
        assetType: IMAGE_ASSET_TYPES.CHARACTER_PORTRAIT,
        model,
        prompt,
        quality,
        size,
        sourceId,
        sourceType,
      },
      taskSlug: IMAGE_TASK_SLUGS.CHARACTER,
    };
  }

  if (sourceType === "weapon") {
    const weapon = (await payload.findByID({
      collection: "weapons",
      depth: 0,
      id: sourceId,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;

    const name = asString(weapon.name, "Unnamed Weapon");
    const prompt =
      asOptionalString(weapon.imagePrompt) ||
      asOptionalString(weapon.description) ||
      `Stylized concept art of a weapon named ${name}`;

    return {
      assetData: {
        assetType: IMAGE_ASSET_TYPES.WEAPON_ART,
        character: null,
        item: null,
        model,
        prompt,
        provider: "openai",
        quality,
        size,
        status: "queued",
        weapon: sourceId,
      },
      idempotencyData: {
        assetType: IMAGE_ASSET_TYPES.WEAPON_ART,
        model,
        prompt,
        quality,
        size,
        sourceId,
        sourceType,
      },
      taskSlug: IMAGE_TASK_SLUGS.WEAPON,
    };
  }

  const item = (await payload.findByID({
    collection: "items",
    depth: 0,
    id: sourceId,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>;

  const name = asString(item.name, "Unnamed Item");
  const prompt =
    asOptionalString(item.imagePrompt) ||
    asOptionalString(item.description) ||
    `Stylized concept art of an item named ${name}`;

  return {
    assetData: {
      assetType: IMAGE_ASSET_TYPES.ITEM_ART,
      character: null,
      item: sourceId,
      model,
      prompt,
      provider: "openai",
      quality,
      size,
      status: "queued",
      weapon: null,
    },
    idempotencyData: {
      assetType: IMAGE_ASSET_TYPES.ITEM_ART,
      model,
      prompt,
      quality,
      size,
      sourceId,
      sourceType,
    },
    taskSlug: IMAGE_TASK_SLUGS.ITEM,
  };
}

export function extractMediaURLFromGeneration(
  collection: "audio-assets" | "image-assets" | "media",
  document: unknown
): null | string {
  const doc = asRecord(document);

  if (collection === "media") {
    return asOptionalString(doc.url);
  }

  const media = asRecord(doc.media);
  return asOptionalString(media.url);
}
