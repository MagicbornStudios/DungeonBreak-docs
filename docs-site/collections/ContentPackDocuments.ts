import type { CollectionConfig } from "payload";

export const ContentPackDocuments: CollectionConfig = {
  slug: "content-pack-documents",
  admin: {
    defaultColumns: ["packId", "project", "status", "updatedAt"],
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
      name: "schemaImport",
      type: "relationship",
      relationTo: "content-schema-imports",
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
      name: "document",
      type: "json",
      required: true,
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "imported",
      options: [
        { label: "Imported", value: "imported" },
        { label: "Edited", value: "edited" },
        { label: "Exported", value: "exported" },
      ],
    },
  ],
};
