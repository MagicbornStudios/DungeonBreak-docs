import type { CollectionConfig } from "payload";
import { isOwnerOrAdminUser } from "@/lib/access";

export const ImageAssets: CollectionConfig = {
  slug: "image-assets",
  admin: {
    defaultColumns: ["assetType", "status", "provider", "updatedAt"],
    useAsTitle: "prompt",
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
        { label: "Character Portrait", value: "character_portrait" },
        { label: "Weapon Art", value: "weapon_art" },
        { label: "Item Art", value: "item_art" },
      ],
    },
    {
      name: "provider",
      type: "select",
      required: true,
      defaultValue: "openai",
      options: [{ label: "OpenAI", value: "openai" }],
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
      name: "prompt",
      type: "textarea",
      required: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "model",
          type: "text",
          required: true,
          defaultValue: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
          admin: {
            width: "34%",
          },
        },
        {
          name: "size",
          type: "select",
          required: true,
          defaultValue: "1024x1024",
          admin: {
            width: "33%",
          },
          options: [
            { label: "1024x1024", value: "1024x1024" },
            { label: "1024x1536", value: "1024x1536" },
            { label: "1536x1024", value: "1536x1024" },
          ],
        },
        {
          name: "quality",
          type: "select",
          required: true,
          defaultValue: "auto",
          admin: {
            width: "33%",
          },
          options: [
            { label: "Auto", value: "auto" },
            { label: "Low", value: "low" },
            { label: "Medium", value: "medium" },
            { label: "High", value: "high" },
          ],
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
            width: "34%",
          },
        },
        {
          name: "weapon",
          type: "relationship",
          relationTo: "weapons",
          admin: {
            width: "33%",
          },
        },
        {
          name: "item",
          type: "relationship",
          relationTo: "items",
          admin: {
            width: "33%",
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
  ],
};
