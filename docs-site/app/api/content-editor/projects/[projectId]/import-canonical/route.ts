import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import { importCanonicalPacks, projectDetail } from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { packIds?: string[] };
    const payload = await getPayload({ config: configPromise });
    const result = await importCanonicalPacks(payload, projectId, body.packIds);
    const detail = await projectDetail(payload, projectId);
    return NextResponse.json({
      ok: true,
      imported: result.imported,
      importedPackIds: result.packs,
      ...detail,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
