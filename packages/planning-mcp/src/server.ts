import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(): string {
  let dir = path.resolve(__dirname, "..");
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, ".planning")) && fs.existsSync(path.join(dir, "scripts", "loop-cli.mjs"))) {
      return dir;
    }
    dir = path.join(dir, "..");
  }
  return path.resolve(__dirname, "..", "..");
}

function runLoopCli(args: string[], repoRoot: string): { ok: true; data: unknown } | { ok: false; error: string } {
  const cliPath = path.join(repoRoot, "scripts", "loop-cli.mjs");
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) {
    return { ok: false, error: result.error.message };
  }
  if (result.status !== 0) {
    return { ok: false, error: result.stderr?.trim() || `Exit ${result.status}` };
  }
  try {
    const data = JSON.parse(result.stdout?.trim() || "null");
    return { ok: true, data };
  } catch {
    return { ok: false, error: "CLI did not return valid JSON" };
  }
}

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

server.tool(
  "open_questions",
  "List open questions from phase PLANs with file path references (planPath) so you can open the PLAN file. Same as planning questions --json.",
  { include_closed: z.boolean().optional() },
  async ({ include_closed }) => {
    const args = ["questions", "--json"];
    if (include_closed) args.push("--all");
    const out = runLoopCli(args, findRepoRoot());
    if (!out.ok) return fail(out.error);
    return ok({ open_questions: out.data });
  },
);

server.tool(
  "get_agent_bundle",
  "Full agent-loop bundle: snapshot, context paths, open tasks, open questions (with file refs), conventions. Same as planning simulate loop --json. Use for orchestration so all agents share one view.",
  {},
  async () => {
    const out = runLoopCli(["simulate", "loop", "--json"], findRepoRoot());
    if (!out.ok) return fail(out.error);
    return ok({ bundle: out.data });
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
