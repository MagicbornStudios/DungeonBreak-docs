import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const PLANNING_DIR = path.join(ROOT, ".planning");
const PHASES_DIR = path.join(PLANNING_DIR, "phases");

function escapeCdata(text) {
  return text.replaceAll("]]>", "]]]]><![CDATA[>");
}

async function writeXml(filePath, content) {
  await fs.writeFile(filePath, content, "utf8");
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function extractDocFromReferences(refXml, docPath) {
  const pattern = new RegExp(
    `<doc>\\s*<path>${docPath.replaceAll(".", "\\.")}<\\/path>\\s*<content><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/content>\\s*<\\/doc>`,
    "m",
  );
  const match = refXml.match(pattern);
  return match ? match[1] : null;
}

function parseProgressTable(markdown) {
  const lines = markdown.split("\n").map((line) => line.replace(/\r$/, ""));
  const progressStart = lines.findIndex((line) => line.trim() === "## Progress");
  if (progressStart === -1) return new Map();
  const map = new Map();
  for (let i = progressStart + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (!line.startsWith("|")) break;
    if (line.includes("---")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;
    const phaseCell = cells[0];
    const statusCell = cells[2];
    const idMatch = phaseCell.match(/^(\d+)\./);
    if (!idMatch) continue;
    const id = idMatch[1].padStart(2, "0");
    map.set(id, statusCell);
  }
  return map;
}

function parseRoadmapPhases(markdown) {
  const lines = markdown.split("\n").map((line) => line.replace(/\r$/, ""));
  const phases = [];
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^### Phase\s+(\d+)\s*:?\s*(.+)$/);
    if (heading) {
      if (current) phases.push(current);
      current = {
        id: heading[1].padStart(2, "0"),
        title: heading[2].trim(),
        goal: "",
        requirements: "",
        depends: "",
        plans: "",
      };
      continue;
    }
    if (!current) continue;
    const goal = line.match(/^\*\*Goal:\*\*\s*(.*)$/);
    if (goal) {
      current.goal = goal[1].trim();
      continue;
    }
    const req = line.match(/^\*\*Requirements:\*\*\s*(.*)$/);
    if (req) {
      current.requirements = req[1].trim();
      continue;
    }
    const dep = line.match(/^\*\*Depends on:\*\*\s*(.*)$/);
    if (dep) {
      current.depends = dep[1].trim();
      continue;
    }
    const plans = line.match(/^\*\*Plans:\*\*\s*(.*)$/);
    if (plans) {
      current.plans = plans[1].trim();
      continue;
    }
  }
  if (current) phases.push(current);
  return phases;
}

async function migratePlanningMarkdown() {
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

  const docs = [];
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
      // ignore missing files
    }
  }
}

async function migratePhaseMarkdown() {
  const entries = await fs.readdir(PHASES_DIR, { withFileTypes: true });
  const generatedAt = new Date().toISOString().slice(0, 10);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const phaseDir = path.join(PHASES_DIR, entry.name);
    const files = await fs.readdir(phaseDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const mdPath = path.join(phaseDir, file);
      const xmlPath = path.join(phaseDir, file.replace(/\.md$/i, ".xml"));
      const exists = await readIfExists(xmlPath);
      if (exists) continue;
      const content = await fs.readFile(mdPath, "utf8");
      const phaseIdMatch = file.match(/^(\d+)-/);
      const phaseId = phaseIdMatch ? phaseIdMatch[1] : "unknown";
      const docType = file.replace(/^\d+-/, "").replace(/\.md$/i, "");
      const xml = [
        "<phase-doc>",
        "  <metadata>",
        `    <phase id=\"${phaseId}\" />`,
        `    <doc-type>${docType}</doc-type>`,
        `    <source>${path.relative(ROOT, mdPath).replaceAll("\\\\", "/")}</source>`,
        `    <generated-at>${generatedAt}</generated-at>`,
        "  </metadata>",
        "  <legacy>",
        "    <content><![CDATA[",
        escapeCdata(content),
        "]]></content>",
        "  </legacy>",
        "</phase-doc>",
        "",
      ].join("\n");
      await writeXml(xmlPath, xml);
      await fs.rm(mdPath);
    }
  }
}

