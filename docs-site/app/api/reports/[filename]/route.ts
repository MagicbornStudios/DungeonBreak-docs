import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const REPORTS_DIR = path.resolve(process.cwd(), "..", ".planning", "test-reports");

const ALLOWED = new Set([
	"agent-play-report.json",
	"agent-play-report.analysis.json",
	"agent-play-report.events.jsonl",
	"agent-play-report.events.jsonl.gz",
	"agent-play-report-jsonl-smoke.json",
	"pytest-report.html",
]);

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ filename: string }> },
) {
	const { filename } = await params;
	if (!filename || !ALLOWED.has(filename)) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const filePath = path.join(REPORTS_DIR, filename);
	if (!existsSync(filePath)) {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	const content = readFileSync(filePath);
	const contentType =
		filename.endsWith(".json") || filename.endsWith(".jsonl")
			? "application/json"
			: filename.endsWith(".html")
				? "text/html"
				: filename.endsWith(".gz")
					? "application/gzip"
					: "application/octet-stream";

	return new NextResponse(content, {
		headers: {
			"Content-Type": contentType,
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
}
