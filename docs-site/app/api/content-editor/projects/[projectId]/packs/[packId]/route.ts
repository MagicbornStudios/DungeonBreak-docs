import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import {
  projectDetail,
  updatePackDocument,
} from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; packId: string }> },
) {
  try {
    const { projectId, packId } = await context.params;
    const payload = await getPayload({ config: configPromise });
    const body = (await request.json()) as {
      document?: unknown;
      status?: string;
    };
    const document = body.document;
    if (typeof document === "undefined") {
      throw new Error("Pack document payload is required.");
    }
    await updatePackDocument(payload, projectId, packId, {
      document,
      status: body.status,
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
