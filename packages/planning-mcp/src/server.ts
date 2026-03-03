import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  agentClose,
  generateAgentId,
  phaseUpdate,
  planCreate,
  snapshot,
  taskCreate,
  taskUpdate,
} from "./planning.js";

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

const server = new McpServer({
  name: "dungeonbreak-planning-mcp",
  version: "0.1.0",
});

server.tool("snapshot", "Snapshot current planning state, agents, tasks, and progress.", {}, async () => {
  try {
    const data = await snapshot();
    return ok({ snapshot: data });
  } catch (error) {
    return fail(errorMessage(error));
  }
});

server.tool("new_agent_id", "Generate a unique agent id and include a snapshot for context.", {}, async () => {
  try {
    const data = await snapshot();
    const agentId = generateAgentId();
    return ok({ agentId, snapshot: data });
  } catch (error) {
    return fail(errorMessage(error));
  }
});

server.tool(
  "task_update",
  "Update task status and optionally reassign agent.",
  {
    task_id: z.string(),
    status: z.string(),
    agent_id: z.string().optional(),
  },
  async ({ task_id, status, agent_id }) => {
    try {
      await taskUpdate(task_id, status, agent_id);
      return ok({ taskId: task_id, status, agentId: agent_id ?? null });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "task_create",
  "Create a new task under a phase.",
  {
    phase_id: z.string(),
    task_id: z.string(),
    agent_id: z.string(),
    status: z.string().default("planned"),
    goal: z.string(),
    keywords: z.string().default(""),
    command: z.string().default("rg TODO ."),
  },
  async ({ phase_id, task_id, agent_id, status, goal, keywords, command }) => {
    try {
      await taskCreate(phase_id, task_id, agent_id, status, goal, keywords, command);
      return ok({ taskId: task_id, phaseId: phase_id });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "phase_update",
  "Update a phase status in ROADMAP.xml.",
  {
    phase_id: z.string(),
    status: z.string(),
  },
  async ({ phase_id, status }) => {
    try {
      await phaseUpdate(phase_id, status);
      return ok({ phaseId: phase_id, status });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "agent_close",
  "Deactivate an agent (set status inactive and clear phase/plan).",
  {
    agent_id: z.string(),
  },
  async ({ agent_id }) => {
    try {
      await agentClose(agent_id);
      return ok({ agentId: agent_id, status: "inactive" });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

server.tool(
  "plan_create",
  "Create a new phase plan XML from the PLAN template.",
  {
    phase_id: z.string(),
    phase_name: z.string(),
    plan_id: z.string(),
    phase_dir: z.string(),
  },
  async ({ phase_id, phase_name, plan_id, phase_dir }) => {
    try {
      await planCreate(phase_id, phase_name, plan_id, phase_dir);
      return ok({ planId: plan_id, phaseDir: phase_dir, phaseId: phase_id, phaseName: phase_name });
    } catch (error) {
      return fail(errorMessage(error));
    }
  },
);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DungeonBreak planning MCP server connected over stdio.");
};

main().catch((error) => {
  console.error("DungeonBreak planning MCP server failed:", errorMessage(error));
  process.exit(1);
});
