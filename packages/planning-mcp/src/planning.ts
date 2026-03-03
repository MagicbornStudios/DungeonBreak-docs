import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const PLANNING_DIR = path.join(ROOT, ".planning");
const PHASES_DIR = path.join(PLANNING_DIR, "phases");

const escapeCdata = (text: string) => text.replaceAll("]]>", "]]]]><![CDATA[>");

const readIfExists = async (filePath: string) => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const writeXml = async (filePath: string, content: string) => {
  await fs.writeFile(filePath, content, "utf8");
};

const extractSingleTag = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
};

type AgentInfo = {
  id: string;
  name: string;
  phase: string;
  plan: string;
  status: string;
};

type TaskInfo = {
  id: string;
  agentId: string;
  status: string;
  goal: string;
  phase: string;
};

export const parseAgentsFromState = (xml: string): AgentInfo[] => {
  const agents: AgentInfo[] = [];
  const agentRegex = /<agent id="([^"]+)">([\s\S]*?)<\/agent>/g;
  let match: RegExpExecArray | null;
  while ((match = agentRegex.exec(xml))) {
    const block = match[2];
    agents.push({
      id: match[1],
      name: extractSingleTag(block, "name"),
      phase: extractSingleTag(block, "phase"),
      plan: extractSingleTag(block, "plan"),
      status: extractSingleTag(block, "status"),
    });
  }
  return agents;
};

export const parseTasks = (xml: string): TaskInfo[] => {
  const tasks: TaskInfo[] = [];
  const taskRegex = /<task id="([^"]+)" agent-id="([^"]+)" status="([^"]+)">([\s\S]*?)<\/task>/g;
  let match: RegExpExecArray | null;
  while ((match = taskRegex.exec(xml))) {
    const block = match[4];
    tasks.push({
      id: match[1],
      agentId: match[2],
      status: match[3],
      goal: extractSingleTag(block, "goal"),
      phase: match[1].split("-")[0] ?? "",
    });
  }
  return tasks;
};

const computeProgress = (tasks: TaskInfo[]) => {
  const byPhase = new Map<string, TaskInfo[]>();
  const byAgent = new Map<string, TaskInfo[]>();
  for (const task of tasks) {
    const phase = task.phase || "unknown";
    const agent = task.agentId || "unassigned";
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    if (!byAgent.has(agent)) byAgent.set(agent, []);
    byPhase.get(phase)!.push(task);
    byAgent.get(agent)!.push(task);
  }
  return { byPhase, byAgent };
};

export const snapshot = async () => {
  const stateXml = await readIfExists(path.join(PLANNING_DIR, "STATE.xml"));
  const taskXml = await readIfExists(path.join(PLANNING_DIR, "TASK-REGISTRY.xml"));
  if (!stateXml || !taskXml) {
    throw new Error("STATE.xml or TASK-REGISTRY.xml not found.");
  }
  const currentPhase = extractSingleTag(stateXml, "current-phase");
  const currentPlan = extractSingleTag(stateXml, "current-plan");
  const status = extractSingleTag(stateXml, "status");
  const agents = parseAgentsFromState(stateXml);
  const allTasks = parseTasks(taskXml);
  const openTasks = allTasks.filter((task) => task.status !== "done");
  const progress = computeProgress(allTasks);

  const agentProgress = agents.map((agent) => {
    const tasksForAgent = progress.byAgent.get(agent.id) ?? [];
    const done = tasksForAgent.filter((t) => t.status === "done").length;
    const total = tasksForAgent.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { ...agent, done, total, pct };
  });

  const phaseProgress = [...progress.byPhase.entries()].map(([phase, phaseTasks]) => {
    const done = phaseTasks.filter((t) => t.status === "done").length;
    const total = phaseTasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { phase, done, total, pct };
  });

  return {
    state: { currentPhase, currentPlan, status },
    agents: agentProgress,
    openTasks,
    phaseProgress,
  };
};

