import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import {
  projectDetail,
  seedSupportedGameSchemas,
} from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { packIds?: string[] };
    const payload = await getPayload({ config: configPromise });
    const result = await seedSupportedGameSchemas(payload, projectId, body.packIds);
    const detail = await projectDetail(payload, projectId);
    return NextResponse.json({
      ok: true,
      seededPackIds: result.seededPackIds,
      ...detail,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
