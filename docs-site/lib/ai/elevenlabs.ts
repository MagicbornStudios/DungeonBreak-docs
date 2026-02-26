import { z } from "zod";

const DialogueVoiceInputSchema = z.object({
  modelId: z.string().min(1),
  seed: z.number().int().optional(),
  text: z.string().min(1),
  voiceId: z.string().min(1),
});

const SoundEffectInputSchema = z.object({
  modelId: z.string().min(1),
  prompt: z.string().min(1),
  seed: z.number().int().optional(),
});

type ElevenLabsResult = {
  contentType: string;
  data: Buffer;
  durationSeconds?: number;
  providerRequestID?: string;
};

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }
  return key;
}

async function readAudioResponse(response: Response): Promise<ElevenLabsResult> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ElevenLabs request failed (${response.status}): ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "audio/mpeg";
  const providerRequestID = response.headers.get("x-request-id") || undefined;
  const durationHeader = response.headers.get("x-duration-seconds");
  const durationSeconds = durationHeader ? Number(durationHeader) : undefined;

  return {
    contentType,
    data: Buffer.from(arrayBuffer),
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : undefined,
    providerRequestID,
  };
}

export async function generateDialogueVoice(input: z.input<typeof DialogueVoiceInputSchema>) {
  const parsed = DialogueVoiceInputSchema.parse(input);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(parsed.voiceId)}`,
    {
      body: JSON.stringify({
        model_id: parsed.modelId,
        seed: parsed.seed,
        text: parsed.text,
      }),
      headers: {
        accept: "audio/mpeg",
        "content-type": "application/json",
        "xi-api-key": getApiKey(),
      },
      method: "POST",
    }
  );

  return readAudioResponse(response);
}

export async function generateSoundEffect(input: z.input<typeof SoundEffectInputSchema>) {
  const parsed = SoundEffectInputSchema.parse(input);
  const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    body: JSON.stringify({
      model_id: parsed.modelId,
      seed: parsed.seed,
      text: parsed.prompt,
    }),
    headers: {
      accept: "audio/mpeg",
      "content-type": "application/json",
      "xi-api-key": getApiKey(),
    },
    method: "POST",
  });

  return readAudioResponse(response);
}
