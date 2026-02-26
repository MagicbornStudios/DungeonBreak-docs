import configPromise from "@payload-config";
import { NextResponse } from "next/server";
import { createPayloadRequest, getPayload } from "payload";
import { z } from "zod";
import { isOwnerOrAdminUser } from "@/lib/access";
import {
  AUDIO_QUEUE,
  createGenerationIdempotencyKey,
  type AudioSourceType,
} from "@/lib/generation/constants";
import { buildAudioSource } from "@/lib/generation/source-builders";
import { findActiveGenerationByIdempotencyKey } from "@/lib/generation/queries";

const RequestSchema = z.object({
  sourceId: z.number().int().positive(),
  sourceType: z.enum(["dialogueLine", "weapon", "item"]),
});

export async function POST(request: Request) {
  try {
    const req = await createPayloadRequest({
      config: configPromise,
      request,
    });

    if (!isOwnerOrAdminUser(req.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await getPayload({ config: configPromise });
    const parsedBody = RequestSchema.parse(await request.json());
    const sourceType = parsedBody.sourceType as AudioSourceType;

    const built = await buildAudioSource(payload, sourceType, parsedBody.sourceId);
    const idempotencyKey = createGenerationIdempotencyKey({
      kind: "audio",
      ...built.idempotencyData,
    });

    const existing = await findActiveGenerationByIdempotencyKey(
      payload,
      "audio-assets",
      idempotencyKey
    );

    if (existing) {
      return NextResponse.json({
        generationId: existing.id,
        jobId: existing.jobID || null,
        status: existing.status || "processing",
      });
    }

    const generation = (await payload.create({
      collection: "audio-assets",
      data: {
        ...built.assetData,
        idempotencyKey,
      },
      overrideAccess: true,
      req,
    } as any)) as unknown as Record<string, unknown>;

    const job = await payload.jobs.queue({
      input: {
        generationId: generation.id as number,
      },
      queue: AUDIO_QUEUE,
      req,
      task: built.taskSlug as "generate-dialogue-audio" | "generate-weapon-sfx" | "generate-item-sfx",
    });

    await payload.update({
      collection: "audio-assets",
      data: {
        jobID: String(job.id),
      },
      id: generation.id as number | string,
      overrideAccess: true,
      req,
    });

    return NextResponse.json({
      generationId: generation.id,
      jobId: job.id,
      status: "queued",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to queue audio generation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
