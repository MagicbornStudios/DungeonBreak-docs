import type { CollectionConfig } from "payload";
import { isOwnerOrAdminUser } from "@/lib/access";
import { validateSlug } from "@/lib/utils";

export const Weapons: CollectionConfig = {
  slug: "weapons",
  admin: {
    defaultColumns: ["name", "slug", "updatedAt"],
    useAsTitle: "name",
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isOwnerOrAdminUser(user),
    update: ({ req: { user } }) => isOwnerOrAdminUser(user),
    delete: ({ req: { user } }) => isOwnerOrAdminUser(user),
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      validate: validateSlug,
    },
    {
      name: "description",
      type: "textarea",
    },
    {
      name: "soundEffectPrompt",
      type: "textarea",
      required: true,
      admin: {
        description: "Prompt for ElevenLabs weapon SFX generation.",
      },
    },
    {
      name: "imagePrompt",
      type: "textarea",
      admin: {
        description: "Prompt for OpenAI weapon art generation.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "audioModelId",
          type: "text",
          defaultValue: process.env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2",
          admin: {
            width: "50%",
          },
        },
        {
          name: "audioSeed",
          type: "number",
          admin: {
            width: "50%",
          },
        },
      ],
    },
    {
      name: "latestAudioAsset",
      type: "relationship",
      relationTo: "audio-assets",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "latestImageAsset",
      type: "relationship",
      relationTo: "image-assets",
      admin: {
        readOnly: true,
      },
    },
    {
      type: "ui",
      name: "generateWeaponAudio",
      admin: {
        components: {
          Field: "@/components/admin/GenerateAudioButton#GenerateAudioButton",
        },
      },
    },
    {
      type: "ui",
      name: "previewWeaponAudio",
      admin: {
        components: {
          Field: "@/components/admin/AudioPreviewField#AudioPreviewField",
        },
      },
    },
    {
      type: "ui",
      name: "generateWeaponImage",
      admin: {
        components: {
          Field: "@/components/admin/GenerateImageButton#GenerateImageButton",
        },
      },
    },
  ],
};
