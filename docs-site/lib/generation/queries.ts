import type { Payload } from "payload";

export async function findActiveGenerationByIdempotencyKey(
  payload: Payload,
  collection: "audio-assets" | "image-assets",
  idempotencyKey: string
): Promise<null | Record<string, unknown>> {
  const result = (await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        {
          idempotencyKey: {
            equals: idempotencyKey,
          },
        },
        {
          or: [
            {
              status: {
                equals: "queued",
              },
            },
            {
              status: {
                equals: "processing",
              },
            },
          ],
        },
      ],
    },
  })) as unknown as { docs: Record<string, unknown>[] };

  return result.docs[0] ?? null;
}
