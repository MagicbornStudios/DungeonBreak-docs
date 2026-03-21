import type { CollectionConfig } from "payload";
import { validateSlug } from "@/lib/utils";

export const ContentProjects: CollectionConfig = {
  slug: "content-projects",
  admin: {
    defaultColumns: ["name", "slug", "status", "updatedAt"],
    useAsTitle: "name",
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
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
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Validated", value: "validated" },
        { label: "Published", value: "published" },
      ],
    },
    {
      name: "exportRoot",
      type: "text",
      required: true,
      defaultValue: "content-projects",
      admin: {
        description:
          "Directory under docs-site where exported contract-shaped files are written.",
      },
    },
    {
      name: "sourceMode",
      type: "select",
      required: true,
      defaultValue: "payload",
      options: [{ label: "Payload", value: "payload" }],
    },
    {
      name: "notes",
      type: "textarea",
    },
  ],
};
