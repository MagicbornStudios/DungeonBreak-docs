import OpenAI from "openai";
import { z } from "zod";

const OpenAIImageInputSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  quality: z.enum(["auto", "low", "medium", "high"]).default("auto"),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1024x1024"),
});

type OpenAIImageResult = {
  contentType: string;
  data: Buffer;
  providerRequestID?: string;
};

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey });
}

async function resolveImageDataUrlOrB64(value: { b64_json?: string | null; url?: string | null }): Promise<Buffer> {
  if (value.b64_json) {
    return Buffer.from(value.b64_json, "base64");
  }

  if (value.url) {
    const response = await fetch(value.url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI image URL fetch failed (${response.status}): ${text}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("OpenAI image generation returned no image payload.");
}

export async function generateImage(input: z.input<typeof OpenAIImageInputSchema>): Promise<OpenAIImageResult> {
  const parsed = OpenAIImageInputSchema.parse(input);
  const client = getClient();

  const response = await client.images.generate({
    model: parsed.model,
    prompt: parsed.prompt,
    quality: parsed.quality,
    size: parsed.size,
  });

  const imagePayload = response.data?.[0];
  if (!imagePayload) {
    throw new Error("OpenAI image generation returned an empty data array.");
  }

  const data = await resolveImageDataUrlOrB64(imagePayload);

  return {
    contentType: "image/png",
    data,
    providerRequestID: response.created ? String(response.created) : undefined,
  };
}
