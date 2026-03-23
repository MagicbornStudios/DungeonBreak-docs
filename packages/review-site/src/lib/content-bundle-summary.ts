import fs from "node:fs";
import path from "node:path";
import { docsSiteRoot } from "@/lib/paths";

export interface ContentBundleSummary {
  ok: boolean;
  bundlePath: string;
  schemaVersion?: string;
  generatedAt?: string;
  engineName?: string;
  engineVersion?: string;
  packKeys: string[];
  modelSchemaCount?: number;
  hashKeyCount?: number;
  error?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function loadContentBundleSummary(
  root: string = docsSiteRoot
): ContentBundleSummary {
  const bundlePath = path.join(
    root,
    "public",
    "game",
    "content-pack.bundle.v1.json"
  );
  try {
    if (!fs.existsSync(bundlePath)) {
      return {
        ok: false,
        bundlePath,
        packKeys: [],
        error: "Bundle file not found (run docs-site game/content export).",
      };
    }
    const raw = fs.readFileSync(bundlePath, "utf8");
    const j = JSON.parse(raw) as unknown;
    const rootObj = asRecord(j);
    if (!rootObj) {
      return {
        ok: false,
        bundlePath,
        packKeys: [],
        error: "Bundle JSON is not an object.",
      };
    }
    const packs = asRecord(rootObj.packs);
    const packKeys = packs
      ? Object.keys(packs).sort((a, b) => a.localeCompare(b))
      : [];
    const cs = packs ? asRecord(packs.contentSchema) : null;
    const modelSchemas = cs?.modelSchemas;
    const modelSchemaCount = Array.isArray(modelSchemas)
      ? modelSchemas.length
      : undefined;
    const hashes = asRecord(rootObj.hashes);
    const engine = asRecord(rootObj.enginePackage);
    return {
      ok: true,
      bundlePath,
      schemaVersion:
        typeof rootObj.schemaVersion === "string"
          ? rootObj.schemaVersion
          : undefined,
      generatedAt:
        typeof rootObj.generatedAt === "string"
          ? rootObj.generatedAt
          : undefined,
      engineName: typeof engine?.name === "string" ? engine.name : undefined,
      engineVersion:
        typeof engine?.version === "string" ? engine.version : undefined,
      packKeys,
      modelSchemaCount,
      hashKeyCount: hashes ? Object.keys(hashes).length : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      bundlePath,
      packKeys: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
