import type { CollectionConfig } from "payload";
import {
  isAllowedPortalEmail,
  normalizePortalEmail,
  roleForPortalEmail,
} from "@/lib/internal-portal-auth";

function withRole<T>(
  user: T
): (T & { role?: string; id?: string | number }) | null {
  return user as (T & { role?: string; id?: string | number }) | null;
}

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "name",
  },
  auth:
    typeof process !== "undefined" && process.env.NODE_ENV === "development"
      ? { tokenExpiration: 30 * 24 * 60 * 60 * 1000 }
      : true,
  access: {
    admin: ({ req: { user } }) => {
      const currentUser = withRole(user);
      return Boolean(
        currentUser?.role === "owner" || currentUser?.role === "admin"
      );
    },
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => {
      const currentUser = withRole(user);
      return currentUser?.role === "owner" || currentUser?.role === "admin";
    },
    update: ({ req: { user }, id }) => {
      const currentUser = withRole(user);
      if (currentUser?.role === "owner") {
        return true;
      }
      if (currentUser?.role === "admin") {
        return { role: { equals: "user" } };
      }
      return currentUser?.id === id;
    },
    delete: ({ req: { user }, id }) => {
      const currentUser = withRole(user);
      if (currentUser?.role === "owner") {
        return currentUser.id !== id;
      }
      return false;
    },
  },
  hooks: {
    beforeOperation: [
      async ({ args, operation }) => {
        if ((operation === "create" || operation === "update") && args.req) {
          const { data } = args;
          if (data?.email) {
            data.email = normalizePortalEmail(String(data.email));
          }

          const email =
            typeof data?.email === "string"
              ? normalizePortalEmail(data.email)
              : null;
          if (email && !isAllowedPortalEmail(email)) {
            throw new Error(
              "Only allowlisted internal emails can access this portal."
            );
          }
        }

        if (operation !== "create" || !args.req) {
          return;
        }

        const { data } = args;
        const payload = args.req.payload;
        const { totalDocs } = await payload.count({
          collection: "users",
        });

        if (data?.email && !data.role) {
          data.role = roleForPortalEmail(String(data.email));
        } else if (totalDocs === 0 && data) {
          data.role = "owner";
        } else if (data && !data.role) {
          data.role = "admin";
        }

        const currentUser = withRole(args.req.user);
        if (
          currentUser?.role === "admin" &&
          data?.role &&
          data.role !== "user"
        ) {
          throw new Error("Admins can only create users with 'user' role");
        }
      },
    ],
    afterOperation: [],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "user",
      options: [
        {
          label: "Owner",
          value: "owner",
        },
        {
          label: "Admin",
          value: "admin",
        },
        {
          label: "User",
          value: "user",
        },
      ],
      access: {
        create: ({ req: { user } }) => withRole(user)?.role === "owner",
        update: ({ req: { user } }) => withRole(user)?.role === "owner",
        read: () => true,
      },
      admin: {
        condition: (_data, _siblingData, { user }) =>
          withRole(user)?.role === "owner",
        description:
          "Owner: Full system access. Admin: Can create users and content. User: Read-only access. Admins will automatically create users with 'user' role.",
      },
    },
  ],
};
