import type { Payload, PayloadRequest } from "payload";
import { sanitizeFilenamePart } from "@/lib/generation/constants";

type CreateMediaFromBufferArgs = {
  alt: string;
  buffer: Buffer;
  collectionTag: string;
  extension: string;
  mimeType: string;
  payload: Payload;
  req: PayloadRequest;
};

export async function createMediaFromBuffer({
  alt,
  buffer,
  collectionTag,
  extension,
  mimeType,
  payload,
  req,
}: CreateMediaFromBufferArgs): Promise<Record<string, unknown>> {
  const safeTag = sanitizeFilenamePart(collectionTag) || "asset";
  const safeExtension = sanitizeFilenamePart(extension).replace(/^\./, "") || "bin";
  const fileName = `${safeTag}-${Date.now()}.${safeExtension}`;

  const mediaDoc = (await payload.create({
    collection: "media",
    data: {
      alt,
    },
    file: {
      data: buffer,
      mimetype: mimeType,
      name: fileName,
      size: buffer.byteLength,
    },
    overrideAccess: true,
    req,
  })) as unknown as Record<string, unknown>;

  return mediaDoc;
}