export const generateAgentId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seed = Math.random().toString(36).slice(2, 6);
  return `agent-${y}${m}${d}-${seed}`;
};

const updateTaskStatus = (xml: string, taskId: string, status: string, agentId?: string) => {
  const taskRegex = new RegExp(`<task id="${taskId}" agent-id="([^"]+)" status="([^"]+)">`);
  if (!taskRegex.test(xml)) return null;
  return xml.replace(taskRegex, (_match, currentAgent, currentStatus) => {
    const nextAgent = agentId ?? currentAgent;
    const nextStatus = status ?? currentStatus;
    return `<task id="${taskId}" agent-id="${nextAgent}" status="${nextStatus}">`;
  });
};

const updatePhaseStatus = (xml: string, phaseId: string, status: string) => {
  const phaseRegex = new RegExp(`<phase id="${phaseId}">([\s\S]*?)<\/phase>`);
  const match = xml.match(phaseRegex);
  if (!match) return null;
  let block = match[1];
  if (block.includes("<status>")) {
    block = block.replace(/<status>[^<]*<\/status>/, `<status>${status}</status>`);
  } else {
    block = `${block.trim()}\n    <status>${status}</status>\n  `;
  }
  return xml.replace(phaseRegex, `<phase id="${phaseId}">${block}</phase>`);
};

const deactivateAgent = (xml: string, agentId: string) => {
  const agentRegex = new RegExp(`<agent id="${agentId}">([\s\S]*?)<\/agent>`);
  const match = xml.match(agentRegex);
  if (!match) return null;
  let block = match[1];
  block = block.replace(/<status>[^<]*<\/status>/, "<status>inactive</status>");
  block = block.replace(/<phase>[^<]*<\/phase>/, "<phase>none</phase>");
  block = block.replace(/<plan>[^<]*<\/plan>/, "<plan>none</plan>");
  return xml.replace(agentRegex, `<agent id="${agentId}">${block}</agent>`);
};

const insertTask = (xml: string, phaseId: string, taskXml: string) => {
  const phaseRegex = new RegExp(`<phase id="${phaseId}">([\s\S]*?)<\/phase>`);
  const match = xml.match(phaseRegex);
  if (!match) return null;
  let block = match[1];
  const insertion = `\n    ${taskXml.replace(/\n/g, "\n    ")}\n  `;
  return xml.replace(phaseRegex, `<phase id="${phaseId}">${block}${insertion}</phase>`);
};

const createTaskBlock = (taskId: string, agentId: string, status: string, goal: string, keywords: string, command: string) => {
  return [
    `<task id="${taskId}" agent-id="${agentId}" status="${status}">`,
    `  <goal>${goal}</goal>`,
    `  <keywords>${keywords}</keywords>`,
    "  <commands>",
    `    <command>${command}</command>`,
    "  </commands>",
    "</task>",
  ].join("\n");
};

const createPhasePlanFromTemplate = (template: string, phaseId: string, phaseName: string, date: string) =>
  template
    .replace("<phase-id>##</phase-id>", `<phase-id>${phaseId}</phase-id>`)
    .replace("<phase-name>##</phase-name>", `<phase-name>${phaseName}</phase-name>`)
    .replace("<date>YYYY-MM-DD</date>", `<date>${date}</date>`);

export const taskUpdate = async (taskId: string, status: string, agentId?: string) => {
  const taskPath = path.join(PLANNING_DIR, "TASK-REGISTRY.xml");
  const xml = await readIfExists(taskPath);
  if (!xml) throw new Error("TASK-REGISTRY.xml not found.");
  const updated = updateTaskStatus(xml, taskId, status, agentId);
  if (!updated) throw new Error(`Task ${taskId} not found.`);
  await writeXml(taskPath, updated);
};

