import type { CollectionConfig } from "payload";
import { isOwnerOrAdminUser } from "@/lib/access";
import { validateSlug } from "@/lib/utils";

export const DialogueLines: CollectionConfig = {
  slug: "dialogue-lines",
  admin: {
    defaultColumns: ["label", "character", "scene", "updatedAt"],
    useAsTitle: "label",
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => isOwnerOrAdminUser(user),
    update: ({ req: { user } }) => isOwnerOrAdminUser(user),
    delete: ({ req: { user } }) => isOwnerOrAdminUser(user),
  },
  fields: [
    {
      name: "label",
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
      name: "character",
      type: "relationship",
      relationTo: "characters",
      required: true,
    },
    {
      name: "canonicalDialog",
      type: "relationship",
      relationTo: "narrative-dialogs",
    },
    {
      name: "scene",
      type: "text",
    },
    {
      name: "lineText",
      type: "textarea",
      required: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "audioVoiceId",
          type: "text",
          admin: {
            width: "50%",
            description: "Optional override for ElevenLabs voice ID.",
          },
        },
        {
          name: "audioModelId",
          type: "text",
          admin: {
            width: "50%",
            description: "Optional override for ElevenLabs model.",
          },
        },
      ],
    },
    {
      name: "audioSeed",
      type: "number",
      admin: {
        description: "Optional seed for deterministic generation.",
      },
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
      type: "ui",
      name: "generateDialogueAudio",
      admin: {
        components: {
          Field: "@/components/admin/GenerateAudioButton#GenerateAudioButton",
        },
      },
    },
    {
      type: "ui",
      name: "previewLatestDialogueAudio",
      admin: {
        components: {
          Field: "@/components/admin/AudioPreviewField#AudioPreviewField",
        },
      },
    },
  ],
};
