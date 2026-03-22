import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import {
  projectDetail,
  updateProjectData,
} from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; projectDataDocId: string }> },
) {
  try {
    const { projectId, projectDataDocId } = await context.params;
    const payload = await getPayload({ config: configPromise });
    const body = (await request.json()) as {
      name?: string;
      namespace?: string;
      targetId?: string;
      status?: string;
      document?: unknown;
    };
    await updateProjectData(payload, projectDataDocId, body);
    const detail = await projectDetail(payload, projectId);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
