import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import { projectDetail, updateProject } from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const payload = await getPayload({ config: configPromise });
    const detail = await projectDetail(payload, projectId);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 404 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await context.params;
    const payload = await getPayload({ config: configPromise });
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      description?: string;
      notes?: string;
      status?: string;
      exportRoot?: string;
    };
    await updateProject(payload, projectId, body);
    const detail = await projectDetail(payload, projectId);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
