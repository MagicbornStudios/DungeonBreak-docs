import type { CollectionConfig } from "payload";
import { isOwnerOrAdminUser } from "@/lib/access";
import { validateSlug } from "@/lib/utils";

export const Characters: CollectionConfig = {
  slug: "characters",
  admin: {
    defaultColumns: ["name", "slug", "voiceId", "updatedAt"],
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
      name: "summary",
      type: "textarea",
    },
    {
      name: "canonicalEntityId",
      type: "text",
      admin: {
        description:
          "Optional canonical entity type or authored content id from the current game contracts.",
      },
    },
    {
      name: "traitIds",
      type: "text",
      hasMany: true,
      admin: {
        description:
          "Optional canonical trait ids carried alongside this character draft.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "voiceId",
          type: "text",
          admin: {
            width: "50%",
            description: "Default ElevenLabs voice for this character.",
          },
        },
        {
          name: "voiceModelId",
          type: "text",
          defaultValue:
            process.env.ELEVENLABS_TTS_MODEL_ID || "eleven_multilingual_v2",
          admin: {
            width: "50%",
          },
        },
      ],
    },
    {
      name: "portraitPrompt",
      type: "textarea",
      admin: {
        description: "Prompt used when generating portrait concept art.",
      },
    },
    {
      name: "latestPortrait",
      type: "relationship",
      relationTo: "image-assets",
      admin: {
        readOnly: true,
      },
    },
    {
      type: "ui",
      name: "generateCharacterImage",
      admin: {
        components: {
          Field: "@/components/admin/GenerateImageButton#GenerateImageButton",
        },
      },
    },
  ],
};
