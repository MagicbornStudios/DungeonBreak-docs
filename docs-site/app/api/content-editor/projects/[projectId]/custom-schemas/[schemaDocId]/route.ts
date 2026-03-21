import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import {
  projectDetail,
  updateCustomSchema,
} from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; schemaDocId: string }> },
) {
  try {
    const { projectId, schemaDocId } = await context.params;
    const payload = await getPayload({ config: configPromise });
    const body = (await request.json()) as {
      name?: string;
      targetPackId?: string;
      schemaType?: string;
      status?: string;
      document?: unknown;
    };
    await updateCustomSchema(payload, schemaDocId, body);
    const detail = await projectDetail(payload, projectId);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
