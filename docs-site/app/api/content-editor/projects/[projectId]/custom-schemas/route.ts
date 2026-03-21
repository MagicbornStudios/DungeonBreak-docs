import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import {
  createCustomSchema,
  projectDetail,
} from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const payload = await getPayload({ config: configPromise });
    const body = (await request.json()) as {
      schemaId?: string;
      name?: string;
      targetPackId?: string;
      schemaType?: string;
      document?: unknown;
    };
    await createCustomSchema(payload, projectId, {
      schemaId: String(body.schemaId ?? ""),
      name: String(body.name ?? ""),
      targetPackId: body.targetPackId,
      schemaType: body.schemaType,
      document: body.document ?? {},
    });
    const detail = await projectDetail(payload, projectId);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
