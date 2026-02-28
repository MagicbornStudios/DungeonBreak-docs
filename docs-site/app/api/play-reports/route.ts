import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const REPORTS_DIR = path.resolve(process.cwd(), "..", ".planning", "test-reports");

export async function GET() {
  const reportPath = path.join(REPORTS_DIR, "agent-play-report.json");
  const analysisPath = path.join(REPORTS_DIR, "agent-play-report.analysis.json");

  if (!existsSync(reportPath) || !existsSync(analysisPath)) {
    return NextResponse.json({
      ok: false,
      error: "Reports not found",
      hint: "Run: pnpm --dir packages/engine-mcp run agent:play && pnpm --dir packages/engine-mcp run analyze",
    }, { status: 404 });
  }

  try {
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    const analysis = JSON.parse(readFileSync(analysisPath, "utf8"));
    return NextResponse.json({ ok: true, report, analysis });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
