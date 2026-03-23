import configPromise from "@payload-config";
import { NextResponse } from "next/server";
import { createPayloadRequest, getPayload } from "payload";
import { z } from "zod";
import { isOwnerOrAdminUser } from "@/lib/access";
import type {
  AssetMediaGenerationResponse,
  MediaFieldValue,
  MediaGenerationProfile,
  MediaKind,
} from "@/lib/asset-explorer/media-generation";
import {
  AUDIO_ASSET_TYPES,
  AUDIO_QUEUE,
  AUDIO_TASK_SLUGS,
  createGenerationIdempotencyKey,
  IMAGE_ASSET_TYPES,
  IMAGE_QUEUE,
  IMAGE_TASK_SLUGS,
} from "@/lib/generation/constants";
import { findActiveGenerationByIdempotencyKey } from "@/lib/generation/queries";
import { extractMediaURLFromGeneration } from "@/lib/generation/source-builders";

const QuerySchema = z.object({
  generationId: z.coerce.number().int().positive(),
  kind: z.enum(["audio", "image", "video"]),
});

const RequestSchema = z
  .object({
    context: z
      .object({
        assetId: z.string().min(1).optional(),
        assetName: z.string().min(1).optional(),
        fieldPath: z.string().min(1).optional(),
        projectId: z.string().min(1).optional(),
        schemaId: z.string().min(1).optional(),
      })
      .optional(),
    kind: z.enum(["audio", "image", "video"]),
    model: z.string().min(1).optional(),
    profile: z
      .enum([
        "character_portrait",
        "dialogue_voice",
        "item_art",
        "item_sfx",
        "promo_clip",
        "weapon_art",
        "weapon_sfx",
      ])
      .optional(),
    prompt: z.string().min(1).optional(),
    quality: z.string().min(1).optional(),
    size: z.string().min(1).optional(),
    sourceTextOrPrompt: z.string().min(1).optional(),
    voiceId: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (value.kind === "image" && !value.prompt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image generation requires a prompt.",
        path: ["prompt"],
      });
    }
    if (value.kind === "audio" && !value.sourceTextOrPrompt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Audio generation requires sourceTextOrPrompt.",
        path: ["sourceTextOrPrompt"],
      });
    }
    if (value.profile === "dialogue_voice" && !value.voiceId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dialogue voice generation requires a voiceId.",
        path: ["voiceId"],
      });
    }
  });

type GenerationDocument = Record<string, unknown>;

const IMAGE_PROFILE_MAP = {
  character_portrait: {
    assetType: IMAGE_ASSET_TYPES.CHARACTER_PORTRAIT,
    taskSlug: IMAGE_TASK_SLUGS.CHARACTER,
  },
  item_art: {
    assetType: IMAGE_ASSET_TYPES.ITEM_ART,
    taskSlug: IMAGE_TASK_SLUGS.ITEM,
  },
  weapon_art: {
    assetType: IMAGE_ASSET_TYPES.WEAPON_ART,
    taskSlug: IMAGE_TASK_SLUGS.WEAPON,
  },
} as const;

const AUDIO_PROFILE_MAP = {
  dialogue_voice: {
    assetType: AUDIO_ASSET_TYPES.DIALOGUE_VOICE,
    taskSlug: AUDIO_TASK_SLUGS.DIALOGUE,
  },
  item_sfx: {
    assetType: AUDIO_ASSET_TYPES.ITEM_SFX,
    taskSlug: AUDIO_TASK_SLUGS.ITEM,
  },
  weapon_sfx: {
    assetType: AUDIO_ASSET_TYPES.WEAPON_SFX,
    taskSlug: AUDIO_TASK_SLUGS.WEAPON,
  },
} as const;

function asOptionalNumber(value: unknown): null | number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    return asOptionalNumber((value as Record<string, unknown>).id);
  }
  return null;
}

