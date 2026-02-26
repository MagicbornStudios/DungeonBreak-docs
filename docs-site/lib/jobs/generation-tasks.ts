import type { PayloadRequest } from "payload";
import { createMediaFromBuffer } from "@/lib/ai/media-upload";
import { generateDialogueVoice, generateSoundEffect } from "@/lib/ai/elevenlabs";
import { generateImage } from "@/lib/ai/openai-images";
import { AUDIO_ASSET_TYPES, IMAGE_ASSET_TYPES } from "@/lib/generation/constants";

type TaskArgs = {
  input?: {
    generationId?: number | string;
  };
  job: {
    id: number | string;
  };
  req: PayloadRequest;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): null | number {
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
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
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

function parseGenerationId(input: unknown): number {
  const maybeID = asNumber(asRecord(input).generationId);
  if (maybeID === null) {
    throw new Error("Task input must include a numeric generationId.");
  }
  return maybeID;
}

async function setAudioStatus(
  req: PayloadRequest,
  generationId: number,
  data: Record<string, unknown>
) {
  await req.payload.update({
    collection: "audio-assets",
    data,
    id: generationId,
    overrideAccess: true,
    req,
  });
}

async function setImageStatus(
  req: PayloadRequest,
  generationId: number,
  data: Record<string, unknown>
) {
  await req.payload.update({
    collection: "image-assets",
    data,
    id: generationId,
    overrideAccess: true,
    req,
  });
}

async function updateLatestAudioReferences(
  req: PayloadRequest,
  generation: Record<string, unknown>,
  generationId: number
) {
  const dialogueLineID = relationId(generation.dialogueLine);
  if (dialogueLineID !== null) {
    await req.payload.update({
      collection: "dialogue-lines",
      data: {
        latestAudioAsset: generationId,
      },
      id: dialogueLineID,
      overrideAccess: true,
      req,
    });
  }

  const weaponID = relationId(generation.weapon);
  if (weaponID !== null) {
    await req.payload.update({
      collection: "weapons",
      data: {
        latestAudioAsset: generationId,
      },
      id: weaponID,
      overrideAccess: true,
      req,
    });
  }

  const itemID = relationId(generation.item);
  if (itemID !== null) {
    await req.payload.update({
      collection: "items",
      data: {
        latestAudioAsset: generationId,
      },
      id: itemID,
      overrideAccess: true,
      req,
    });
  }
}

async function updateLatestImageReferences(
  req: PayloadRequest,
  generation: Record<string, unknown>,
  generationId: number
) {
  const characterID = relationId(generation.character);
  if (characterID !== null) {
    await req.payload.update({
      collection: "characters",
      data: {
        latestPortrait: generationId,
      },
      id: characterID,
      overrideAccess: true,
      req,
    });
  }

  const weaponID = relationId(generation.weapon);
  if (weaponID !== null) {
    await req.payload.update({
      collection: "weapons",
      data: {
        latestImageAsset: generationId,
      },
      id: weaponID,
      overrideAccess: true,
      req,
    });
  }

  const itemID = relationId(generation.item);
  if (itemID !== null) {
    await req.payload.update({
      collection: "items",
      data: {
        latestImageAsset: generationId,
      },
      id: itemID,
      overrideAccess: true,
      req,
    });
  }
}

async function runAudioTask(
  args: TaskArgs,
  expectedType: (typeof AUDIO_ASSET_TYPES)[keyof typeof AUDIO_ASSET_TYPES]
) {
  const generationId = parseGenerationId(args.input);
  const generation = (await args.req.payload.findByID({
    collection: "audio-assets",
    depth: 1,
    id: generationId,
    overrideAccess: true,
    req: args.req,
  })) as unknown as Record<string, unknown>;

  const assetType = asString(generation.assetType);
  if (assetType !== expectedType) {
    throw new Error(`Audio generation ${generationId} has assetType '${assetType}', expected '${expectedType}'.`);
  }

  if (asString(generation.status) === "succeeded" && relationId(generation.media)) {
    return {
      output: {
        generationId,
        mediaId: relationId(generation.media),
        status: "succeeded",
      },
    };
  }

  await setAudioStatus(args.req, generationId, {
    errorMessage: null,
    jobID: String(args.job.id),
    status: "processing",
  });

  try {
    const sourceTextOrPrompt = asString(generation.sourceTextOrPrompt).trim();
    if (sourceTextOrPrompt.length === 0) {
      throw new Error("Audio generation is missing sourceTextOrPrompt.");
    }

    const modelId = asString(
      generation.modelId,
      process.env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2"
    );
    const seed = asNumber(generation.seed) ?? undefined;

    const result =
      assetType === AUDIO_ASSET_TYPES.DIALOGUE_VOICE
        ? await generateDialogueVoice({
            modelId,
            seed,
            text: sourceTextOrPrompt,
            voiceId: asString(generation.voiceId).trim(),
          })
        : await generateSoundEffect({
            modelId,
            prompt: sourceTextOrPrompt,
            seed,
          });

    const mediaDoc = await createMediaFromBuffer({
      alt: `Generated ${assetType} audio`,
      buffer: result.data,
      collectionTag: assetType,
      extension: "mp3",
      mimeType: result.contentType,
      payload: args.req.payload,
      req: args.req,
    });

    const mediaId = relationId(mediaDoc.id);
    if (mediaId === null) {
      throw new Error("Media upload completed but returned an invalid media ID.");
    }

    await setAudioStatus(args.req, generationId, {
      durationSeconds: result.durationSeconds,
      errorMessage: null,
      media: mediaId,
      providerRequestID: result.providerRequestID,
      status: "succeeded",
    });

    await updateLatestAudioReferences(args.req, generation, generationId);

    return {
      output: {
        generationId,
        mediaId,
        status: "succeeded",
      },
    };
  } catch (error) {
    await setAudioStatus(args.req, generationId, {
      errorMessage: error instanceof Error ? error.message : "Unknown audio generation error.",
      status: "failed",
    });
    throw error;
  }
}

async function runImageTask(
  args: TaskArgs,
  expectedType: (typeof IMAGE_ASSET_TYPES)[keyof typeof IMAGE_ASSET_TYPES]
) {
  const generationId = parseGenerationId(args.input);
  const generation = (await args.req.payload.findByID({
    collection: "image-assets",
    depth: 1,
    id: generationId,
    overrideAccess: true,
    req: args.req,
  })) as unknown as Record<string, unknown>;

  const assetType = asString(generation.assetType);
  if (assetType !== expectedType) {
    throw new Error(`Image generation ${generationId} has assetType '${assetType}', expected '${expectedType}'.`);
  }

  if (asString(generation.status) === "succeeded" && relationId(generation.media)) {
    return {
      output: {
        generationId,
        mediaId: relationId(generation.media),
        status: "succeeded",
      },
    };
  }

  await setImageStatus(args.req, generationId, {
    errorMessage: null,
    jobID: String(args.job.id),
    status: "processing",
  });

  try {
    const prompt = asString(generation.prompt).trim();
    if (prompt.length === 0) {
      throw new Error("Image generation is missing prompt.");
    }

    const model = asString(generation.model, process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    const quality = asString(generation.quality, "auto") as "auto" | "high" | "low" | "medium";
    const size = asString(generation.size, "1024x1024") as
      | "1024x1024"
      | "1024x1536"
      | "1536x1024";

    const result = await generateImage({
      model,
      prompt,
      quality,
      size,
    });

    const mediaDoc = await createMediaFromBuffer({
      alt: `Generated ${assetType} image`,
      buffer: result.data,
      collectionTag: assetType,
      extension: "png",
      mimeType: result.contentType,
      payload: args.req.payload,
      req: args.req,
    });

    const mediaId = relationId(mediaDoc.id);
    if (mediaId === null) {
      throw new Error("Media upload completed but returned an invalid media ID.");
    }

    await setImageStatus(args.req, generationId, {
      errorMessage: null,
      media: mediaId,
      providerRequestID: result.providerRequestID,
      status: "succeeded",
    });

    await updateLatestImageReferences(args.req, generation, generationId);

    return {
      output: {
        generationId,
        mediaId,
        status: "succeeded",
      },
    };
  } catch (error) {
    await setImageStatus(args.req, generationId, {
      errorMessage: error instanceof Error ? error.message : "Unknown image generation error.",
      status: "failed",
    });
    throw error;
  }
}

export async function handleGenerateDialogueAudio(args: TaskArgs) {
  return runAudioTask(args, AUDIO_ASSET_TYPES.DIALOGUE_VOICE);
}

export async function handleGenerateWeaponSFX(args: TaskArgs) {
  return runAudioTask(args, AUDIO_ASSET_TYPES.WEAPON_SFX);
}

export async function handleGenerateItemSFX(args: TaskArgs) {
  return runAudioTask(args, AUDIO_ASSET_TYPES.ITEM_SFX);
}

export async function handleGenerateCharacterImage(args: TaskArgs) {
  return runImageTask(args, IMAGE_ASSET_TYPES.CHARACTER_PORTRAIT);
}

export async function handleGenerateWeaponImage(args: TaskArgs) {
  return runImageTask(args, IMAGE_ASSET_TYPES.WEAPON_ART);
}

export async function handleGenerateItemImage(args: TaskArgs) {
  return runImageTask(args, IMAGE_ASSET_TYPES.ITEM_ART);
}