export const taskCreate = async (
  phaseId: string,
  taskId: string,
  agentId: string,
  status: string,
  goal: string,
  keywords: string,
  command: string,
) => {
  const taskPath = path.join(PLANNING_DIR, "TASK-REGISTRY.xml");
  const xml = await readIfExists(taskPath);
  if (!xml) throw new Error("TASK-REGISTRY.xml not found.");
  const taskBlock = createTaskBlock(taskId, agentId, status, goal, keywords, command);
  const updated = insertTask(xml, phaseId, taskBlock);
  if (!updated) throw new Error(`Phase ${phaseId} not found.`);
  await writeXml(taskPath, updated);
};

export const phaseUpdate = async (phaseId: string, status: string) => {
  const roadmapPath = path.join(PLANNING_DIR, "ROADMAP.xml");
  const xml = await readIfExists(roadmapPath);
  if (!xml) throw new Error("ROADMAP.xml not found.");
  const updated = updatePhaseStatus(xml, phaseId, status);
  if (!updated) throw new Error(`Phase ${phaseId} not found.`);
  await writeXml(roadmapPath, updated);
};

export const agentClose = async (agentId: string) => {
  const statePath = path.join(PLANNING_DIR, "STATE.xml");
  const xml = await readIfExists(statePath);
  if (!xml) throw new Error("STATE.xml not found.");
  const updated = deactivateAgent(xml, agentId);
  if (!updated) throw new Error(`Agent ${agentId} not found.`);
  await writeXml(statePath, updated);
};

export const planCreate = async (phaseId: string, phaseName: string, planId: string, phaseDir: string) => {
  const templatePath = path.join(PLANNING_DIR, "templates", "PLAN-TEMPLATE.xml");
  const template = await readIfExists(templatePath);
  if (!template) throw new Error("PLAN-TEMPLATE.xml not found.");
  const date = new Date().toISOString().slice(0, 10);
  const planXml = createPhasePlanFromTemplate(template, planId, phaseName, date);
  const outPath = path.join(PHASES_DIR, phaseDir, `${planId}-PLAN.xml`);
  await writeXml(outPath, planXml);
};

export const migratePlanningMarkdown = async () => {
  const mdFiles = [
    "ROADMAP.md",
    "TASK-REGISTRY.md",
    "STATE.md",
    "DECISIONS.md",
    "ERRORS.md",
    "REQUIREMENTS.md",
    "REFERENCES.md",
    "PROJECT.md",
    "PRD-content-balancing.md",
    "PRD-formulas-and-spaces.md",
    "PRD-text-adventure-embeddings-demo.md",
    "PRD-tooling-gameplay-analysis.md",
    "PRD-ui-engineering-aesthetic.md",
    "GRD-escape-the-dungeon.md",
    "KAPLAY-INTERFACE-SPEC.md",
    "UI-COMPONENT-REGISTRY.md",
    "PANEL-ARCHITECTURE.md",
    "CONTENT-PACK-VERSIONING.md",
    "GAME-VALUE-CONCEPT.md",
    "implementation-roadmap.md",
    "escape-the-dungeon-teen-guide.md",
    "TODO-dungeonbreak-3d.md",
    "TODO-realtime-content-visualizer.md",
    "parity/browser-parity-matrix.md",
  ];

  const docs: Array<{ path: string; content: string }> = [];
  for (const rel of mdFiles) {
    const full = path.join(PLANNING_DIR, rel);
    const content = await readIfExists(full);
    if (content == null) continue;
    docs.push({ path: rel, content });
  }

  const xml = [
    "<planning-references>",
    ...docs.flatMap((doc) => [
      "  <doc>",
      `    <path>${doc.path}</path>`,
      "    <content><![CDATA[",
      escapeCdata(doc.content),
      "]]></content>",
      "  </doc>",
    ]),
    "</planning-references>",
    "",
  ].join("\n");

  const outPath = path.join(PLANNING_DIR, "REFERENCES.xml");
  await writeXml(outPath, xml);

  for (const rel of mdFiles) {
    const full = path.join(PLANNING_DIR, rel);
    try {
      await fs.rm(full);
    } catch {
      // ignore
    }
  }
};
