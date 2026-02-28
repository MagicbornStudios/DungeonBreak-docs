import { ACTION_CATALOG, type GameSnapshot, type PlayerAction } from "@dungeonbreak/engine";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { GameSessionStore } from "./session-store.js";

const store = new GameSessionStore();

const actionTypeSet = new Set(ACTION_CATALOG.actions.map((row) => row.actionType));
const sortedActionTypes = [...actionTypeSet].sort();

const textResult = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(value, null, 2),
    },
  ],
});

const ok = (value: Record<string, unknown>) => textResult({ ok: true, ...value });
const fail = (message: string, details?: unknown) => textResult({ ok: false, error: message, details });

const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
};

const actionTypeSchema = z.string().min(1).refine((value) => actionTypeSet.has(value), {
  message: `action_type must be one of: ${sortedActionTypes.join(", ")}`,
});

const payloadSchema = z.record(z.string(), z.unknown());

const server = new McpServer({
  name: "dungeonbreak-engine-mcp",
  version: "0.1.0",
});

server.tool(
  "create_session",
  "Create a deterministic Escape the Dungeon gameplay session.",
  {
    seed: z.number().int().optional(),
    session_id: z.string().optional(),
  },
  async ({ seed, session_id }) => {
    try {
      const session = store.createSession(seed, session_id);
      return ok({
        canonicalSeed: store.getCanonicalSeed(),
        session,
      });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool("list_sessions", "List active gameplay sessions.", {}, async () => {
  return ok({ sessions: store.listSessions() });
});

server.tool(
  "delete_session",
  "Delete an active gameplay session.",
  {
    session_id: z.string(),
  },
  async ({ session_id }) => {
    const deleted = store.deleteSession(session_id);
    return ok({ sessionId: session_id, deleted });
  },
);

server.tool(
  "get_status",
  "Get current status for a gameplay session.",
  {
    session_id: z.string(),
  },
  async ({ session_id }) => {
    try {
      return ok({
        sessionId: session_id,
        status: store.getStatus(session_id),
        look: store.getLook(session_id),
      });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "get_snapshot",
  "Get the full serializable snapshot for a gameplay session.",
  {
    session_id: z.string(),
  },
  async ({ session_id }) => {
    try {
      return ok({
        sessionId: session_id,
        snapshot: store.getSnapshot(session_id),
      });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "restore_snapshot",
  "Restore an existing gameplay session from a full snapshot.",
  {
    session_id: z.string(),
    snapshot: z.custom<GameSnapshot>((value) => typeof value === "object" && value !== null),
  },
  async ({ session_id, snapshot }) => {
    try {
      return ok({
        sessionId: session_id,
        session: store.restoreSnapshot(session_id, snapshot),
      });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "list_actions",
  "List legal and blocked actions for an entity in a session.",
  {
    session_id: z.string(),
    entity_id: z.string().optional(),
  },
  async ({ session_id, entity_id }) => {
    try {
      return ok({
        sessionId: session_id,
        entityId: entity_id ?? null,
        actions: store.listActions(session_id, entity_id),
      });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "dispatch_action",
  "Dispatch one action (one turn) in a session.",
  {
    session_id: z.string(),
    action_type: actionTypeSchema,
    payload: payloadSchema.optional(),
  },
  async ({ session_id, action_type, payload }) => {
    try {
      const action: PlayerAction = {
        actionType: action_type as PlayerAction["actionType"],
        payload: payload ?? {},
      };
      return ok(store.dispatchAction(session_id, action));
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "get_log_page",
  "Read chapter/entity log page lines for a session.",
  {
    session_id: z.string(),
    chapter: z.number().int().positive().optional(),
    entity_id: z.string().optional(),
  },
  async ({ session_id, chapter, entity_id }) => {
    try {
      return ok({
        sessionId: session_id,
        page: store.getLogPage(session_id, chapter, entity_id),
      });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DungeonBreak MCP server connected over stdio.");
};

main().catch((error) => {
  console.error("DungeonBreak MCP server failed:", errorMessage(error));
  process.exit(1);
});
