import configPromise from "@payload-config";
import { NextResponse } from "next/server";
import { createPayloadRequest, getPayload } from "payload";
import { z } from "zod";
import { isOwnerOrAdminUser } from "@/lib/access";
import {
  IMAGE_QUEUE,
  createGenerationIdempotencyKey,
  type ImageSourceType,
} from "@/lib/generation/constants";
import { buildImageSource } from "@/lib/generation/source-builders";
import { findActiveGenerationByIdempotencyKey } from "@/lib/generation/queries";

const RequestSchema = z.object({
  sourceId: z.number().int().positive(),
  sourceType: z.enum(["character", "weapon", "item"]),
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
    const sourceType = parsedBody.sourceType as ImageSourceType;

    const built = await buildImageSource(payload, sourceType, parsedBody.sourceId);
    const idempotencyKey = createGenerationIdempotencyKey({
      kind: "image",
      ...built.idempotencyData,
    });

    const existing = await findActiveGenerationByIdempotencyKey(
      payload,
      "image-assets",
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
      collection: "image-assets",
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
      queue: IMAGE_QUEUE,
      req,
      task: built.taskSlug as "generate-character-image" | "generate-weapon-image" | "generate-item-image",
    });

    await payload.update({
      collection: "image-assets",
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
    const message = error instanceof Error ? error.message : "Failed to queue image generation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
