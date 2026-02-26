import type { CollectionConfig } from "payload";
import { isOwnerOrAdminUser } from "@/lib/access";

export const NarrativeEntities: CollectionConfig = {
  slug: "narrative-entities",
  admin: {
    defaultColumns: ["name", "sourceKey", "sourceVersion", "syncedAt"],
    useAsTitle: "name",
  },
  access: {
    read: ({ req: { user } }) => isOwnerOrAdminUser(user),
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
      name: "sourceKey",
      type: "text",
      required: true,
      unique: true,
      admin: {
        description: "Stable key from game export source.",
      },
    },
    {
      name: "startingCoordinates",
      type: "json",
      required: true,
      defaultValue: {},
    },
    {
      name: "previousCoordinates",
      type: "json",
      required: true,
      defaultValue: {},
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
