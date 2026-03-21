import type { CollectionConfig } from "payload";

export const ContentDraftRevisions: CollectionConfig = {
  slug: "content-draft-revisions",
  admin: {
    defaultColumns: [
      "targetType",
      "targetKey",
      "changeKind",
      "project",
      "updatedAt",
    ],
    useAsTitle: "targetKey",
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
      name: "targetType",
      type: "select",
      required: true,
      options: [
        { label: "Pack Document", value: "pack-document" },
        { label: "Custom Schema", value: "custom-schema" },
        { label: "Platform Data", value: "platform-data" },
      ],
    },
    {
      name: "targetKey",
      type: "text",
      required: true,
    },
    {
      name: "targetName",
      type: "text",
      required: true,
    },
    {
      name: "targetDocumentId",
      type: "text",
      required: true,
    },
    {
      name: "changeKind",
      type: "select",
      required: true,
      defaultValue: "edit",
      options: [
        { label: "Import", value: "import" },
        { label: "Edit", value: "edit" },
        { label: "Publish", value: "publish" },
      ],
    },
    {
      name: "notes",
      type: "textarea",
    },
    {
      name: "document",
      type: "json",
      required: true,
    },
  ],
};
