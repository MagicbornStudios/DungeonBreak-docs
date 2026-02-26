import type { CollectionConfig } from "payload";
import { isOwnerOrAdminUser } from "@/lib/access";

export const NarrativeDialogs: CollectionConfig = {
  slug: "narrative-dialogs",
  admin: {
    defaultColumns: ["label", "sourceKey", "sourceVersion", "syncedAt"],
    useAsTitle: "label",
  },
  access: {
    read: ({ req: { user } }) => isOwnerOrAdminUser(user),
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
      name: "phrase",
      type: "textarea",
    },
    {
      name: "location",
      type: "json",
      required: true,
      defaultValue: {},
    },
    {
      name: "force",
      type: "json",
      required: true,
      defaultValue: {},
    },
    {
      name: "scenes",
      type: "array",
      fields: [
        {
          name: "scene",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "sourceKey",
      type: "text",
      required: true,
      unique: true,
      admin: {
        description: "Stable key from game export source.",
      },
    },
    {
      name: "sourceVersion",
      type: "number",
      required: true,
      defaultValue: 1,
    },
    {
      name: "syncedAt",
      type: "date",
      required: true,
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
    {
      name: "metadata",
      type: "json",
    },
  ],
};
