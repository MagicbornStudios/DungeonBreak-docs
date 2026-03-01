import { NextResponse } from "next/server";
import { analyzeReport } from "@/lib/playthrough-analyzer";

export async function POST(request: Request) {
  try {
    const report = (await request.json()) as Parameters<typeof analyzeReport>[0];
    const analysis = analyzeReport(report);
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }
}