function asOptionalString(value: unknown): null | string {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function serializeGeneration(
  kind: MediaKind,
  document: GenerationDocument
): MediaFieldValue {
  const profile =
    kind === "image"
      ? ((Object.keys(IMAGE_PROFILE_MAP).find(
          (key) =>
            IMAGE_PROFILE_MAP[key as keyof typeof IMAGE_PROFILE_MAP]
              .assetType === document.assetType
        ) as MediaGenerationProfile | undefined) ?? "item_art")
      : kind === "audio"
        ? ((Object.keys(AUDIO_PROFILE_MAP).find(
            (key) =>
              AUDIO_PROFILE_MAP[key as keyof typeof AUDIO_PROFILE_MAP]
                .assetType === document.assetType
          ) as MediaGenerationProfile | undefined) ?? "item_sfx")
        : "promo_clip";

  return {
    errorMessage: asOptionalString(document.errorMessage),
    generationCollection:
      kind === "image"
        ? "image-assets"
        : kind === "audio"
          ? "audio-assets"
          : "media",
    generationId: asOptionalNumber(document.id),
    kind,
    mediaId: asOptionalNumber(document.media),
    mediaUrl:
      kind === "video"
        ? asOptionalString(document.mediaUrl)
        : extractMediaURLFromGeneration(
            kind === "image" ? "image-assets" : "audio-assets",
            document
          ),
    model:
      asOptionalString(document.model) ?? asOptionalString(document.modelId),
    profile,
    prompt: asOptionalString(document.prompt),
    provider: asOptionalString(document.provider),
    quality: asOptionalString(document.quality),
    size: asOptionalString(document.size),
    sourceTextOrPrompt: asOptionalString(document.sourceTextOrPrompt),
    status: asOptionalString(document.status) ?? "draft",
    updatedAt: asOptionalString(document.updatedAt),
    voiceId: asOptionalString(document.voiceId),
  };
}

function imagePayloadForRequest(parsedBody: z.infer<typeof RequestSchema>): {
  assetData: Record<string, unknown>;
  collection: "image-assets";
  idempotencyKey: string;
  queue: typeof IMAGE_QUEUE;
  taskSlug: (typeof IMAGE_PROFILE_MAP)[keyof typeof IMAGE_PROFILE_MAP]["taskSlug"];
} {
  const profile =
    parsedBody.profile && parsedBody.profile in IMAGE_PROFILE_MAP
      ? (parsedBody.profile as keyof typeof IMAGE_PROFILE_MAP)
      : "item_art";
  const mapping = IMAGE_PROFILE_MAP[profile];
  const prompt = parsedBody.prompt?.trim() ?? "";
  const model =
    parsedBody.model?.trim() || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const quality = parsedBody.quality?.trim() || "auto";
  const size = parsedBody.size?.trim() || "1024x1024";
  const idempotencyKey = createGenerationIdempotencyKey({
    assetName: parsedBody.context?.assetName ?? null,
    fieldPath: parsedBody.context?.fieldPath ?? null,
    kind: "image",
    model,
    profile,
    prompt,
    quality,
    schemaId: parsedBody.context?.schemaId ?? null,
    size,
  });

  return {
    assetData: {
      assetType: mapping.assetType,
      character: null,
      item: null,
      metadata: {
        assetExplorerContext: parsedBody.context ?? null,
      },
      model,
      prompt,
      provider: "openai",
      quality,
      size,
      status: "queued",
      weapon: null,
    },
    collection: "image-assets",
    idempotencyKey,
    queue: IMAGE_QUEUE,
    taskSlug: mapping.taskSlug,
  };
}

function audioPayloadForRequest(parsedBody: z.infer<typeof RequestSchema>): {
  assetData: Record<string, unknown>;
  collection: "audio-assets";
  idempotencyKey: string;
  queue: typeof AUDIO_QUEUE;
  taskSlug: (typeof AUDIO_PROFILE_MAP)[keyof typeof AUDIO_PROFILE_MAP]["taskSlug"];
} {
  const profile =
    parsedBody.profile && parsedBody.profile in AUDIO_PROFILE_MAP
      ? (parsedBody.profile as keyof typeof AUDIO_PROFILE_MAP)
      : "item_sfx";
  const mapping = AUDIO_PROFILE_MAP[profile];
  const sourceTextOrPrompt = parsedBody.sourceTextOrPrompt?.trim() ?? "";
  const modelId =
    parsedBody.model?.trim() ||
    process.env.ELEVENLABS_TTS_MODEL_ID ||
    "eleven_multilingual_v2";
  const voiceId =
    profile === "dialogue_voice" ? (parsedBody.voiceId?.trim() ?? "") : "sfx";
  const idempotencyKey = createGenerationIdempotencyKey({
    assetName: parsedBody.context?.assetName ?? null,
    fieldPath: parsedBody.context?.fieldPath ?? null,
    kind: "audio",
    modelId,
    profile,
    schemaId: parsedBody.context?.schemaId ?? null,
    sourceTextOrPrompt,
    voiceId,
  });

  return {
    assetData: {
      assetType: mapping.assetType,
      character: null,
      dialogueLine: null,
      item: null,
      metadata: {
        assetExplorerContext: parsedBody.context ?? null,
      },
      modelId,
      provider: "elevenlabs",
      sourceTextOrPrompt,
      status: "queued",
      voiceId,
      weapon: null,
    },
    collection: "audio-assets",
    idempotencyKey,
    queue: AUDIO_QUEUE,
    taskSlug: mapping.taskSlug,
  };
}

function jsonResponse(
  body: AssetMediaGenerationResponse,
  status = 200
): NextResponse<AssetMediaGenerationResponse> {
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const req = await createPayloadRequest({
      config: configPromise,
      request,
    });
    if (!isOwnerOrAdminUser(req.user)) {
      return jsonResponse({ error: "Forbidden", ok: false }, 403);
    }

    const parsedQuery = QuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    );

    if (parsedQuery.kind === "video") {
      return jsonResponse(
        {
          error: "Video generation status is not wired yet.",
          ok: false,
        },
        501
      );
    }

    const payload = await getPayload({ config: configPromise });
    const document = (await payload.findByID({
      collection:
        parsedQuery.kind === "image" ? "image-assets" : "audio-assets",
      depth: 1,
      id: parsedQuery.generationId,
      overrideAccess: true,
      req,
    })) as unknown as GenerationDocument;

    return jsonResponse({
      generation: serializeGeneration(parsedQuery.kind, document),
      ok: true,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load media generation status.",
        ok: false,
      },
      400
    );
  }
}

