import { describe, expect, test } from "vitest";
import { decorateAssetSchemaDocument } from "@/lib/content-editor/payload-content-authoring";

describe("payload content authoring media schema decoration", () => {
  test("adds item media prompts and generated slots", () => {
    const decorated = decorateAssetSchemaDocument("itemPack", {
      properties: {
        itemId: { type: "string" },
        name: { type: "string" },
      },
      type: "object",
    });

    expect(decorated).toMatchObject({
      properties: {
        imagePrompt: {
          type: "string",
        },
        soundEffectPrompt: {
          type: "string",
        },
        latestAudio: {
          "x-dungeonbreak-media": {
            defaultProfile: "item_sfx",
            kind: "audio",
            textField: "soundEffectPrompt",
          },
        },
        latestImage: {
          "x-dungeonbreak-media": {
            defaultProfile: "item_art",
            kind: "image",
            promptField: "imagePrompt",
          },
        },
      },
    });
  });

  test("adds dialogue voice fields and generated audio slot", () => {
    const decorated = decorateAssetSchemaDocument("dialoguePack", {
      properties: {
        dialogueId: { type: "string" },
        line: { type: "string" },
      },
      type: "object",
    });

    expect(decorated).toMatchObject({
      properties: {
        audioModelId: {
          type: "string",
        },
        audioVoiceId: {
          type: "string",
        },
        latestAudio: {
          "x-dungeonbreak-media": {
            defaultProfile: "dialogue_voice",
            kind: "audio",
            modelField: "audioModelId",
            textField: "line",
            voiceIdField: "audioVoiceId",
          },
        },
      },
    });
  });

  test("adds entity portrait prompt and generated image slot inside visualRef", () => {
    const decorated = decorateAssetSchemaDocument("entityTypes", {
      properties: {
        entityTypeId: { type: "string" },
        visualRef: {
          type: "object",
        },
      },
      type: "object",
    });

    expect(decorated).toMatchObject({
      properties: {
        visualRef: {
          properties: {
            latestImage: {
              "x-dungeonbreak-media": {
                defaultProfile: "character_portrait",
                kind: "image",
                promptField: "visualRef.portraitPrompt",
              },
            },
            portraitPrompt: {
              type: "string",
            },
          },
          type: "object",
        },
      },
    });
  });
});
