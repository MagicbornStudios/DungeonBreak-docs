import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ROOT = path.resolve(process.cwd(), "..");
const CLI_PATH = path.join(ROOT, "vendor", "repo-planner", "scripts", "loop-cli.mjs");

const BLOCKED_PREFIXES = ["task-update", "task-create", "phase-update", "agent-close", "plan-create", "migrate", "iterate"];
const ALLOWED_FIRST = new Set([
  "snapshot", "new-agent-id", "state", "agents", "tasks", "questions", "plans", "kpis", "metrics", "metrics-history",
  "simulate", "review", "report", "context", "workflow",
]);

function parseCommand(input: string): string[] {
  const trimmed = input.trim().replace(/^planning\s+/i, "");
  if (!trimmed) return [];
  return trimmed.split(/\s+/).filter(Boolean);
}

function isAllowed(tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const first = tokens[0];
  if (BLOCKED_PREFIXES.includes(first)) return false;
  if (!ALLOWED_FIRST.has(first)) return false;
  const full = tokens.join(" ");
  for (const block of BLOCKED_PREFIXES) {
    if (full.includes(block)) return false;
  }
  if (first === "report" && tokens[1] !== "generate") return false;
  if (first === "simulate" && tokens[1] !== "loop") return false;
  if (first === "context" && !["quick", "sprint", "tokens", "full"].includes(tokens[1])) return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const raw = typeof body.command === "string" ? body.command : "";
    const tokens = parseCommand(raw);
    if (tokens.length === 0) {
      return NextResponse.json({ ok: false, error: "Missing command", stdout: "", stderr: "" }, { status: 400 });
    }
    if (!isAllowed(tokens)) {
      return NextResponse.json(
        { ok: false, error: "Command not allowed (planning CLI subset only)", stdout: "", stderr: "" },
        { status: 400 },
      );
    }

    const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
      const proc = spawn(process.execPath, [CLI_PATH, ...tokens], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (chunk) => {
        stdout += chunk;
      });
      proc.stderr?.on("data", (chunk) => {
        stderr += chunk;
      });
      proc.on("close", (code) => {
        resolve({ stdout, stderr, code });
      });
      proc.on("error", (err) => {
        resolve({ stdout: "", stderr: err.message, code: 1 });
      });
    });

    return NextResponse.json({
      ok: result.code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message, stdout: "", stderr: "" }, { status: 500 });
  }
}
