import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { buildContentPackReport, type ContentPackBundle, type ContentPackReport } from "@/lib/content-pack-report";

export const runtime = "nodejs";

const REPORTS_DIR = path.resolve(process.cwd(), "test-reports", "content-pack-reports");
const INDEX_PATH = path.join(REPORTS_DIR, "index.json");

type ContentPackReportIndexEntry = {
  reportId: string;
  sourceName: string;
  generatedAt: string;
  featureCount: number;
  modelCount: number;
  unresolvedRefCount: number;
  fileName: string;
};

type PostBody = {
  bundle: ContentPackBundle;
  sourceName?: string;
  persist?: boolean;
};

function ensureReportsDir() {
  mkdirSync(REPORTS_DIR, { recursive: true });
}

function readIndex(): ContentPackReportIndexEntry[] {
  if (!existsSync(INDEX_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as { entries?: ContentPackReportIndexEntry[] };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: ContentPackReportIndexEntry[]) {
  writeFileSync(
    INDEX_PATH,
    `${JSON.stringify(
      {
        schemaVersion: "content-pack.report-index.v1",
        generatedAt: new Date().toISOString(),
        entries,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const reportId = url.searchParams.get("reportId")?.trim() ?? "";
    if (!reportId) {
      return NextResponse.json({ ok: true, entries: readIndex() });
    }
    const entries = readIndex();
    const found = entries.find((entry) => entry.reportId === reportId);
    if (!found) {
      return NextResponse.json({ ok: false, error: `Report '${reportId}' not found.` }, { status: 404 });
    }
    const reportPath = path.join(REPORTS_DIR, found.fileName);
    if (!existsSync(reportPath)) {
      return NextResponse.json({ ok: false, error: `Report file missing for '${reportId}'.` }, { status: 404 });
    }
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as ContentPackReport;
    return NextResponse.json({ ok: true, report, entry: found });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    if (!body?.bundle || typeof body.bundle !== "object") {
      return NextResponse.json({ ok: false, error: "Missing bundle in request body." }, { status: 400 });
    }

    const report = buildContentPackReport(body.bundle, {
      sourceName: body.sourceName,
    });
    const persist = body.persist !== false;
    if (!persist) {
      return NextResponse.json({ ok: true, report, persisted: false });
    }

    ensureReportsDir();
    const fileName = `${report.reportId}.json`;
    const reportPath = path.join(REPORTS_DIR, fileName);
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    const entry: ContentPackReportIndexEntry = {
      reportId: report.reportId,
      sourceName: report.sourceName,
      generatedAt: report.generatedAt,
      featureCount: report.summary.spaceVectors.featureCount,
      modelCount: report.summary.spaceVectors.modelCount,
      unresolvedRefCount: report.summary.spaceVectors.unresolvedFeatureRefs.length,
      fileName,
    };
    const rest = readIndex().filter((row) => row.reportId !== report.reportId);
    const entries = [entry, ...rest].slice(0, 100);
    writeIndex(entries);

    return NextResponse.json({ ok: true, report, entry, persisted: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
