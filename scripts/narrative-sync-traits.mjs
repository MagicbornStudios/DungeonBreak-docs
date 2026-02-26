#!/usr/bin/env node
/**
 * Sync game thematic basis vector asset names into the Python demo manifest.
 * Source of truth: Content/DungeonBreak/Narrative/ThematicBasisVectors/*.uasset
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const traitsDir = join(
  root,
  "Content",
  "DungeonBreak",
  "Narrative",
  "ThematicBasisVectors"
);
const manifestPath = join(
  root,
  "src",
  "dungeonbreak_narrative",
  "data",
  "game_traits_manifest.json"
);

const traitNames = existsSync(traitsDir)
  ? readdirSync(traitsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".uasset"))
      .map((entry) => entry.name.replace(/\.uasset$/i, ""))
      .sort((a, b) => a.localeCompare(b))
  : [];

const manifest = {
  version: 1,
  source: "Content/DungeonBreak/Narrative/ThematicBasisVectors",
  generated_at_utc: new Date().toISOString(),
  traits: traitNames,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

if (!existsSync(traitsDir)) {
  console.warn("WARN: Thematic basis vector directory not found:", traitsDir);
}
console.log(
  `Synced ${traitNames.length} trait names from game assets to ${manifestPath}`
);
