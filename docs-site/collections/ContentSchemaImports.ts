import type { CollectionConfig } from "payload";

export const ContentSchemaImports: CollectionConfig = {
  slug: "content-schema-imports",
  admin: {
    defaultColumns: ["packId", "project", "kind", "updatedAt"],
    useAsTitle: "packId",
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
      name: "packId",
      type: "text",
      required: true,
    },
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "kind",
      type: "text",
      required: true,
    },
    {
      name: "exportName",
      type: "text",
      required: true,
    },
    {
      name: "sourceFile",
      type: "text",
      required: true,
    },
    {
      name: "bundleKey",
      type: "text",
    },
    {
      name: "contentSourcePath",
      type: "text",
    },
    {
      name: "schemaVersion",
      type: "text",
    },
    {
      name: "schemaRef",
      type: "text",
    },
    {
      name: "topLevelCounts",
      type: "json",
    },
    {
      name: "canonicalDocument",
      type: "json",
    },
    {
      name: "importStatus",
      type: "select",
      required: true,
      defaultValue: "imported",
      options: [
        { label: "Imported", value: "imported" },
        { label: "Refreshed", value: "refreshed" },
      ],
    },
  ],
};
