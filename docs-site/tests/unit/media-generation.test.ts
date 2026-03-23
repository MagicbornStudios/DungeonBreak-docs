import { describe, expect, test } from "vitest";
import type { RJSFSchema } from "@rjsf/utils";
import {
  buildAssetExplorerUiSchema,
  buildMediaGenerationRequest,
  getStringAtPath,
  mediaFieldConfigAtPath,
  mediaFieldConfigFromSchema,
  mediaFieldValue,
  resolveMediaGenerationDraft,
} from "@/lib/asset-explorer/media-generation";

const mediaSchema = {
  type: "object",
  properties: {
    imagePrompt: {
      type: "string",
    },
    voiceId: {
      type: "string",
    },
    latestImage: {
      description: "Latest generated image metadata",
      title: "Latest Image",
      type: "object",
      "x-dungeonbreak-media": {
        defaultProfile: "item_art",
        kind: "image",
        promptField: "imagePrompt",
      },
    },
    latestVoice: {
      title: "Latest Voice",
      type: "object",
      "x-dungeonbreak-media": {
        defaultProfile: "dialogue_voice",
        kind: "audio",
        textField: "lineText",
        voiceIdField: "voiceId",
      },
    },
    lineText: {
      type: "string",
    },
  },
} as unknown as RJSFSchema;

describe("asset explorer media generation helpers", () => {
  test("reads media widget schema annotations", () => {
    const latestImageConfig = mediaFieldConfigAtPath(
      mediaSchema,
      "latestImage"
    );
    expect(latestImageConfig).toEqual({
      allowManualUrl: true,
      defaultProfile: "item_art",
      kind: "image",
      promptField: "imagePrompt",
    });

    expect(
      mediaFieldConfigFromSchema(
        (mediaSchema.properties as Record<string, RJSFSchema>).latestVoice
      )
    ).toEqual({
      allowManualUrl: true,
      defaultProfile: "dialogue_voice",
      kind: "audio",
      textField: "lineText",
      voiceIdField: "voiceId",
    });
  });

  test("builds nested ui schema for annotated media fields", () => {
    expect(buildAssetExplorerUiSchema(mediaSchema)).toEqual({
      latestImage: {
        "ui:field": "dungeonbreakMediaField",
        "ui:options": {
          mediaConfig: {
            allowManualUrl: true,
            defaultProfile: "item_art",
            kind: "image",
            promptField: "imagePrompt",
          },
        },
      },
      latestVoice: {
        "ui:field": "dungeonbreakMediaField",
        "ui:options": {
          mediaConfig: {
            allowManualUrl: true,
            defaultProfile: "dialogue_voice",
            kind: "audio",
            textField: "lineText",
            voiceIdField: "voiceId",
          },
        },
      },
    });
  });

  test("resolves prompt and voice defaults from root asset form data", () => {
    const latestVoiceConfig = mediaFieldConfigAtPath(
      mediaSchema,
      "latestVoice"
    );
    expect(latestVoiceConfig).toBeTruthy();
    if (!latestVoiceConfig) {
      return;
    }

    const rootFormData = {
      imagePrompt: "Illustrated card art of a blazing rune.",
      lineText: "The dungeon remembers your name.",
      voiceId: "voice_kael",
    };

    expect(getStringAtPath(rootFormData, "lineText")).toBe(
      "The dungeon remembers your name."
    );

    expect(
      resolveMediaGenerationDraft(latestVoiceConfig, {}, rootFormData)
    ).toEqual({
      model: null,
      profile: "dialogue_voice",
      prompt: null,
      quality: null,
      size: null,
      sourceTextOrPrompt: "The dungeon remembers your name.",
      voiceId: "voice_kael",
    });
  });

  test("normalizes stored field values and builds queue requests", () => {
    const latestImageConfig = mediaFieldConfigAtPath(
      mediaSchema,
      "latestImage"
    );
    expect(latestImageConfig).toBeTruthy();
    if (!latestImageConfig) {
      return;
    }

    const currentFieldValue = mediaFieldValue(
      {
        generationId: 42,
        mediaUrl: "https://cdn.example.com/image.png",
        profile: "item_art",
        status: "succeeded",
      },
      "image"
    );

    expect(currentFieldValue).toMatchObject({
      generationId: 42,
      kind: "image",
      mediaUrl: "https://cdn.example.com/image.png",
      profile: "item_art",
      status: "succeeded",
    });

    expect(
      buildMediaGenerationRequest(
        latestImageConfig,
        currentFieldValue,
        {
          imagePrompt: "Painted concept art of a moonlit blade.",
        },
        {
          assetId: "moonlit-blade",
          assetName: "Moonlit Blade",
          fieldPath: "latestImage",
          projectId: "project-1",
          schemaId: "weapons",
        }
      )
    ).toEqual({
      context: {
        assetId: "moonlit-blade",
        assetName: "Moonlit Blade",
        fieldPath: "latestImage",
        projectId: "project-1",
        schemaId: "weapons",
      },
      kind: "image",
      profile: "item_art",
      prompt: "Painted concept art of a moonlit blade.",
    });
  });
});
