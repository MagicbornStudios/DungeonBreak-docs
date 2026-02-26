import type { CollectionConfig } from "payload";
import { isOwnerOrAdminUser, isOwnerUser } from "@/lib/access";

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    // Public read access for media files
    read: () => true,
    // Owner and admins can upload media
    create: ({ req: { user } }) => Boolean(isOwnerOrAdminUser(user)),
    // Owner and admins can update media
    update: ({ req: { user } }) => Boolean(isOwnerOrAdminUser(user)),
    // Only owner can delete media
    delete: ({ req: { user } }) => isOwnerUser(user),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