async function migrateRoadmapFromReferences() {
  const refPath = path.join(PLANNING_DIR, "REFERENCES.xml");
  const refXml = await readIfExists(refPath);
  if (!refXml) throw new Error("REFERENCES.xml not found. Run migrate-planning first.");
  const roadmapMd = extractDocFromReferences(refXml, "ROADMAP.md");
  if (!roadmapMd) throw new Error("ROADMAP.md not found inside REFERENCES.xml");
  const phases = parseRoadmapPhases(roadmapMd);
  const progress = parseProgressTable(roadmapMd);
  const lines = ["<roadmap>"];
  for (const phase of phases) {
    lines.push(`  <phase id="${phase.id}">`);
    lines.push(`    <title>${phase.title}</title>`);
    if (phase.goal) lines.push(`    <goal>${phase.goal}</goal>`);
    if (phase.requirements) lines.push(`    <requirements>${phase.requirements}</requirements>`);
    if (phase.depends) lines.push(`    <depends>${phase.depends}</depends>`);
    if (phase.plans) lines.push(`    <plans>${phase.plans}</plans>`);
    const status = progress.get(phase.id);
    if (status) lines.push(`    <status>${status}</status>`);
    lines.push("  </phase>");
  }
  lines.push("  <doc-flow>");
  lines.push(`    <doc name="templates/PLAN-TEMPLATE.xml">PlanDocument structure</doc>`);
  lines.push(`    <doc name="templates/SUMMARY-TEMPLATE.xml">SummaryDocument structure</doc>`);
  lines.push(`    <doc name="templates/TASK-REGISTRY-TEMPLATE.xml">Tasks list template</doc>`);
  lines.push(`    <doc name="templates/DECISIONS-TEMPLATE.xml">Decision record template</doc>`);
  lines.push(`    <doc name="templates/LOOP-DOC-TEMPLATE.xml">Loop record template</doc>`);
  lines.push("  </doc-flow>");
  lines.push("</roadmap>");
  lines.push("");
  await writeXml(path.join(PLANNING_DIR, "ROADMAP.xml"), lines.join("\n"));
}

function extractSingleTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
}

function parseAgentsFromState(xml) {
  const agents = [];
  const agentRegex = /<agent id="([^"]+)">([\s\S]*?)<\/agent>/g;
  let match = null;
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
}

function parseTasks(xml) {
  const tasks = [];
  const taskRegex = /<task id="([^"]+)" agent-id="([^"]+)" status="([^"]+)">([\s\S]*?)<\/task>/g;
  let match = null;
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
}

function computeProgress(tasks) {
  const byPhase = new Map();
  const byAgent = new Map();
  for (const task of tasks) {
    const phase = task.phase || "unknown";
    const agent = task.agentId || "unassigned";
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    if (!byAgent.has(agent)) byAgent.set(agent, []);
    byPhase.get(phase).push(task);
    byAgent.get(agent).push(task);
  }
  return { byPhase, byAgent };
}

async function snapshot() {
  const stateXml = await readIfExists(path.join(PLANNING_DIR, "STATE.xml"));
  const taskXml = await readIfExists(path.join(PLANNING_DIR, "TASK-REGISTRY.xml"));
  if (!stateXml || !taskXml) {
    console.log("STATE.xml or TASK-REGISTRY.xml not found.");
    return;
  }
  const currentPhase = extractSingleTag(stateXml, "current-phase");
  const currentPlan = extractSingleTag(stateXml, "current-plan");
  const status = extractSingleTag(stateXml, "status");
  const agents = parseAgentsFromState(stateXml);
  const allTasks = parseTasks(taskXml);
  const openTasks = allTasks.filter((task) => task.status !== "done");
  const progress = computeProgress(allTasks);

  console.log("STATE");
  console.log(`current-phase: ${currentPhase}`);
  console.log(`current-plan: ${currentPlan}`);
  console.log(`status: ${status}`);
  console.log("agents:");
  for (const agent of agents) {
    const tasksForAgent = progress.byAgent.get(agent.id) ?? [];
    const done = tasksForAgent.filter((t) => t.status === "done").length;
    const total = tasksForAgent.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    console.log(`- ${agent.id} (${agent.phase}/${agent.plan}) ${agent.status} ${done}/${total} (${pct}%)`);
  }
  console.log("");
  console.log("OPEN TASKS");
  for (const task of openTasks) {
    console.log(`- ${task.id} [${task.status}] ${task.goal} (agent: ${task.agentId})`);
  }
  console.log("");
  console.log("PHASE PROGRESS");
  for (const [phase, phaseTasks] of progress.byPhase.entries()) {
    const done = phaseTasks.filter((t) => t.status === "done").length;
    const total = phaseTasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    console.log(`- ${phase}: ${done}/${total} (${pct}%)`);
  }
}

