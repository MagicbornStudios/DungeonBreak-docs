import { UnauthorizedError, type PayloadRequest } from "payload";
import { mcpPlugin } from "@payloadcms/plugin-mcp";
import {
  allowedPortalEmails,
  onboardingPassword,
  normalizePortalEmail,
} from "@/lib/internal-portal-auth";
import type { User } from "@/payload-types";

type PortalUser = Partial<User> & {
  collection?: string;
};

type PayloadMcpOptions = Parameters<typeof mcpPlugin>[0];
type PayloadMcpOverrideAuth = NonNullable<PayloadMcpOptions["overrideAuth"]>;
type PayloadMcpDefaultAccessResolver = Parameters<PayloadMcpOverrideAuth>[1];
type PayloadMcpAccessSettings = Awaited<
  ReturnType<PayloadMcpDefaultAccessResolver>
>;
type PayloadUserRecord = User & {
  collection: "users";
  _strategy?: string;
};

function asPayloadUserRecord(
  value: PortalUser | null | undefined,
  strategy: string
): PayloadUserRecord | null {
  if (
    !value ||
    value.collection !== "users" ||
    typeof value.id !== "number" ||
    typeof value.name !== "string" ||
    typeof value.email !== "string" ||
    typeof value.updatedAt !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    email: value.email,
    updatedAt: value.updatedAt,
    createdAt: value.createdAt,
    role: value.role ?? null,
    resetPasswordToken: value.resetPasswordToken ?? null,
    resetPasswordExpiration: value.resetPasswordExpiration ?? null,
    salt: value.salt ?? null,
    hash: value.hash ?? null,
    loginAttempts: value.loginAttempts ?? null,
    lockUntil: value.lockUntil ?? null,
    sessions: value.sessions ?? null,
    password: value.password ?? null,
    collection: "users",
    _strategy: strategy,
  };
}

function readPortalUser(req: PayloadRequest): PayloadUserRecord | null {
  const user = req.user as PortalUser | null | undefined;
  return asPayloadUserRecord(user, "payload-mcp-session");
}

function canWrite(user: PortalUser): boolean {
  return user.role === "owner" || user.role === "admin";
}

type UntypedPayloadApi = {
  find: (options: Record<string, unknown>) => Promise<unknown>;
};

const payloadMcpCollections: NonNullable<PayloadMcpOptions["collections"]> = {
  "content-projects": {
    description: "DungeonBreak content-authoring projects and export roots.",
    enabled: { create: true, delete: true, find: true, update: true },
  },
  "content-schema-imports": {
    description: "Imported canonical game schemas available to Asset Explorer.",
    enabled: { create: true, delete: true, find: true, update: true },
  },
  "content-pack-documents": {
    description: "Canonical pack documents and imported authored pack JSON.",
    enabled: { create: true, delete: true, find: true, update: true },
  },
  "content-custom-schemas": {
    description: "Custom JSON schemas used by Asset Explorer and project authoring.",
    enabled: { create: true, delete: true, find: true, update: true },
  },
  "content-platform-data": {
    description: "Project data records that decorate canonical assets and schemas.",
    enabled: { create: true, delete: true, find: true, update: true },
  },
  "content-draft-revisions": {
    description: "Revision history for authoring changes and publish operations.",
    enabled: { create: false, delete: false, find: true, update: false },
  },
  "content-publish-jobs": {
    description: "Project publish job history and export summaries.",
    enabled: { create: false, delete: false, find: true, update: false },
  },
  media: {
    description: "Uploaded or generated media assets used by the game and portal.",
    enabled: { create: true, delete: true, find: true, update: true },
  },
  "audio-assets": {
    description: "Generated dialogue and sound-effect asset records.",
    enabled: { create: true, delete: true, find: true, update: true },
  },
  "image-assets": {
    description: "Generated image asset records for items, entities, and packs.",
    enabled: { create: true, delete: true, find: true, update: true },
  },
};

function payloadMcpEnabled(): boolean {
  return process.env.PAYLOAD_MCP_ENABLED?.trim().toLowerCase() === "true";
}

function payloadMcpBearerToken(): string {
  return process.env.PAYLOAD_MCP_BEARER_TOKEN?.trim() || onboardingPassword();
}

function payloadMcpEmail(): string {
  return normalizePortalEmail(
    process.env.PAYLOAD_MCP_EMAIL?.trim() || allowedPortalEmails()[0] || ""
  );
}

async function findPayloadMcpUser(req: PayloadRequest): Promise<PayloadUserRecord | null> {
  const email = payloadMcpEmail();
  if (!email) {
    return null;
  }

  const payloadApi = req.payload as unknown as UntypedPayloadApi;
  const result = (await payloadApi.find({
    collection: "users",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      email: {
        equals: email,
      },
    },
  })) as { docs?: PortalUser[] };

  const user = result.docs?.[0];
  if (!user?.id) {
    return null;
  }

  return asPayloadUserRecord(
    {
      ...user,
      collection: "users",
    },
    "payload-mcp-bearer"
  );
}

async function resolvePayloadMcpUser(req: PayloadRequest): Promise<PayloadUserRecord | null> {
  const sessionUser = readPortalUser(req);
  if (sessionUser) {
    return sessionUser;
  }

  const authorization = req.headers.get("authorization") ?? "";
  const [scheme, rawToken] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !rawToken) {
    return null;
  }

  if (rawToken.trim() !== payloadMcpBearerToken()) {
    return null;
  }

  return findPayloadMcpUser(req);
}

const payloadMcpConfig: PayloadMcpOptions = {
  collections: payloadMcpCollections,
  disabled: !payloadMcpEnabled(),
  userCollection: "users",
  mcp: {
    serverOptions: {
      serverInfo: {
        name: "dungeonbreak-payload-mcp",
        version: "0.1.0",
      },
    },
  },
  overrideAuth: async (
    req: PayloadRequest,
    getDefaultMcpAccessSettings: PayloadMcpDefaultAccessResolver
  ): Promise<PayloadMcpAccessSettings> => {
    const user = await resolvePayloadMcpUser(req);
    if (!user) {
      return getDefaultMcpAccessSettings();
    }

    const write = canWrite(user);

    return {
      user,
      collections: write
        ? { create: true, delete: true, find: true, update: true }
        : { find: true },
      custom: {},
      globals: write ? { find: true, update: true } : { find: true },
      "payload-mcp-prompt": {},
      "payload-mcp-resource": {},
      "payload-mcp-tool": {},
    };
  },
};

export const dungeonBreakPayloadMcpPlugin = mcpPlugin(payloadMcpConfig);

export function assertPayloadMcpUser(req: PayloadRequest): PortalUser {
  const user = readPortalUser(req);
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}
