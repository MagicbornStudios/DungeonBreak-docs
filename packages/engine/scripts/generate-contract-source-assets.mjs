#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(__dirname, "..");
const contractsRoot = join(engineRoot, "src", "escape-the-dungeon", "contracts");
const sourcePath = join(contractsRoot, "source", "content-source.json");
const dataDir = join(contractsRoot, "data");

const runtimePackFileMap = {
  actionCatalog: "action-catalog.json",
  actionIntents: "action-intents.json",
  actionPolicies: "action-policies.json",
  actionContracts: "action-formulas.json",
  roomTemplates: "room-templates.json",
  itemPack: "items.json",
  skillPack: "skills.json",
  archetypePack: "archetypes.json",
  dialoguePack: "dialogue-clusters.json",
  cutscenePack: "cutscenes.json",
  questPack: "quests.json",
  eventPack: "events.json",
  dungeonLayouts: "dungeons.json",
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

const source = assertRecord(readJson(sourcePath), "content-source");
const contentSchema = assertRecord(source.contentSchema, "content-source.contentSchema");
const vectorRuntime = assertRecord(source.vectorRuntime, "content-source.vectorRuntime");
const packs = assertRecord(source.packs, "content-source.packs");

const requiredContentSchemaKeys = ["schemaVersion", "featureSchema", "modelSchemas"];
for (const key of requiredContentSchemaKeys) {
  if (!(key in contentSchema)) {
    throw new Error(`content-source.contentSchema is missing '${key}'.`);
  }
}

const generatedSpaceVectors = {
  ...vectorRuntime,
  featureSchema: contentSchema.featureSchema,
  modelSchemas: contentSchema.modelSchemas,
  ...(contentSchema.contentBindings ? { contentBindings: contentSchema.contentBindings } : {}),
};

writeJson(join(dataDir, "content-schema.json"), contentSchema);
writeJson(join(dataDir, "space-vectors.json"), generatedSpaceVectors);
for (const [packKey, outputFile] of Object.entries(runtimePackFileMap)) {
  if (!(packKey in packs)) {
    throw new Error(`content-source.packs is missing '${packKey}'.`);
  }
  writeJson(join(dataDir, outputFile), packs[packKey]);
}

console.log(`[content-source] generated runtime contract assets from ${sourcePath}`);
