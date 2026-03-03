import {
  agentClose,
  generateAgentId,
  phaseUpdate,
  planCreate,
  snapshot,
  taskCreate,
  taskUpdate,
} from "./planning.js";

const printSnapshot = (data: Awaited<ReturnType<typeof snapshot>>) => {
  console.log("STATE");
  console.log(`current-phase: ${data.state.currentPhase}`);
  console.log(`current-plan: ${data.state.currentPlan}`);
  console.log(`status: ${data.state.status}`);
  console.log("agents:");
  for (const agent of data.agents) {
    console.log(`- ${agent.id} (${agent.phase}/${agent.plan}) ${agent.status} ${agent.done}/${agent.total} (${agent.pct}%)`);
  }
  console.log("");
  console.log("OPEN TASKS");
  for (const task of data.openTasks) {
    console.log(`- ${task.id} [${task.status}] ${task.goal} (agent: ${task.agentId})`);
  }
  console.log("");
  console.log("PHASE PROGRESS");
  for (const phase of data.phaseProgress) {
    console.log(`- ${phase.phase}: ${phase.done}/${phase.total} (${phase.pct}%)`);
  }
};

const main = async () => {
  const cmd = process.argv[2] ?? "help";

  if (cmd === "snapshot") {
    const data = await snapshot();
    printSnapshot(data);
    return;
  }

  if (cmd === "new-agent-id") {
    const data = await snapshot();
    printSnapshot(data);
    console.log(generateAgentId());
    return;
  }

  if (cmd === "task-update") {
    const taskId = process.argv[3];
    const status = process.argv[4];
    const agentId = process.argv[5];
    if (!taskId || !status) {
      console.log("Usage: planning task-update <taskId> <status> [agentId]");
      return;
    }
    await taskUpdate(taskId, status, agentId);
    return;
  }

  if (cmd === "task-create") {
    const phaseId = process.argv[3];
    const taskId = process.argv[4];
    const agentId = process.argv[5];
    const status = process.argv[6] ?? "planned";
    const goal = process.argv[7];
    const keywords = process.argv[8] ?? "";
    const command = process.argv[9] ?? "rg TODO .";
    if (!phaseId || !taskId || !agentId || !goal) {
      console.log(
        "Usage: planning task-create <phaseId> <taskId> <agentId> [status] \"<goal>\" [keywords] [command]",
      );
      return;
    }
    await taskCreate(phaseId, taskId, agentId, status, goal, keywords, command);
    return;
  }

  if (cmd === "phase-update") {
    const phaseId = process.argv[3];
    const status = process.argv[4];
    if (!phaseId || !status) {
      console.log("Usage: planning phase-update <phaseId> <status>");
      return;
    }
    await phaseUpdate(phaseId, status);
    return;
  }

  if (cmd === "agent-close") {
    const agentId = process.argv[3];
    if (!agentId) {
      console.log("Usage: planning agent-close <agentId>");
      return;
    }
    await agentClose(agentId);
    return;
  }

  if (cmd === "plan-create") {
    const phaseId = process.argv[3];
    const phaseName = process.argv[4];
    const planId = process.argv[5];
    const phaseDir = process.argv[6];
    if (!phaseId || !phaseName || !planId || !phaseDir) {
      console.log("Usage: planning plan-create <phaseId> <phaseName> <planId> <phaseDir>");
      return;
    }
    await planCreate(phaseId, phaseName, planId, phaseDir);
    return;
  }

  console.log(
    "Usage: planning snapshot | new-agent-id | task-update | task-create | phase-update | agent-close | plan-create",
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
