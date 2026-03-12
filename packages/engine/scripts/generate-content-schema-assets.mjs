#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(__dirname, "..");
const sourceRoot = join(
  engineRoot,
  "src",
  "escape-the-dungeon",
  "contracts",
  "source",
);
const sharedSourceRoot = join(sourceRoot, "shared");
const dataRoot = join(
  engineRoot,
  "src",
  "escape-the-dungeon",
  "contracts",
  "data",
);

const contentSchemaSourcePath = join(
  sharedSourceRoot,
  "content-schema.json",
);
const canonicalInstancesSourcePath = join(
  sharedSourceRoot,
  "canonical-instances.json",
);
const levelContentSourcePath = join(sharedSourceRoot, "level-content.json");
const generatedSpaceVectorsPath = join(dataRoot, "space-vectors.json");
const generatedLevelContentPath = join(dataRoot, "level-content.json");

const SPACE_VECTOR_SCHEMA_KEYS = [
  "featureSchema",
  "modelSchemas",
  "contentFeatures",
  "powerFeatures",
  "thematicBasisTraits",
  "actionSemantics",
  "roomSemantics",
  "eventSemantics",
  "itemSemantics",
  "behaviorDefaults",
  "entityProjection",
  "levelSemantics",
];

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, stableNormalize(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableNormalize(value));
}

function extractSchemaPatch(value) {
  if (!isRecord(value)) {
    return {};
  }
  const next = {};
  for (const key of SPACE_VECTOR_SCHEMA_KEYS) {
    if (!(key in value)) {
      continue;
    }
    const current = value[key];
    if (Array.isArray(current) || isRecord(current)) {
      next[key] = current;
    }
  }
  return next;
}

function extractContentBindings(value) {
  if (!isRecord(value)) {
    return undefined;
  }
  const source = isRecord(value.contentBindings) ? value.contentBindings : value;
  const next = {};
  if (Array.isArray(source.modelInstances)) {
    next.modelInstances = source.modelInstances;
  }
  if (Array.isArray(source.canonicalModelInstances)) {
    next.canonicalModelInstances = source.canonicalModelInstances;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function extractLevelContent(value) {
  if (!isRecord(value)) {
    return undefined;
  }
  const next = {};
  if (Array.isArray(value.levels)) {
    next.levels = value.levels;
  }
  if (Array.isArray(value.dungeonRuns)) {
    next.dungeonRuns = value.dungeonRuns;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

const schemaDocument = readJson(contentSchemaSourcePath);
const canonicalInstancesDocument = readJson(canonicalInstancesSourcePath);
const levelContentDocument = readJson(levelContentSourcePath);
const schemaPatch = extractSchemaPatch(schemaDocument);
const contentBindings = extractContentBindings(canonicalInstancesDocument);
const levelContent = extractLevelContent(levelContentDocument);

const generatedSpaceVectors = {
  ...schemaPatch,
  ...(contentBindings ? { contentBindings } : {}),
};

mkdirSync(dirname(generatedSpaceVectorsPath), { recursive: true });
const nextOutput = `${JSON.stringify(generatedSpaceVectors, null, 2)}\n`;
let shouldWrite = true;
try {
  const currentOutput = readFileSync(generatedSpaceVectorsPath, "utf8");
  shouldWrite = stableJson(JSON.parse(currentOutput)) !== stableJson(generatedSpaceVectors);
} catch {
  shouldWrite = true;
}

if (shouldWrite) {
  writeFileSync(generatedSpaceVectorsPath, nextOutput, "utf8");
  console.log(`[content-schema] wrote ${generatedSpaceVectorsPath}`);
} else {
  console.log(`[content-schema] up to date ${generatedSpaceVectorsPath}`);
}

if (levelContent) {
  const nextLevelContentOutput = `${JSON.stringify(levelContent, null, 2)}\n`;
  let shouldWriteLevelContent = true;
  try {
    const currentOutput = readFileSync(generatedLevelContentPath, "utf8");
    shouldWriteLevelContent =
      stableJson(JSON.parse(currentOutput)) !== stableJson(levelContent);
  } catch {
    shouldWriteLevelContent = true;
  }

  if (shouldWriteLevelContent) {
    writeFileSync(generatedLevelContentPath, nextLevelContentOutput, "utf8");
    console.log(`[content-schema] wrote ${generatedLevelContentPath}`);
  } else {
    console.log(`[content-schema] up to date ${generatedLevelContentPath}`);
  }
}