function generateAgentId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const seed = Math.random().toString(36).slice(2, 6);
  console.log(`agent-${y}${m}${d}-${seed}`);
}

function updateTaskStatus(xml, taskId, status, agentId) {
  const taskRegex = new RegExp(
    `<task id="${taskId}" agent-id="([^"]+)" status="([^"]+)">`,
  );
  if (!taskRegex.test(xml)) return null;
  return xml.replace(taskRegex, (match, currentAgent, currentStatus) => {
    const nextAgent = agentId ?? currentAgent;
    const nextStatus = status ?? currentStatus;
    return `<task id="${taskId}" agent-id="${nextAgent}" status="${nextStatus}">`;
  });
}

function updatePhaseStatus(xml, phaseId, status) {
  const phaseRegex = new RegExp(`<phase id="${phaseId}">([\\s\\S]*?)<\\/phase>`);
  const match = xml.match(phaseRegex);
  if (!match) return null;
  let block = match[1];
  if (block.includes("<status>")) {
    block = block.replace(/<status>[^<]*<\/status>/, `<status>${status}</status>`);
  } else {
    block = `${block.trim()}\n    <status>${status}</status>\n  `;
  }
  return xml.replace(phaseRegex, `<phase id="${phaseId}">${block}</phase>`);
}

function deactivateAgent(xml, agentId) {
  const agentRegex = new RegExp(`<agent id="${agentId}">([\\s\\S]*?)<\\/agent>`);
  const match = xml.match(agentRegex);
  if (!match) return null;
  let block = match[1];
  block = block.replace(/<status>[^<]*<\/status>/, "<status>inactive</status>");
  block = block.replace(/<phase>[^<]*<\/phase>/, "<phase>none</phase>");
  block = block.replace(/<plan>[^<]*<\/plan>/, "<plan>none</plan>");
  return xml.replace(agentRegex, `<agent id="${agentId}">${block}</agent>`);
}

function insertTask(xml, phaseId, taskXml) {
  const phaseRegex = new RegExp(`<phase id="${phaseId}">([\\s\\S]*?)<\\/phase>`);
  const match = xml.match(phaseRegex);
  if (!match) return null;
  let block = match[1];
  const insertPoint = block.lastIndexOf("</phase>");
  if (insertPoint !== -1) return null;
  block = block.replace(/\s*<\/phase>$/, "");
  const insertion = `\n    ${taskXml.replace(/\n/g, "\n    ")}\n  `;
  return xml.replace(phaseRegex, `<phase id="${phaseId}">${block}${insertion}</phase>`);
}

function createTaskBlock({ taskId, agentId, status, goal, keywords, command }) {
  const lines = [
    `<task id="${taskId}" agent-id="${agentId}" status="${status}">`,
    `  <goal>${goal}</goal>`,
    `  <keywords>${keywords}</keywords>`,
    "  <commands>",
    `    <command>${command}</command>`,
    "  </commands>",
    "</task>",
  ];
  return lines.join("\n");
}

function createPhasePlanFromTemplate(template, { phaseId, phaseName, date }) {
  return template
    .replace("<phase-id>##</phase-id>", `<phase-id>${phaseId}</phase-id>`)
    .replace("<phase-name>##</phase-name>", `<phase-name>${phaseName}</phase-name>`)
    .replace("<date>YYYY-MM-DD</date>", `<date>${date}</date>`);
}

