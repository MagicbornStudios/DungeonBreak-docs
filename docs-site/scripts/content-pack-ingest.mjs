#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const docsRoot = process.cwd();
const inboxDir = resolve(docsRoot, "content-packs", "inbox");
const outDir = resolve(docsRoot, "content-packs", "out");
const bundleOutPath = resolve(docsRoot, "public", "game", "content-pack.bundle.v1.json");
const reportOutPath = resolve(docsRoot, "public", "reports", "content-pack.latest.report.json");
const snapshotOutPath = resolve(outDir, "content-pack.bundle.generated.v1.json");

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const isQuiet = args.has("--quiet");
const isForce = args.has("--force");
const DOLT_CMD = process.env.CONTENT_PACK_DOLT_CMD ?? "dolt";
const DOLT_REPO_PATH =
  process.env.CONTENT_PACK_DOLT_PATH ?? resolve(process.cwd(), "content-packs", "dolt");

function parseJsonValue(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function collectDoltPatches() {
  if (!existsSync(DOLT_REPO_PATH)) {
    return [];
  }
  try {
    const query = "select id, payload from content_pack_patches order by created_at";
    const output = execFileSync(DOLT_CMD, ["sql", "--format", "json", "-q", query], {
      cwd: DOLT_REPO_PATH,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const json = JSON.parse(output);
    if (!Array.isArray(json.rows)) {
      return [];
    }
    return json.rows
      .map((row) => {
        const payload = parseJsonValue(row.payload);
        if (!payload) return null;
        return {
          id: row.id ?? `dolt:${row.created_at ?? "unknown"}`,
          payload,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, stableNormalize(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableNormalize(value));
}

function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function mergeById(baseRows, patchRows, idKey) {
  const out = [];
  const index = new Map();

  for (const row of baseRows) {
    if (!isRecord(row)) continue;
    const id = typeof row[idKey] === "string" ? row[idKey] : null;
    if (!id) continue;
    index.set(id, out.length);
    out.push({ ...row });
  }

  for (const row of patchRows) {
    if (!isRecord(row)) continue;
    const id = typeof row[idKey] === "string" ? row[idKey] : null;
    if (!id) continue;
    const existingIdx = index.get(id);
    if (existingIdx == null) {
      index.set(id, out.length);
      out.push({ ...row });
      continue;
    }
    out[existingIdx] = { ...out[existingIdx], ...row };
  }

  return out;
}

function mergeRecordOfRecords(base, patch) {
  const next = { ...(isRecord(base) ? base : {}) };
  if (!isRecord(patch)) return next;
  for (const [k, value] of Object.entries(patch)) {
    next[k] = { ...(isRecord(next[k]) ? next[k] : {}), ...(isRecord(value) ? value : {}) };
  }
  return next;
}

function normalizeSpaceVectorsPatch(payload) {
  if (!isRecord(payload)) return null;

  if (isRecord(payload.spaceVectorsPatch)) return payload.spaceVectorsPatch;
  if (isRecord(payload.spaceVectors)) return payload.spaceVectors;
  if (isRecord(payload.packs) && isRecord(payload.packs.spaceVectors)) return payload.packs.spaceVectors;
  if (Array.isArray(payload.featureSchema) || Array.isArray(payload.modelSchemas)) return payload;

  return null;
}

function mergeSpaceVectors(baseSpaceVectors, patch) {
  const base = isRecord(baseSpaceVectors) ? baseSpaceVectors : {};
  const next = { ...base };

  const patchFeatureSchema = Array.isArray(patch.featureSchema) ? patch.featureSchema : [];
  const patchModelSchemas = Array.isArray(patch.modelSchemas) ? patch.modelSchemas : [];
  const patchContentFeatures = Array.isArray(patch.contentFeatures)
    ? patch.contentFeatures
    : Array.isArray(patch.thematicBasisTraits)
      ? patch.thematicBasisTraits
      : [];
  const patchPowerFeatures = Array.isArray(patch.powerFeatures) ? patch.powerFeatures : [];

  next.featureSchema = mergeById(Array.isArray(base.featureSchema) ? base.featureSchema : [], patchFeatureSchema, "featureId");
  next.modelSchemas = mergeById(Array.isArray(base.modelSchemas) ? base.modelSchemas : [], patchModelSchemas, "modelId");
  next.contentFeatures = mergeById(
    Array.isArray(base.contentFeatures) ? base.contentFeatures : [],
    patchContentFeatures,
    "basisId",
  );
  next.powerFeatures = mergeById(Array.isArray(base.powerFeatures) ? base.powerFeatures : [], patchPowerFeatures, "basisId");
  next.thematicBasisTraits = next.contentFeatures;

  next.actionSemantics = mergeRecordOfRecords(base.actionSemantics, patch.actionSemantics);
  next.roomSemantics = mergeRecordOfRecords(base.roomSemantics, patch.roomSemantics);

  next.eventSemantics = {
    metric: mergeRecordOfRecords(base.eventSemantics?.metric, patch.eventSemantics?.metric),
    kind: mergeRecordOfRecords(base.eventSemantics?.kind, patch.eventSemantics?.kind),
  };

  next.itemSemantics = {
    tagWeights: mergeRecordOfRecords(base.itemSemantics?.tagWeights, patch.itemSemantics?.tagWeights),
    rarityWeights: mergeRecordOfRecords(base.itemSemantics?.rarityWeights, patch.itemSemantics?.rarityWeights),
  };

  const baseBehaviorDefaults = isRecord(base.behaviorDefaults) ? base.behaviorDefaults : {};
  const patchBehaviorDefaults = isRecord(patch.behaviorDefaults) ? patch.behaviorDefaults : {};
  next.behaviorDefaults = {
    ...baseBehaviorDefaults,
    ...patchBehaviorDefaults,
    actionStyle: {
      ...(isRecord(baseBehaviorDefaults.actionStyle) ? baseBehaviorDefaults.actionStyle : {}),
      ...(isRecord(patchBehaviorDefaults.actionStyle) ? patchBehaviorDefaults.actionStyle : {}),
    },
    eventStyle: {
      ...(isRecord(baseBehaviorDefaults.eventStyle) ? baseBehaviorDefaults.eventStyle : {}),
      ...(isRecord(patchBehaviorDefaults.eventStyle) ? patchBehaviorDefaults.eventStyle : {}),
    },
    roomStyle: {
      ...(isRecord(baseBehaviorDefaults.roomStyle) ? baseBehaviorDefaults.roomStyle : {}),
      ...(isRecord(patchBehaviorDefaults.roomStyle) ? patchBehaviorDefaults.roomStyle : {}),
    },
  };

  next.entityProjection = {
    ...(isRecord(base.entityProjection) ? base.entityProjection : {}),
    ...(isRecord(patch.entityProjection) ? patch.entityProjection : {}),
  };
  next.levelSemantics = {
    ...(isRecord(base.levelSemantics) ? base.levelSemantics : {}),
    ...(isRecord(patch.levelSemantics) ? patch.levelSemantics : {}),
  };

  return next;
}

function listInboxPatchFiles() {
  if (!existsSync(inboxDir)) return [];
  return readdirSync(inboxDir)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => join(inboxDir, name));
}

function buildBundleFromBase(baseBundle, spaceVectors, sourceFiles) {
  const basePacks = isRecord(baseBundle.packs) ? baseBundle.packs : {};
  const packs = {
    ...basePacks,
    spaceVectors,
  };

  const packHashes = Object.fromEntries(Object.entries(packs).map(([k, value]) => [k, sha256Hex(stableJson(value))]));

  const bundle = {
    schemaVersion: "content-pack.bundle.v1",
    generatedAt: new Date().toISOString(),
    source: "local-ingest",
    patchFiles: sourceFiles.map((filePath) => filePath.replaceAll("\\", "/")),
    enginePackage: isRecord(baseBundle.enginePackage) ? baseBundle.enginePackage : {},
    hashes: {
      ...packHashes,
      overall: sha256Hex(
        stableJson({
          schemaVersion: "content-pack.bundle.v1",
          enginePackage: isRecord(baseBundle.enginePackage) ? baseBundle.enginePackage : {},
          hashes: packHashes,
          packs,
        }),
      ),
    },
    packs,
  };

  return bundle;
}

function main() {
  if (!existsSync(bundleOutPath)) {
    throw new Error(`Base bundle not found at ${bundleOutPath}. Build/copy the game bundle first.`);
  }

  const baseBundle = parseJsonFile(bundleOutPath);
  const patchFiles = listInboxPatchFiles();
  const doltPatches = collectDoltPatches();
  const sourcesApplied = [];

  let mergedSpaceVectors = isRecord(baseBundle.packs?.spaceVectors) ? baseBundle.packs.spaceVectors : {};

  for (const filePath of patchFiles) {
    const payload = parseJsonFile(filePath);
    const patch = normalizeSpaceVectorsPatch(payload);
    if (!patch) continue;
    mergedSpaceVectors = mergeSpaceVectors(mergedSpaceVectors, patch);
    sourcesApplied.push(filePath);
  }
  for (const patchRow of doltPatches) {
    const patch = normalizeSpaceVectorsPatch(patchRow.payload);
    if (!patch) continue;
    mergedSpaceVectors = mergeSpaceVectors(mergedSpaceVectors, patch);
    sourcesApplied.push(patchRow.id);
  }

  const generatedBundle = buildBundleFromBase(baseBundle, mergedSpaceVectors, sourcesApplied);
  const changed = generatedBundle.hashes.overall !== baseBundle.hashes?.overall;

  const report = {
    schemaVersion: "content-pack.ingest.report.v1",
    generatedAt: new Date().toISOString(),
    changed,
    sourceCount: sourcesApplied.length,
    sourceFiles: sourcesApplied.map((filePath) => filePath.replaceAll("\\", "/")),
    bundle: {
      hash: generatedBundle.hashes.overall,
      path: "public/game/content-pack.bundle.v1.json",
    },
    summary: {
      featureCount: Array.isArray(mergedSpaceVectors.featureSchema) ? mergedSpaceVectors.featureSchema.length : 0,
      modelCount: Array.isArray(mergedSpaceVectors.modelSchemas) ? mergedSpaceVectors.modelSchemas.length : 0,
      contentFeatureCount: Array.isArray(mergedSpaceVectors.contentFeatures) ? mergedSpaceVectors.contentFeatures.length : 0,
      powerFeatureCount: Array.isArray(mergedSpaceVectors.powerFeatures) ? mergedSpaceVectors.powerFeatures.length : 0,
    },
  };

  if (!isDryRun && (changed || isForce)) {
    mkdirSync(resolve(docsRoot, "public", "game"), { recursive: true });
    mkdirSync(resolve(docsRoot, "public", "reports"), { recursive: true });
    mkdirSync(outDir, { recursive: true });
    writeFileSync(bundleOutPath, `${JSON.stringify(generatedBundle, null, 2)}\n`, "utf8");
    writeFileSync(reportOutPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(snapshotOutPath, `${JSON.stringify(generatedBundle, null, 2)}\n`, "utf8");
  } else if (!isDryRun && !existsSync(reportOutPath)) {
    mkdirSync(resolve(docsRoot, "public", "reports"), { recursive: true });
    writeFileSync(reportOutPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (!isQuiet) {
    const mode = isDryRun ? "dry-run" : changed || isForce ? "updated" : "unchanged";
    console.log(`[content-pack:ingest] ${mode}`);
    console.log(`[content-pack:ingest] patches=${sourcesApplied.length}`);
    console.log(`[content-pack:ingest] hash=${generatedBundle.hashes.overall}`);
    console.log(`[content-pack:ingest] report=${reportOutPath}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`[content-pack:ingest] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
