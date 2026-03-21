import type { CollectionConfig } from "payload";
import { validateSlug } from "@/lib/utils";

export const ContentPlatformData: CollectionConfig = {
  slug: "content-platform-data",
  admin: {
    defaultColumns: ["dataId", "namespace", "project", "updatedAt"],
    useAsTitle: "dataId",
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
      name: "dataId",
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
      name: "platformLayer",
      type: "select",
      required: true,
      defaultValue: "docs-site-payloadcms",
      options: [{ label: "Docs Site + PayloadCMS", value: "docs-site-payloadcms" }],
      admin: {
        readOnly: true,
        description:
          "Fixed authoring platform for this collection. Runtime consumer decoration belongs in canonical content or a later delivery layer.",
      },
    },
    {
      name: "namespace",
      type: "select",
      required: true,
      defaultValue: "generic-extension",
      options: [
        { label: "Admin UI", value: "admin-ui" },
        { label: "Workflow", value: "workflow" },
        { label: "Publishing", value: "publishing" },
        { label: "Rendering", value: "rendering" },
        { label: "Integration", value: "integration" },
        { label: "Generic Extension", value: "generic-extension" },
      ],
    },
    {
      name: "targetId",
      type: "text",
      admin: {
        description:
          "Optional canonical pack/schema/entity id this docs-site/Payload authoring record decorates.",
      },
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
