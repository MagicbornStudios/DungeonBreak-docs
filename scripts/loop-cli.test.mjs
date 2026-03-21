/**
 * Tests for the planning CLI (loop-cli.mjs).
 * Run from repo root: node scripts/loop-cli.test.mjs
 * Or: pnpm exec node --test scripts/loop-cli.test.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CLI = path.join(__dirname, "loop-cli.mjs");
const VENDOR_CLI = path.join(ROOT, "vendor", "repo-planner", "scripts", "loop-cli.mjs");

function runCli(args, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [CLI, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => { stdout += d; });
    proc.stderr.on("data", (d) => { stderr += d; });
    proc.on("close", (code) => resolve({ code, stdout, stderr }));
    proc.on("error", reject);
  });
}

function runVendorCli(args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [VENDOR_CLI, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d;
    });
    proc.stderr.on("data", (d) => {
      stderr += d;
    });
    proc.on("close", (code) => resolve({ code, stdout, stderr }));
    proc.on("error", reject);
  });
}

test("planning --help exits 0 and lists context command", async () => {
  const { code, stdout } = await runCli(["--help"]);
  assert.strictEqual(code, 0);
  assert.match(stdout, /context/);
  assert.match(stdout, /quick|status/);
});

test("planning context --help shows quick, sprint, full, tokens", async () => {
  const { code, stdout } = await runCli(["context", "--help"]);
  assert.strictEqual(code, 0);
  assert.match(stdout, /quick/);
  assert.match(stdout, /sprint/);
  assert.match(stdout, /full/);
  assert.match(stdout, /tokens/);
});

test("planning agents --json returns valid JSON array", async () => {
  const { code, stdout } = await runCli(["agents", "--json"]);
  assert.strictEqual(code, 0);
  const data = JSON.parse(stdout);
  assert(Array.isArray(data));
  if (data.length > 0) {
    assert(data[0].id);
    assert(typeof data[0].status === "string");
  }
});

test("planning state --json returns currentPhase and agents", async () => {
  const { code, stdout } = await runCli(["state", "--json"]);
  assert.strictEqual(code, 0);
  const data = JSON.parse(stdout);
  assert("currentPhase" in data);
  assert("agents" in data);
  assert(Array.isArray(data.agents));
});

test("planning quick --json returns state, agents, openTasks, phaseProgress", async () => {
  const { code, stdout } = await runCli(["quick", "--json"]);
  assert.strictEqual(code, 0);
  const data = JSON.parse(stdout);
  assert("currentPhase" in data);
  assert("agents" in data);
  assert("openTasks" in data);
  assert("phaseProgress" in data);
  assert(Array.isArray(data.openTasks));
});

test("planning context quick prints STATE and AGENTS sections", async () => {
  const { code, stdout } = await runCli(["context", "quick"]);
  assert.strictEqual(code, 0);
  assert.match(stdout, /STATE/);
  assert.match(stdout, /AGENTS|OPEN TASKS/);
});

test("planning context tokens --prd --json returns prd with docs", async () => {
  const { code, stdout } = await runCli(["context", "tokens", "--prd", "--json"]);
  assert.strictEqual(code, 0);
  const data = JSON.parse(stdout);
  assert(data.prd);
  assert(typeof data.prd.totalTokens === "number");
  assert(Array.isArray(data.prd.docs));
});

test("planning context tokens --json returns at least one of prd or sprint", async () => {
  const { code, stdout } = await runCli(["context", "tokens", "--json"]);
  assert.strictEqual(code, 0);
  const data = JSON.parse(stdout);
  assert(data.prd != null || data.sprint != null);
});

test("planning sprint show prints sprint boundaries", async () => {
  const { code, stdout } = await runCli(["sprint", "show"]);
  assert.strictEqual(code, 0);
  assert.match(stdout, /Sprint \d+:/);
});

test("planning tasks list --json returns array of tasks", async () => {
  const { code, stdout } = await runCli(["tasks", "list", "--json"]);
  assert.strictEqual(code, 0);
  const data = JSON.parse(stdout);
  assert(Array.isArray(data));
  if (data.length > 0) {
    assert(data[0].id);
    assert(data[0].goal !== undefined);
    assert(data[0].phase !== undefined);
  }
});

test("planning snapshot exits 0 and mentions phase", async () => {
  const { code, stdout } = await runCli(["snapshot"]);
  assert.strictEqual(code, 0);
  assert.match(stdout, /current-phase|STATE/);
});

test("planning questions exits 0 and returns array (JSON)", async () => {
  const { code, stdout } = await runCli(["questions", "--json"]);
  assert.strictEqual(code, 0);
  const data = JSON.parse(stdout);
  assert(Array.isArray(data));
});

test("planning simulate loop --json returns standard bundle shape (format, snapshot, context, openTasks, openQuestions)", async () => {
  const { code, stdout } = await runCli(["simulate", "loop", "--json"]);
  assert.strictEqual(code, 0);
  const data = JSON.parse(stdout);
  assert.strictEqual(data.format, "planning-agent-context/1.0");
  assert.strictEqual(data.role, "agent-loop-bundle");
  assert(typeof data.generatedAt === "string");
  assert(data.snapshot === null || typeof data.snapshot === "object");
  assert(data.context && Array.isArray(data.context.paths));
  assert(Array.isArray(data.openTasks));
  assert(Array.isArray(data.openQuestions));
});

test("planning report generate produces .planning/reports/latest.md with expected sections", async () => {
  const { code } = await runCli(["report", "generate"]);
  assert.strictEqual(code, 0);
  const reportPath = path.join(ROOT, ".planning", "reports", "latest.md");
  const content = await fs.readFile(reportPath, "utf8");
  assert.match(content, /AGENT LOOP REPORT/);
  assert.match(content, /WHAT THE AGENT SEES|1\. SNAPSHOT/);
  assert.match(content, /Context|CONTEXT/);
  assert.match(content, /Open tasks|OPEN TASKS/);
  assert.match(content, /```mermaid/);
});

test("vendor planning init bootstraps .planning and AGENTS.md in empty git repo", async () => {
  await fs.access(VENDOR_CLI);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "planning-init-"));
  try {
    const gi = spawnSync("git", ["init"], { cwd: tmp, encoding: "utf8" });
    assert.strictEqual(gi.status, 0, gi.stderr ?? "");

    const first = await runVendorCli(["init"], tmp);
    assert.strictEqual(first.code, 0, first.stderr);

    const statePath = path.join(tmp, ".planning", "STATE.xml");
    const regPath = path.join(tmp, ".planning", "TASK-REGISTRY.xml");
    const tplPath = path.join(tmp, ".planning", "templates", "PLAN-TEMPLATE.xml");
    assert(await fs.stat(statePath).then(() => true).catch(() => false));
    assert(await fs.stat(regPath).then(() => true).catch(() => false));
    assert(await fs.stat(tplPath).then(() => true).catch(() => false));
    assert(await fs.stat(path.join(tmp, "AGENTS.md")).then(() => true).catch(() => false));

    const second = await runVendorCli(["init"], tmp);
    assert.strictEqual(second.code, 1);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test("vendor planning init --no-agents-md skips AGENTS.md", async () => {
  await fs.access(VENDOR_CLI);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "planning-init-na-"));
  try {
    const gi = spawnSync("git", ["init"], { cwd: tmp, encoding: "utf8" });
    assert.strictEqual(gi.status, 0, gi.stderr ?? "");
    const { code, stderr } = await runVendorCli(["init", "--no-agents-md"], tmp);
    assert.strictEqual(code, 0, stderr);
    await assert.rejects(() => fs.stat(path.join(tmp, "AGENTS.md")));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
