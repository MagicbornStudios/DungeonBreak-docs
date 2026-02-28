import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const DATA_DIR = path.resolve(
  process.cwd(),
  "..",
  "packages",
  "engine",
  "src",
  "escape-the-dungeon",
  "contracts",
  "data",
);

function countKeys(obj: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) {
        out[k] = v.length;
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = Object.keys(v as object).length;
      }
    }
  }
  return out;
}

export async function GET() {
  if (!existsSync(DATA_DIR)) {
    return NextResponse.json({
      ok: false,
      error: "Content packs directory not found",
      path: DATA_DIR,
    }, { status: 404 });
  }

  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const packs: Record<string, { keys: Record<string, number>; schema?: string }> = {};

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    try {
      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      const keys = countKeys(data);
      packs[file] = { keys };
    } catch {
      packs[file] = { keys: {} };
    }
  }

  return NextResponse.json({
    ok: true,
    sourceDir: DATA_DIR,
    packs,
  });
}
