import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REPORTS_DIR = path.resolve(process.cwd(), "..", ".planning", "test-reports");
const BUNDLE_PATH = path.resolve(process.cwd(), "public", "game", "content-pack.bundle.v1.json");

type PackBinding = {
  source: string;
  packId: string;
  packVersion: string;
  packHash: string;
  schemaVersion: string;
  engineVersion: string;
};

function readCurrentPackBinding(): PackBinding | null {
  if (!existsSync(BUNDLE_PATH)) return null;
  try {
    const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf8")) as {
      patchName?: string;
      generatedAt?: string;
      hashes?: { overall?: string };
      schemaVersion?: string;
      enginePackage?: { version?: string };
    };
    return {
      source: "bundle:/game/content-pack.bundle.v1.json",
      packId: String(bundle.patchName ?? "content-pack.bundle.v1"),
      packVersion: String(bundle.generatedAt ?? "unknown"),
      packHash: String(bundle.hashes?.overall ?? "unknown"),
      schemaVersion: String(bundle.schemaVersion ?? "content-pack.bundle.v1"),
      engineVersion: String(bundle.enginePackage?.version ?? "unknown"),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const reportPath = path.join(REPORTS_DIR, "agent-play-report.json");
    const analysisPath = path.join(REPORTS_DIR, "agent-play-report.analysis.json");

    if (!existsSync(reportPath) || !existsSync(analysisPath)) {
      return NextResponse.json({
        ok: false,
        error: "Reports not found",
        hint: "Run: pnpm --dir packages/engine-mcp run agent:play && pnpm --dir packages/engine-mcp run analyze",
      }, { status: 404 });
    }

    const report = JSON.parse(readFileSync(reportPath, "utf8")) as Record<string, unknown>;
    const analysis = JSON.parse(readFileSync(analysisPath, "utf8"));
    const currentPackBinding = readCurrentPackBinding();
    const reportPackBinding =
      report.packBinding && typeof report.packBinding === "object" ? report.packBinding : currentPackBinding;
    return NextResponse.json({ ok: true, report: { ...report, packBinding: reportPackBinding }, analysis, currentPackBinding });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
