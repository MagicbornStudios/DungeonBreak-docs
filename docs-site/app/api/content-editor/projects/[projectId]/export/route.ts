import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import { exportProjectFiles, projectDetail } from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const payload = await getPayload({ config: configPromise });
    const result = await exportProjectFiles(payload, projectId);
    const detail = await projectDetail(payload, projectId);
    return NextResponse.json({
      ok: true,
      exportRoot: result.rootDir,
      files: result.files,
      ...detail,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
