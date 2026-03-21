import type { CollectionConfig } from "payload";
import { validateSlug } from "@/lib/utils";

export const ContentCustomSchemas: CollectionConfig = {
  slug: "content-custom-schemas",
  admin: {
    defaultColumns: ["schemaId", "project", "status", "updatedAt"],
    useAsTitle: "schemaId",
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
    },
    {
      name: "project",
      type: "relationship",
      relationTo: "content-projects",
      required: true,
    },
    {
      name: "schemaId",
      type: "text",
      required: true,
      validate: validateSlug,
    },
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "targetPackId",
      type: "text",
      admin: {
        description: "Optional pack or pack-family this schema extends.",
      },
    },
    {
      name: "schemaType",
      type: "select",
      required: true,
      defaultValue: "json-schema",
      options: [
        { label: "JSON Schema", value: "json-schema" },
        { label: "Object Schema", value: "object-schema" },
        { label: "Canonical Asset Schema", value: "canonical-asset" },
      ],
    },
    {
      name: "document",
      type: "json",
      required: true,
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Validated", value: "validated" },
        { label: "Exported", value: "exported" },
      ],
    },
  ],
};
