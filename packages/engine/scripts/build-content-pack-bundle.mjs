#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(__dirname, "..");
const contractsDataDir = join(engineRoot, "src", "escape-the-dungeon", "contracts", "data");
const contractsSourcePath = join(engineRoot, "src", "escape-the-dungeon", "contracts", "source", "content-source.json");
const enginePackageJsonPath = join(engineRoot, "package.json");
const generatorPath = join(engineRoot, "scripts", "generate-contract-source-assets.mjs");

const outPathArg = process.argv[2];
const outputPath = outPathArg
  ? resolve(process.cwd(), outPathArg)
  : join(engineRoot, "dist", "content-pack.bundle.v1.json");

const packFiles = {
  contentSchema: "config_content_schema.json",
  actionCatalog: "config_action_catalog.json",
  actionIntents: "config_action_intents.json",
  actionPolicies: "config_action_policies.json",
  actionContracts: "config_action_formulas.json",
  roomTemplates: "content_room_templates.json",
  itemPack: "content_items.json",
  skillPack: "content_skills.json",
  archetypePack: "content_archetypes.json",
  dialoguePack: "content_dialogue.json",
  cutscenePack: "content_cutscenes.json",
  questPack: "content_quests.json",
  eventPack: "content_events.json",
  dungeonLayouts: "content_dungeons.json",
  spaceVectors: "config_space_vectors.json",
};

const generatorResult = spawnSync(process.execPath, [generatorPath], {
  cwd: engineRoot,
  stdio: "inherit",
});

if (generatorResult.status !== 0) {
  process.exit(generatorResult.status ?? 1);
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

const enginePackage = JSON.parse(readFileSync(enginePackageJsonPath, "utf8"));
const packs = Object.fromEntries(
  Object.entries(packFiles).map(([key, filename]) => {
    const fullPath = join(contractsDataDir, filename);
    return [key, JSON.parse(readFileSync(fullPath, "utf8"))];
  }),
);

packs.contentSource = JSON.parse(readFileSync(contractsSourcePath, "utf8"));

const packHashes = Object.fromEntries(
  Object.entries(packs).map(([key, value]) => [key, sha256Hex(stableJson(value))]),
);

const bundle = {
  schemaVersion: "content-pack.bundle.v1",
  generatedAt: new Date().toISOString(),
  enginePackage: {
    name: enginePackage.name,
    version: enginePackage.version,
  },
  hashes: {
    ...packHashes,
  },
  packs,
};

bundle.hashes.overall = sha256Hex(
  stableJson({
    schemaVersion: bundle.schemaVersion,
    enginePackage: bundle.enginePackage,
    hashes: packHashes,
    packs: bundle.packs,
  }),
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
console.log(`[content-pack-bundle] wrote ${outputPath}`);
