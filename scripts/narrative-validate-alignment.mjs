#!/usr/bin/env node
/**
 * Warn-only alignment validator between:
 * - game basis-vector assets
 * - game_traits_manifest.json
 * - narrative_snapshot.json basis vectors
 *
 * Always exits 0 by design.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
const snapshotPath = join(
  root,
  "src",
  "dungeonbreak_narrative",
  "data",
  "narrative_snapshot.json"
);

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function dedupe(values) {
  return [...new Set(values)];
}

function readJson(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }
  try {
    return JSON.parse(String(readFileSync(path, "utf8")));
  } catch {
    return fallback;
  }
}

function getFolderTraits() {
  if (!existsSync(traitsDir)) {
    return [];
  }
  return uniqueSorted(
    readdirSync(traitsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".uasset"))
      .map((entry) => entry.name.replace(/\.uasset$/i, ""))
  );
}

function compareSets(leftLabel, left, rightLabel, right) {
  const missingInRight = left.filter((name) => !right.includes(name));
  const extraInRight = right.filter((name) => !left.includes(name));
  const orderAligned =
    left.length === right.length && left.every((name, i) => name === right[i]);
  return { leftLabel, rightLabel, missingInRight, extraInRight, orderAligned };
}

function printComparison(result) {
  const {
    leftLabel,
    rightLabel,
    missingInRight,
    extraInRight,
    orderAligned,
  } = result;
  console.log(`\n[ALIGNMENT] ${leftLabel} -> ${rightLabel}`);
  if (missingInRight.length === 0 && extraInRight.length === 0 && orderAligned) {
    console.log("  OK: names and order aligned");
    return 0;
  }
  if (missingInRight.length > 0) {
    console.warn(`  WARN missing in ${rightLabel}: ${missingInRight.join(", ")}`);
  }
  if (extraInRight.length > 0) {
    console.warn(`  WARN extra in ${rightLabel}: ${extraInRight.join(", ")}`);
  }
  if (!orderAligned) {
    console.warn(`  WARN order mismatch between ${leftLabel} and ${rightLabel}`);
  }
  return 1;
}

const folderTraits = getFolderTraits();
const manifest = readJson(manifestPath, { traits: [] });
const snapshot = readJson(snapshotPath, { basis_vectors: [] });
const manifestTraits = dedupe(((manifest && manifest.traits) || []).map((name) => String(name)));
const snapshotTraits = dedupe(
  ((snapshot && snapshot.basis_vectors) || []).map((name) => String(name))
);

console.log("Narrative alignment validation (warn-only)");
console.log(`- Folder traits:   ${folderTraits.length}`);
console.log(`- Manifest traits: ${manifestTraits.length}`);
console.log(`- Snapshot traits: ${snapshotTraits.length}`);

let warningCount = 0;
warningCount += printComparison(
  compareSets("Folder traits", folderTraits, "Manifest traits", manifestTraits)
);
warningCount += printComparison(
  compareSets("Manifest traits", manifestTraits, "Snapshot traits", snapshotTraits)
);

if (warningCount === 0) {
  console.log("\nAlignment status: OK");
} else {
  console.warn(`\nAlignment status: WARN (${warningCount} comparison groups with drift)`);
}

// Warn-only policy: never fail the process.
process.exit(0);