export async function POST(request: Request) {
  try {
    const req = await createPayloadRequest({
      config: configPromise,
      request,
    });
    if (!isOwnerOrAdminUser(req.user)) {
      return jsonResponse({ error: "Forbidden", ok: false }, 403);
    }

    const parsedBody = RequestSchema.parse(await request.json());
    if (parsedBody.kind === "video") {
      return jsonResponse(
        {
          error: "Video generation is planned but not wired yet.",
          note: "Use the media widget's Link Existing tab for video fields right now.",
          ok: false,
        },
        501
      );
    }

    const payload = await getPayload({ config: configPromise });
    if (parsedBody.kind === "image") {
      const queueConfig = imagePayloadForRequest(parsedBody);
      const existing = await findActiveGenerationByIdempotencyKey(
        payload,
        "image-assets",
        queueConfig.idempotencyKey
      );

      if (existing) {
        return jsonResponse({
          generation: serializeGeneration("image", existing),
          ok: true,
        });
      }

      const generation = (await payload.create({
        collection: "image-assets",
        data: {
          ...queueConfig.assetData,
          idempotencyKey: queueConfig.idempotencyKey,
        },
        overrideAccess: true,
        req,
      } as never)) as unknown as GenerationDocument;

      const job = await payload.jobs.queue({
        input: {
          generationId: generation.id as number,
        },
        queue: queueConfig.queue,
        req,
        task: queueConfig.taskSlug,
      });

      await payload.update({
        collection: "image-assets",
        data: {
          jobID: String(job.id),
        },
        id: generation.id as number | string,
        overrideAccess: true,
        req,
      } as never);

      return jsonResponse({
        generation: serializeGeneration("image", {
          ...generation,
          jobID: String(job.id),
        }),
        ok: true,
      });
    }

    const queueConfig = audioPayloadForRequest(parsedBody);
    const existing = await findActiveGenerationByIdempotencyKey(
      payload,
      "audio-assets",
      queueConfig.idempotencyKey
    );

    if (existing) {
      return jsonResponse({
        generation: serializeGeneration("audio", existing),
        ok: true,
      });
    }

    const generation = (await payload.create({
      collection: "audio-assets",
      data: {
        ...queueConfig.assetData,
        idempotencyKey: queueConfig.idempotencyKey,
      },
      overrideAccess: true,
      req,
    } as never)) as unknown as GenerationDocument;

    const job = await payload.jobs.queue({
      input: {
        generationId: generation.id as number,
      },
      queue: queueConfig.queue,
      req,
      task: queueConfig.taskSlug,
    });

    await payload.update({
      collection: "audio-assets",
      data: {
        jobID: String(job.id),
      },
      id: generation.id as number | string,
      overrideAccess: true,
      req,
    } as never);

    return jsonResponse({
      generation: serializeGeneration("audio", {
        ...generation,
        jobID: String(job.id),
      }),
      ok: true,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to queue asset media generation.",
        ok: false,
      },
      400
    );
  }
}
