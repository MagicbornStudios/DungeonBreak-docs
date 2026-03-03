import { buildContentPackManifest, type ContentPackBundle, type ContentPackManifest } from "@/lib/content-pack-manifest";
export type { ContentPackBundle };

type FeatureSchemaRow = {
  featureId: string;
  groups?: string[];
  spaces?: string[];
};

type ModelSchemaRow = {
  modelId: string;
  featureRefs?: Array<{ featureId: string; spaces?: string[] }>;
};

export type ContentPackReport = {
  schemaVersion: "content-pack.report.v1";
  generatedAt: string;
  reportId: string;
  sourceName: string;
  manifest: ContentPackManifest;
  bundle: {
    schemaVersion: string;
    generatedAt?: string;
    patchName?: string;
    enginePackage?: { name?: string; version?: string };
    hashes: Record<string, string>;
    spaceVectors?: unknown;
  };
  summary: {
    packKeys: string[];
    spaceVectors: {
      featureCount: number;
      modelCount: number;
      groups: Record<string, number>;
      spaces: Record<string, number>;
      modelPrefixes: Record<string, number>;
      unresolvedFeatureRefs: string[];
      canonicalAssetCount: number;
    };
  };
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asFeatureSchemaRows(value: unknown): FeatureSchemaRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => !!row && typeof row === "object") as FeatureSchemaRow[];
}

function asModelSchemaRows(value: unknown): ModelSchemaRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => !!row && typeof row === "object") as ModelSchemaRow[];
}

function increment(row: Record<string, number>, key: string) {
  if (!key) return;
  row[key] = (row[key] ?? 0) + 1;
}

export function buildContentPackReport(
  bundle: ContentPackBundle,
  options?: { sourceName?: string; reportId?: string; now?: Date },
): ContentPackReport {
  const now = options?.now ?? new Date();
  const sourceName = options?.sourceName?.trim() || bundle.patchName || "content-pack.bundle.v1.json";
  const reportId = options?.reportId?.trim() || `${slugify(sourceName)}-${now.getTime()}`;
  const packs = bundle.packs ?? {};
  const manifest = buildContentPackManifest(bundle, now);
  const spaceVectors = (packs.spaceVectors ?? {}) as {
    featureSchema?: unknown;
    modelSchemas?: unknown;
  };
  const featureSchema = asFeatureSchemaRows(spaceVectors.featureSchema);
  const modelSchemas = asModelSchemaRows(spaceVectors.modelSchemas);

  const groups: Record<string, number> = {};
  const spaces: Record<string, number> = {};
  const modelPrefixes: Record<string, number> = {};
  const featureIds = new Set(featureSchema.map((row) => String(row.featureId ?? "")).filter((row) => row.length > 0));
  const unresolvedFeatureRefs: string[] = [];

  for (const row of featureSchema) {
    for (const group of row.groups ?? []) {
      increment(groups, String(group));
    }
    for (const space of row.spaces ?? []) {
      increment(spaces, String(space));
    }
  }

  for (const row of modelSchemas) {
    const modelId = String(row.modelId ?? "");
    const prefix = modelId.includes(".") ? modelId.split(".")[0] : "other";
    increment(modelPrefixes, prefix);
    for (const ref of row.featureRefs ?? []) {
      const featureId = String(ref.featureId ?? "");
      if (featureId && !featureIds.has(featureId)) {
        unresolvedFeatureRefs.push(`${modelId}:${featureId}`);
      }
      for (const space of ref.spaces ?? []) {
        increment(spaces, String(space));
      }
    }
  }

  return {
    schemaVersion: "content-pack.report.v1",
    generatedAt: now.toISOString(),
    reportId,
    sourceName,
    manifest,
    bundle: {
      schemaVersion: String(bundle.schemaVersion ?? "content-pack.bundle.v1"),
      generatedAt: bundle.generatedAt,
      patchName: bundle.patchName,
      enginePackage: bundle.enginePackage,
      hashes: bundle.hashes ?? {},
      spaceVectors: (bundle.packs ?? {}).spaceVectors,
    },
    summary: {
      packKeys: Object.keys(packs).sort((a, b) => a.localeCompare(b)),
      spaceVectors: {
        featureCount: featureSchema.length,
        modelCount: modelSchemas.length,
        groups,
        spaces,
        modelPrefixes,
        unresolvedFeatureRefs: [...new Set(unresolvedFeatureRefs)].sort((a, b) => a.localeCompare(b)),
        canonicalAssetCount: manifest.canonicalAssets.length,
      },
    },
  };
}