async function main() {
  const cmd = process.argv[2] ?? "help";
  if (cmd === "migrate-planning") {
    await migratePlanningMarkdown();
    return;
  }
  if (cmd === "migrate-phases") {
    await migratePhaseMarkdown();
    return;
  }
  if (cmd === "migrate-roadmap") {
    await migrateRoadmapFromReferences();
    return;
  }
  if (cmd === "migrate-all") {
    await migratePlanningMarkdown();
    await migrateRoadmapFromReferences();
    await migratePhaseMarkdown();
    return;
  }
  if (cmd === "snapshot") {
    await snapshot();
    return;
  }
  if (cmd === "new-agent-id") {
    await snapshot();
    generateAgentId();
    return;
  }
  if (cmd === "task-update") {
    const taskId = process.argv[3];
    const status = process.argv[4];
    const agentId = process.argv[5];
    if (!taskId || !status) {
      console.log("Usage: node scripts/loop-cli.mjs task-update <taskId> <status> [agentId]");
      return;
    }
    const taskPath = path.join(PLANNING_DIR, "TASK-REGISTRY.xml");
    const xml = await readIfExists(taskPath);
    if (!xml) {
      console.log("TASK-REGISTRY.xml not found.");
      return;
    }
    const updated = updateTaskStatus(xml, taskId, status, agentId);
    if (!updated) {
      console.log(`Task ${taskId} not found.`);
      return;
    }
    await writeXml(taskPath, updated);
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
        "Usage: node scripts/loop-cli.mjs task-create <phaseId> <taskId> <agentId> [status] \"<goal>\" [keywords] [command]",
      );
      return;
    }
    const taskPath = path.join(PLANNING_DIR, "TASK-REGISTRY.xml");
    const xml = await readIfExists(taskPath);
    if (!xml) {
      console.log("TASK-REGISTRY.xml not found.");
      return;
    }
    const taskBlock = createTaskBlock({ taskId, agentId, status, goal, keywords, command });
    const updated = insertTask(xml, phaseId, taskBlock);
    if (!updated) {
      console.log(`Phase ${phaseId} not found.`);
      return;
    }
    await writeXml(taskPath, updated);
    return;
  }
  if (cmd === "phase-update") {
    const phaseId = process.argv[3];
    const status = process.argv[4];
    if (!phaseId || !status) {
      console.log("Usage: node scripts/loop-cli.mjs phase-update <phaseId> <status>");
      return;
    }
    const roadmapPath = path.join(PLANNING_DIR, "ROADMAP.xml");
    const xml = await readIfExists(roadmapPath);
    if (!xml) {
      console.log("ROADMAP.xml not found.");
      return;
    }
    const updated = updatePhaseStatus(xml, phaseId, status);
    if (!updated) {
      console.log(`Phase ${phaseId} not found.`);
      return;
    }
    await writeXml(roadmapPath, updated);
    return;
  }
  if (cmd === "agent-close") {
    const agentId = process.argv[3];
    if (!agentId) {
      console.log("Usage: node scripts/loop-cli.mjs agent-close <agentId>");
      return;
    }
    const statePath = path.join(PLANNING_DIR, "STATE.xml");
    const xml = await readIfExists(statePath);
    if (!xml) {
      console.log("STATE.xml not found.");
      return;
    }
    const updated = deactivateAgent(xml, agentId);
    if (!updated) {
      console.log(`Agent ${agentId} not found.`);
      return;
    }
    await writeXml(statePath, updated);
    return;
  }
  if (cmd === "plan-create") {
    const phaseId = process.argv[3];
    const phaseName = process.argv[4];
    const planId = process.argv[5];
    const phaseDir = process.argv[6];
    if (!phaseId || !phaseName || !planId || !phaseDir) {
      console.log(
        "Usage: node scripts/loop-cli.mjs plan-create <phaseId> <phaseName> <planId> <phaseDir>",
      );
      return;
    }
    const templatePath = path.join(PLANNING_DIR, "templates", "PLAN-TEMPLATE.xml");
    const template = await readIfExists(templatePath);
    if (!template) {
      console.log("PLAN-TEMPLATE.xml not found.");
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    const planXml = createPhasePlanFromTemplate(template, { phaseId: planId, phaseName, date });
    const outPath = path.join(PHASES_DIR, phaseDir, `${planId}-PLAN.xml`);
    await writeXml(outPath, planXml);
    return;
  }
  console.log(
    "Usage: node scripts/loop-cli.mjs migrate-planning | migrate-roadmap | migrate-phases | migrate-all | snapshot | new-agent-id | task-update | task-create | phase-update | agent-close | plan-create",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
