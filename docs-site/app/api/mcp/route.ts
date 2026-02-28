import configPromise from "@payload-config";
import type { GameSnapshot, PlayerAction } from "@dungeonbreak/engine";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { createPayloadRequest, getPayload } from "payload";
import { z } from "zod/v3";
import { parseFrameAction } from "@/lib/assistant-frame/frame-actions";
import { getRemoteMcpStore } from "@/lib/mcp/remote-session-store";

type AuthExtra = {
  userId: string;
  role: string;
  collection: string;
};

const store = getRemoteMcpStore();

const readUserFromRequest = async (request: Request): Promise<AuthExtra | null> => {
  await getPayload({ config: configPromise });
  const payloadRequest = await createPayloadRequest({
    config: configPromise,
    request,
  });
  const user = payloadRequest.user as
    | { id?: number | string; role?: string; collection?: string }
    | undefined;
  if (!user || user.collection !== "users" || user.id === undefined || user.id === null) {
    return null;
  }
  return {
    userId: String(user.id),
    role: user.role ?? "user",
    collection: user.collection,
  };
};

const requireUserId = (authInfo: { extra?: Record<string, unknown> } | undefined): string => {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("unauthorized");
  }
  return userId;
};

const withAudit = (
  userId: string,
  action: string,
  payload: Record<string, unknown>,
  context: { requestId?: string | number | null; sessionId?: string | null },
) => {
  return {
    ...payload,
    audit: {
      action,
      userId,
      sessionId: context.sessionId ?? null,
      requestId: context.requestId ?? null,
      timestamp: new Date().toISOString(),
    },
  };
};

const baseHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_session",
      {
        title: "Create Session",
        description: "Create a deterministic Escape the Dungeon gameplay session.",
        inputSchema: {
          seed: z.number().int().optional(),
          session_id: z.string().optional(),
        },
      },
      async ({ seed, session_id }, extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);
        const session = store.createSession(userId, seed, session_id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "create_session",
                  {
                    ok: true,
                    canonicalSeed: store.getCanonicalSeed(),
                    session,
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "list_sessions",
      {
        title: "List Sessions",
        description: "List active gameplay sessions for the authenticated user.",
      },
      async (extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "list_sessions",
                  {
                    ok: true,
                    sessions: store.listSessions(userId),
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "delete_session",
      {
        title: "Delete Session",
        description: "Delete one active gameplay session.",
        inputSchema: {
          session_id: z.string(),
        },
      },
      async ({ session_id }, extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "delete_session",
                  {
                    ok: true,
                    sessionId: session_id,
                    deleted: store.deleteSession(userId, session_id),
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_status",
      {
        title: "Get Status",
        description: "Get current status and look output for a gameplay session.",
        inputSchema: {
          session_id: z.string(),
        },
      },
      async ({ session_id }, extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "get_status",
                  {
                    ok: true,
                    sessionId: session_id,
                    status: store.getStatus(userId, session_id),
                    look: store.getLook(userId, session_id),
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_snapshot",
      {
        title: "Get Snapshot",
        description: "Get the full serializable snapshot for a gameplay session.",
        inputSchema: {
          session_id: z.string(),
        },
      },
      async ({ session_id }, extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "get_snapshot",
                  {
                    ok: true,
                    sessionId: session_id,
                    snapshot: store.getSnapshot(userId, session_id),
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "restore_snapshot",
      {
        title: "Restore Snapshot",
        description: "Restore an existing gameplay session from a full snapshot.",
        inputSchema: {
          session_id: z.string(),
          snapshot: z.custom<GameSnapshot>((value) => typeof value === "object" && value !== null),
        },
      },
      async ({ session_id, snapshot }, extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "restore_snapshot",
                  {
                    ok: true,
                    sessionId: session_id,
                    session: store.restoreSnapshot(userId, session_id, snapshot),
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "list_actions",
      {
        title: "List Actions",
        description: "List legal and blocked actions for an entity in a session.",
        inputSchema: {
          session_id: z.string(),
          entity_id: z.string().optional(),
        },
      },
      async ({ session_id, entity_id }, extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "list_actions",
                  {
                    ok: true,
                    sessionId: session_id,
                    entityId: entity_id ?? null,
                    actions: store.listActions(userId, session_id, entity_id),
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "dispatch_action",
      {
        title: "Dispatch Action",
        description: "Dispatch one action (one turn) in a session.",
        inputSchema: {
          session_id: z.string(),
          action_type: z.string().min(1),
          payload: z.record(z.unknown()).optional(),
        },
      },
      async ({ session_id, action_type, payload }, extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);

        const parsed = parseFrameAction(action_type, payload);
        if (!parsed.ok) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  withAudit(
                    userId,
                    "dispatch_action",
                    {
                      ok: false,
                      error: parsed.error,
                    },
                    { requestId: extra.requestId, sessionId: extra.sessionId },
                  ),
                ),
              },
            ],
          };
        }

        const action: PlayerAction = parsed.action;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "dispatch_action",
                  {
                    ok: true,
                    ...store.dispatchAction(userId, session_id, action),
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_log_page",
      {
        title: "Get Log Page",
        description: "Read chapter/entity log page lines for a session.",
        inputSchema: {
          session_id: z.string(),
          chapter: z.number().int().positive().optional(),
          entity_id: z.string().optional(),
        },
      },
      async ({ session_id, chapter, entity_id }, extra) => {
        const userId = requireUserId(extra.authInfo);
        store.assertRateLimit(userId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                withAudit(
                  userId,
                  "get_log_page",
                  {
                    ok: true,
                    sessionId: session_id,
                    page: store.getLogPage(userId, session_id, chapter, entity_id),
                  },
                  { requestId: extra.requestId, sessionId: extra.sessionId },
                ),
              ),
            },
          ],
        };
      },
    );
  },
  {
    serverInfo: {
      name: "dungeonbreak-remote-mcp",
      version: "0.1.0",
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    disableSse: true,
  },
);

const handler = withMcpAuth(
  baseHandler,
  async (request) => {
    const user = await readUserFromRequest(request);
    if (!user) {
      return undefined;
    }
    return {
      token: `session:${user.userId}`,
      clientId: user.userId,
      scopes: ["game:play"],
      extra: user,
    };
  },
  {
    required: true,
    requiredScopes: ["game:play"],
    resourceMetadataPath: "/api/.well-known/oauth-protected-resource",
  },
);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handler;
export const POST = handler;
