#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(argv) {
  const out = {
    bundle: "",
    version: "dev",
    outDir: "release-artifacts",
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--bundle") {
      out.bundle = String(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--version") {
      out.version = String(argv[i + 1] ?? "dev");
      i += 1;
      continue;
    }
    if (arg === "--out-dir") {
      out.outDir = String(argv[i + 1] ?? "release-artifacts");
      i += 1;
      continue;
    }
  }
  return out;
}

function increment(row, key) {
  if (!key) return;
  row[key] = (row[key] ?? 0) + 1;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function toLabel(value) {
  return String(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function toTypeName(value) {
  return String(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function toConstName(value) {
  return String(value)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.toUpperCase())
    .join("_");
}

function toMemberName(value) {
  const cleaned = String(value).replace(/[^a-zA-Z0-9_]/g, "_");
  if (!cleaned) return "value";
  if (/^[0-9]/.test(cleaned)) return `v_${cleaned}`;
  return cleaned;
}

function buildManifest(bundle, version) {
  const packs = bundle.packs ?? {};
  const spaceVectors = packs.spaceVectors ?? {};
  const featureSchema = asArray(spaceVectors.featureSchema);
  const modelSchemas = asArray(spaceVectors.modelSchemas);
  const contentBindings = spaceVectors.contentBindings ?? {};
  const canonicalModelInstances = asArray(contentBindings.canonicalModelInstances);
  const modelById = new Map(modelSchemas.map((row) => [String(row.modelId ?? ""), row]).filter(([id]) => !!id));

  function collectStatClassRefs(modelId) {
    const refs = [];
    const visited = new Set();
    let cursor = modelById.get(modelId);
    while (cursor) {
      const id = String(cursor.modelId ?? "");
      if (!id || visited.has(id)) break;
      visited.add(id);
      if (id.endsWith("stats")) refs.push(id);
      const parent = String(cursor.extendsModelId ?? "");
      cursor = parent ? modelById.get(parent) : null;
    }
    return uniqueSorted(refs);
  }

  const statClasses = modelSchemas
    .filter((row) => String(row.modelId ?? "").endsWith("stats"))
    .map((row) => ({
      statClassId: String(row.modelId ?? ""),
      label: String(row.label ?? toLabel(row.modelId ?? "")),
      description: row.description ? String(row.description) : undefined,
      featureIds: uniqueSorted(asArray(row.featureRefs).map((ref) => String(ref.featureId ?? ""))),
    }));

  const models = modelSchemas
    .filter((row) => !String(row.modelId ?? "").endsWith("stats"))
    .map((row) => {
      const modelId = String(row.modelId ?? "");
      return {
        modelId,
        label: String(row.label ?? toLabel(modelId)),
        description: row.description ? String(row.description) : undefined,
        extendsModelId: row.extendsModelId ? String(row.extendsModelId) : undefined,
        statClassRefs: collectStatClassRefs(modelId),
        featureRefs: asArray(row.featureRefs).map((ref) => ({
          featureId: String(ref.featureId ?? ""),
          spaces: uniqueSorted(asArray(ref.spaces).map((space) => String(space))),
          required: Boolean(ref.required),
          defaultValue: typeof ref.defaultValue === "number" ? ref.defaultValue : undefined,
        })),
      };
    });

  const featuresBySpace = new Map();
  for (const row of featureSchema) {
    const featureId = String(row.featureId ?? "");
    for (const space of asArray(row.spaces)) {
      const key = String(space);
      if (!featuresBySpace.has(key)) featuresBySpace.set(key, new Set());
      if (featureId) featuresBySpace.get(key).add(featureId);
    }
  }
  const modelsBySpace = new Map();
  for (const row of models) {
    for (const ref of row.featureRefs) {
      for (const space of ref.spaces) {
        if (!modelsBySpace.has(space)) modelsBySpace.set(space, new Set());
        modelsBySpace.get(space).add(row.modelId);
      }
    }
  }
  const spaces = uniqueSorted([...featuresBySpace.keys(), ...modelsBySpace.keys()]).map((spaceId) => ({
    spaceId,
    label: toLabel(spaceId),
    featureIds: uniqueSorted([...(featuresBySpace.get(spaceId) ?? new Set())]),
    modelIds: uniqueSorted([...(modelsBySpace.get(spaceId) ?? new Set())]),
  }));

  const canonicalAssets = canonicalModelInstances
    .filter((row) => row && row.canonical !== false)
    .map((row) => ({
      assetId: String(row.id ?? ""),
      name: String(row.name ?? row.id ?? "asset"),
      modelId: String(row.modelId ?? ""),
      canonical: true,
    }))
    .filter((row) => row.assetId && row.modelId);

  return {
    schemaVersion: "content-pack.manifest.v1",
    generatedAt: new Date().toISOString(),
    buildVersion: version,
    packIdentity: {
      packId: String(bundle.patchName ?? "content-pack.bundle.v1"),
      packVersion: String(bundle.generatedAt ?? "unknown"),
      packHash: String(bundle.hashes?.overall ?? "unknown"),
      schemaVersion: String(bundle.schemaVersion ?? "content-pack.bundle.v1"),
      engineVersion: String(bundle.enginePackage?.version ?? "unknown"),
    },
    statClasses,
    models,
    canonicalAssets,
    spaces,
  };
}

function buildSchemaBundle(manifest, version) {
  const modelSchemas = {};
  for (const model of manifest.models) {
    modelSchemas[model.modelId] = {
      type: "object",
      title: model.label,
      description: model.description,
      allOf: model.extendsModelId ? [{ $ref: `#/definitions/models/${model.extendsModelId}` }] : undefined,
      properties: Object.fromEntries(
        model.featureRefs.map((ref) => [
          ref.featureId,
          {
            type: "number",
            default: ref.defaultValue ?? 0,
            "x-spaces": ref.spaces,
            "x-required": ref.required,
          },
        ]),
      ),
      required: model.featureRefs.filter((ref) => ref.required).map((ref) => ref.featureId),
      "x-stat-classes": model.statClassRefs,
    };
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    schemaVersion: "content-pack.schema-bundle.v1",
    generatedAt: new Date().toISOString(),
    buildVersion: version,
    manifestSchemaVersion: manifest.schemaVersion,
    definitions: {
      statClasses: Object.fromEntries(
        manifest.statClasses.map((row) => [
          row.statClassId,
          {
            type: "object",
            title: row.label,
            description: row.description,
            properties: Object.fromEntries(row.featureIds.map((featureId) => [featureId, { type: "number" }])),
          },
        ]),
      ),
      models: modelSchemas,
    },
    "x-spaces": manifest.spaces,
  };
}

function buildLanguageStubs(manifest) {
  const tsLines = [
    "// generated from content-pack.manifest.v1",
    "",
  ];
  const cppLines = [
    "#pragma once",
    "// generated from content-pack.manifest.v1",
    "",
  ];
  const csLines = [
    "// generated from content-pack.manifest.v1",
    "",
  ];

  for (const model of manifest.models) {
    const tsType = `${toTypeName(model.modelId)}Model`;
    const tsParent = model.extendsModelId ? `${toTypeName(model.extendsModelId)}Model` : "";
    tsLines.push(`export interface ${tsType}${tsParent ? ` extends ${tsParent}` : ""} {`);
    for (const ref of model.featureRefs) {
      tsLines.push(`  "${ref.featureId}": number;`);
    }
    tsLines.push("}", "");
    tsLines.push(`export const ${toConstName(model.modelId)}_DEFAULTS: Partial<${tsType}> = {`);
    for (const ref of model.featureRefs) {
      tsLines.push(`  "${ref.featureId}": ${(ref.defaultValue ?? 0).toFixed(3)},`);
    }
    tsLines.push("};", "");

    const cppType = `${toTypeName(model.modelId)}Model`;
    const cppParent = model.extendsModelId ? `${toTypeName(model.extendsModelId)}Model` : "";
    cppLines.push(`struct ${cppType}${cppParent ? ` : ${cppParent}` : ""} {`);
    for (const ref of model.featureRefs) {
      cppLines.push(`  float ${toMemberName(ref.featureId)} = ${(ref.defaultValue ?? 0).toFixed(3)}f;`);
    }
    cppLines.push("};", "");

    const csType = `${toTypeName(model.modelId)}Model`;
    const csParent = model.extendsModelId ? ` : ${toTypeName(model.extendsModelId)}Model` : "";
    csLines.push(`public record class ${csType}${csParent}`);
    csLines.push("{");
    for (const ref of model.featureRefs) {
      csLines.push(`  public float ${toTypeName(ref.featureId)} { get; init; } = ${(ref.defaultValue ?? 0).toFixed(3)}f;`);
    }
    csLines.push("}", "");
  }

  return {
    typescript: `${tsLines.join("\n")}\n`,
    cpp: `${cppLines.join("\n")}\n`,
    csharp: `${csLines.join("\n")}\n`,
  };
}

function buildReport(bundle, version) {
  const packs = bundle.packs ?? {};
  const spaceVectors = packs.spaceVectors ?? {};
  const featureSchema = Array.isArray(spaceVectors.featureSchema) ? spaceVectors.featureSchema : [];
  const modelSchemas = Array.isArray(spaceVectors.modelSchemas) ? spaceVectors.modelSchemas : [];
  const groups = {};
  const spaces = {};
  const modelPrefixes = {};
  const featureIds = new Set(featureSchema.map((row) => String(row.featureId ?? "")).filter(Boolean));
  const unresolvedFeatureRefs = [];

  for (const row of featureSchema) {
    for (const group of row.groups ?? []) increment(groups, String(group));
    for (const space of row.spaces ?? []) increment(spaces, String(space));
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
      for (const space of ref.spaces ?? []) increment(spaces, String(space));
    }
  }

  return {
    schemaVersion: "content-pack.release-report.v1",
    generatedAt: new Date().toISOString(),
    buildVersion: version,
    bundle: {
      schemaVersion: bundle.schemaVersion,
      enginePackage: bundle.enginePackage ?? {},
      hashes: bundle.hashes ?? {},
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
      },
    },
  };
}

const args = parseArgs(process.argv);
if (!args.bundle) {
  console.error("Missing --bundle path");
  process.exit(1);
}

const bundlePath = resolve(process.cwd(), args.bundle);
const outDir = resolve(process.cwd(), args.outDir);
const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
const report = buildReport(bundle, args.version);
const manifest = buildManifest(bundle, args.version);
const schemaBundle = buildSchemaBundle(manifest, args.version);
const stubs = buildLanguageStubs(manifest);

mkdirSync(outDir, { recursive: true });
const bundleOutName = `content-pack.bundle.${args.version}.v1.json`;
const reportOutName = `content-pack-report.${args.version}.json`;
const indexOutName = `content-pack-index.${args.version}.json`;
const manifestOutName = `content-pack.manifest.${args.version}.json`;
const schemaOutName = `content-pack.schema-bundle.${args.version}.json`;
const tsOutName = `content-pack-models.${args.version}.ts`;
const cppOutName = `content-pack-models.${args.version}.hpp`;
const csOutName = `content-pack-models.${args.version}.cs`;
const bundleOutPath = join(outDir, bundleOutName);
const reportOutPath = join(outDir, reportOutName);
const indexOutPath = join(outDir, indexOutName);
const manifestOutPath = join(outDir, manifestOutName);
const schemaOutPath = join(outDir, schemaOutName);
const tsOutPath = join(outDir, tsOutName);
const cppOutPath = join(outDir, cppOutName);
const csOutPath = join(outDir, csOutName);

writeFileSync(bundleOutPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
writeFileSync(reportOutPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(manifestOutPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(schemaOutPath, `${JSON.stringify(schemaBundle, null, 2)}\n`, "utf8");
writeFileSync(tsOutPath, stubs.typescript, "utf8");
writeFileSync(cppOutPath, stubs.cpp, "utf8");
writeFileSync(csOutPath, stubs.csharp, "utf8");
writeFileSync(
  indexOutPath,
  `${JSON.stringify(
    {
      schemaVersion: "content-pack.release-index.v1",
      generatedAt: new Date().toISOString(),
      buildVersion: args.version,
      artifacts: {
        bundle: bundleOutName,
        report: reportOutName,
        manifest: manifestOutName,
        schemaBundle: schemaOutName,
        modelsTs: tsOutName,
        modelsCpp: cppOutName,
        modelsCsharp: csOutName,
      },
      hashes: bundle.hashes ?? {},
      summary: {
        featureCount: report.summary.spaceVectors.featureCount,
        modelCount: report.summary.spaceVectors.modelCount,
      },
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`[content-pack-release] wrote ${bundleOutPath}`);
console.log(`[content-pack-release] wrote ${reportOutPath}`);
console.log(`[content-pack-release] wrote ${manifestOutPath}`);
console.log(`[content-pack-release] wrote ${schemaOutPath}`);
console.log(`[content-pack-release] wrote ${tsOutPath}`);
console.log(`[content-pack-release] wrote ${cppOutPath}`);
console.log(`[content-pack-release] wrote ${csOutPath}`);
console.log(`[content-pack-release] wrote ${indexOutPath}`);
