import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REPORT_PATH = path.resolve(process.cwd(), "..", ".planning", "reports", "latest.md");

export async function GET() {
  try {
    if (!existsSync(REPORT_PATH)) {
      return NextResponse.json({ error: "Report not found", markdown: "" }, { status: 404 });
    }
    const markdown = readFileSync(REPORT_PATH, "utf8");
    return NextResponse.json({ markdown });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message, markdown: "" }, { status: 500 });
  }
}
