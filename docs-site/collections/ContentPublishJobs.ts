import type { CollectionConfig } from "payload";

export const ContentPublishJobs: CollectionConfig = {
  slug: "content-publish-jobs",
  admin: {
    defaultColumns: ["jobId", "project", "status", "updatedAt"],
    useAsTitle: "jobId",
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: "jobId",
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
      name: "status",
      type: "select",
      required: true,
      defaultValue: "running",
      options: [
        { label: "Running", value: "running" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
      ],
    },
    {
      name: "exportRoot",
      type: "text",
    },
    {
      name: "commands",
      type: "json",
    },
    {
      name: "exportFiles",
      type: "json",
    },
    {
      name: "engineFiles",
      type: "json",
    },
    {
      name: "skippedPacks",
      type: "json",
    },
    {
      name: "errorMessage",
      type: "textarea",
    },
    {
      name: "summary",
      type: "json",
    },
  ],
};
