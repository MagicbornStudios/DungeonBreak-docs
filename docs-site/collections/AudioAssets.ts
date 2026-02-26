import type { CollectionConfig } from "payload";
import { isOwnerOrAdminUser } from "@/lib/access";

export const AudioAssets: CollectionConfig = {
  slug: "audio-assets",
  admin: {
    defaultColumns: ["assetType", "status", "provider", "updatedAt"],
    useAsTitle: "sourceTextOrPrompt",
  },
  access: {
    read: ({ req: { user } }) => isOwnerOrAdminUser(user),
    create: ({ req: { user } }) => isOwnerOrAdminUser(user),
    update: ({ req: { user } }) => isOwnerOrAdminUser(user),
    delete: ({ req: { user } }) => isOwnerOrAdminUser(user),
  },
  fields: [
    {
      name: "assetType",
      type: "select",
      required: true,
      options: [
        { label: "Dialogue Voice", value: "dialogue_voice" },
        { label: "Weapon SFX", value: "weapon_sfx" },
        { label: "Item SFX", value: "item_sfx" },
      ],
    },
    {
      name: "provider",
      type: "select",
      required: true,
      defaultValue: "elevenlabs",
      options: [{ label: "ElevenLabs", value: "elevenlabs" }],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "queued",
      options: [
        { label: "Queued", value: "queued" },
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
      ],
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "sourceTextOrPrompt",
      type: "textarea",
      required: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "voiceId",
          type: "text",
          required: true,
          admin: {
            width: "50%",
          },
        },
        {
          name: "modelId",
          type: "text",
          required: true,
          admin: {
            width: "50%",
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "durationSeconds",
          type: "number",
          admin: {
            width: "50%",
          },
        },
        {
          name: "seed",
          type: "number",
          admin: {
            width: "50%",
          },
        },
      ],
    },
    {
      name: "media",
      type: "relationship",
      relationTo: "media",
    },
    {
      type: "row",
      fields: [
        {
          name: "character",
          type: "relationship",
          relationTo: "characters",
          admin: {
            width: "25%",
          },
        },
        {
          name: "dialogueLine",
          type: "relationship",
          relationTo: "dialogue-lines",
          admin: {
            width: "25%",
          },
        },
        {
          name: "weapon",
          type: "relationship",
          relationTo: "weapons",
          admin: {
            width: "25%",
          },
        },
        {
          name: "item",
          type: "relationship",
          relationTo: "items",
          admin: {
            width: "25%",
          },
        },
      ],
    },
    {
      name: "jobID",
      type: "text",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "providerRequestID",
      type: "text",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "idempotencyKey",
      type: "text",
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: "errorMessage",
      type: "textarea",
      admin: {
        readOnly: true,
      },
    },
    {
      name: "metadata",
      type: "json",
    },
    {
      type: "ui",
      name: "generationStatusBadge",
      admin: {
        components: {
          Field: "@/components/admin/GenerationStatusBadge#GenerationStatusBadge",
        },
      },
    },
    {
      type: "ui",
      name: "audioPreview",
      admin: {
        components: {
          Field: "@/components/admin/AudioPreviewField#AudioPreviewField",
        },
      },
    },
  ],
};
