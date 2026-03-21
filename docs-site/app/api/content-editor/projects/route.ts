import configPromise from "@payload-config";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import { createProject, listProjects, projectDetail } from "@/lib/content-editor/payload-content-authoring";

export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise });
    const projects = await listProjects(payload);
    const detail = await Promise.all(
      projects.map(async (project) => {
        const next = await projectDetail(payload, String(project.id));
        return {
          ...next.project,
          schemaImportCount: next.schemaImports.length,
          packCount: next.packs.length,
        };
      }),
    );
    return NextResponse.json({ ok: true, projects: detail });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getPayload({ config: configPromise });
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      description?: string;
      notes?: string;
    };
    const project = await createProject(payload, {
      name: String(body.name ?? ""),
      slug: body.slug,
      description: body.description,
      notes: body.notes,
    });
    return NextResponse.json({
      ok: true,
      project: {
        id: String(project.id),
        name: String(project.name ?? ""),
        slug: String(project.slug ?? ""),
        description: String(project.description ?? ""),
        status: String(project.status ?? "draft"),
        exportRoot: String(project.exportRoot ?? "content-projects"),
        sourceMode: String(project.sourceMode ?? "payload"),
        notes: String(project.notes ?? ""),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
