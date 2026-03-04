import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const ROOT = path.resolve(process.cwd(), "..");
const PLANNING_DIR = path.join(ROOT, ".planning");

const ApplySchema = z.object({
  edits: z.array(
    z.object({
      path: z.string().min(1).max(500),
      newContent: z.string().max(500_000),
    }),
  ).max(20),
});

function resolvePlanningPath(relativePath: string): string | null {
  const normalized = path.normalize(relativePath).replace(/\\/g, "/");
  if (normalized.startsWith("..") || path.isAbsolute(relativePath)) return null;
  const base = normalized.startsWith(".planning/") ? normalized : `.planning/${normalized}`;
  const absolute = path.join(ROOT, base);
  const relative = path.relative(PLANNING_DIR, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return absolute;
}

export async function POST(request: Request) {
  try {
    const body = ApplySchema.parse(await request.json());
    const applied: string[] = [];
    for (const edit of body.edits) {
      const absolutePath = resolvePlanningPath(edit.path);
      if (!absolutePath) {
        return NextResponse.json({ ok: false, error: `Invalid path: ${edit.path}` }, { status: 400 });
      }
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, edit.newContent, "utf8");
      applied.push(path.relative(ROOT, absolutePath).replace(/\\/g, "/"));
    }
    return NextResponse.json({ ok: true, applied });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
