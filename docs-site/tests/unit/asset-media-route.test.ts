import { beforeEach, describe, expect, test, vi } from "vitest";

const createPayloadRequestMock = vi.fn();
const getPayloadMock = vi.fn();
const isOwnerOrAdminUserMock = vi.fn();
const findActiveGenerationByIdempotencyKeyMock = vi.fn();

vi.mock("@payload-config", () => ({
  default: {},
}));

vi.mock("payload", () => ({
  createPayloadRequest: createPayloadRequestMock,
  getPayload: getPayloadMock,
}));

vi.mock("@/lib/access", () => ({
  isOwnerOrAdminUser: isOwnerOrAdminUserMock,
}));

vi.mock("@/lib/generation/queries", () => ({
  findActiveGenerationByIdempotencyKey:
    findActiveGenerationByIdempotencyKeyMock,
}));

describe("asset media generation route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createPayloadRequestMock.mockResolvedValue({
      payload: {},
      user: {
        email: "bg@dungeonbreak.com",
      },
    });
    isOwnerOrAdminUserMock.mockReturnValue(true);
    findActiveGenerationByIdempotencyKeyMock.mockResolvedValue(null);
  });

  test("queues image generation for asset explorer fields", async () => {
    const createMock = vi.fn().mockResolvedValue({
      id: 101,
      prompt: "Stylized concept art of a relic.",
      status: "queued",
      updatedAt: "2026-03-23T12:00:00.000Z",
    });
    const updateMock = vi.fn().mockResolvedValue({});
    const queueMock = vi.fn().mockResolvedValue({
      id: "job-image-101",
    });

    getPayloadMock.mockResolvedValue({
      create: createMock,
      jobs: {
        queue: queueMock,
      },
      update: updateMock,
    });

    const { POST } = await import("@/app/api/ai/generate/asset-media/route");
    const response = await POST(
      new Request("http://localhost/api/ai/generate/asset-media", {
        body: JSON.stringify({
          context: {
            assetId: "ember",
            assetName: "Ember",
            fieldPath: "latestImage",
            projectId: "project-1",
            schemaId: "items",
          },
          kind: "image",
          profile: "item_art",
          prompt: "Stylized concept art of a relic.",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      })
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      generation: {
        generationCollection: "image-assets",
        generationId: 101,
        kind: "image",
        profile: "item_art",
        prompt: "Stylized concept art of a relic.",
        status: "queued",
      },
    });
    expect(createMock).toHaveBeenCalledOnce();
    expect(queueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          generationId: 101,
        },
        queue: "ai-image",
        task: "generate-item-image",
      })
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "image-assets",
        data: {
          jobID: "job-image-101",
        },
        id: 101,
      })
    );
  });

  test("returns a planned response for video generation", async () => {
    const { POST } = await import("@/app/api/ai/generate/asset-media/route");
    const response = await POST(
      new Request("http://localhost/api/ai/generate/asset-media", {
        body: JSON.stringify({
          kind: "video",
          profile: "promo_clip",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      })
    );

    const body = await response.json();
    expect(response.status).toBe(501);
    expect(body).toEqual({
      error: "Video generation is planned but not wired yet.",
      note: "Use the media widget's Link Existing tab for video fields right now.",
      ok: false,
    });
    expect(getPayloadMock).not.toHaveBeenCalled();
  });

  test("reads queued audio generation status", async () => {
    const findByIDMock = vi.fn().mockResolvedValue({
      id: 303,
      media: {
        id: 88,
        url: "https://cdn.example.com/audio.mp3",
      },
      modelId: "eleven_multilingual_v2",
      sourceTextOrPrompt: "The dungeon remembers your name.",
      status: "processing",
      updatedAt: "2026-03-23T12:05:00.000Z",
      voiceId: "voice_kael",
    });

    getPayloadMock.mockResolvedValue({
      findByID: findByIDMock,
    });

    const { GET } = await import("@/app/api/ai/generate/asset-media/route");
    const response = await GET(
      new Request(
        "http://localhost/api/ai/generate/asset-media?kind=audio&generationId=303"
      )
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      generation: {
        generationCollection: "audio-assets",
        generationId: 303,
        kind: "audio",
        mediaId: 88,
        mediaUrl: "https://cdn.example.com/audio.mp3",
        model: "eleven_multilingual_v2",
        sourceTextOrPrompt: "The dungeon remembers your name.",
        status: "processing",
        voiceId: "voice_kael",
      },
    });
    expect(findByIDMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "audio-assets",
        id: 303,
      })
    );
  });
});
