import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ROOT = path.resolve(process.cwd(), "..");
const CLI_PATH = path.join(ROOT, "vendor", "repo-planner", "scripts", "loop-cli.mjs");

/** Returns full agent-loop bundle (state, tasks, roadmap, open questions, context) by running planning simulate loop --json. */
export async function GET() {
  try {
    const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
      const proc = spawn(process.execPath, [CLI_PATH, "simulate", "loop", "--json"], {
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

    if (result.code !== 0) {
      return NextResponse.json(
        { error: "Planning CLI failed", detail: result.stderr || result.stdout },
        { status: 502 },
      );
    }

    let bundle: unknown;
    try {
      bundle = JSON.parse(result.stdout);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from planning CLI", detail: result.stdout.slice(0, 500) },
        { status: 502 },
      );
    }
    return NextResponse.json(bundle);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
