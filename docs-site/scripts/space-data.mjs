#!/usr/bin/env node
/**
 * Precompute 3D PCA projection of content vectors (skills, archetypes).
 * Adds k-means cluster labels and unlockRadius for skills.
 * Output: space-data.json for API/client.
 * Dialogue is not included in this analysis.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import kmeans from "ml-kmeans";
import { PCA } from "ml-pca";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ENGINE = path.join(ROOT, "packages/engine");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const contentSchemaPath = path.join(ENGINE, "src/escape-the-dungeon/contracts/data/config_content_schema.json");
const skillsPath = path.join(ENGINE, "src/escape-the-dungeon/contracts/data/skills.json");
const archetypesPath = path.join(ENGINE, "src/escape-the-dungeon/contracts/data/archetypes.json");
const dialoguePath = path.join(ENGINE, "src/escape-the-dungeon/contracts/data/dialogue-clusters.json");

const contentSchema = loadJson(contentSchemaPath);
const vectorNames = (contentSchema.featureSchema ?? [])
  .filter((row) => Array.isArray(row.groups) && row.groups.includes("content_features"))
  .map((row) => row.featureId);
const combinedVectorExtensionNames = (contentSchema.featureSchema ?? [])
  .filter((row) => Array.isArray(row.groups) && row.groups.includes("power_features"))
  .map((row) => row.featureId);

const toVector = (source = {}) => {
  return vectorNames.map((featureId) => Number(source[featureId] ?? 0));
};

const toCombinedVector = (vectorSource = {}, extensionSource = {}) => {
  return [
    ...toVector(vectorSource),
    ...combinedVectorExtensionNames.map((featureId) => Number(extensionSource[featureId] ?? 0)),
  ];
};

const skills = loadJson(skillsPath).skills ?? [];
const archetypes = loadJson(archetypesPath).archetypes ?? [];

const contentPoints = [];
const skillPoints = skills.map((skill) => {
  const vector = toVector(skill.vectorProfile);
  const vectorCombined = [...vector, ...combinedVectorExtensionNames.map(() => 0)];
  contentPoints.push({
    type: "skill",
    id: skill.skillId,
    name: skill.name,
    branch: skill.branch ?? "default",
    unlockRadius: Number(skill.unlockRadius ?? 2),
    vector,
    vectorCombined,
  });
  return vector;
});

const archetypePoints = archetypes.map((archetype) => {
  const vector = toVector(archetype.vectorProfile);
  const vectorCombined = toCombinedVector(archetype.vectorProfile, archetype.featureProfile);
  contentPoints.push({
    type: "archetype",
    id: archetype.archetypeId,
    name: archetype.label,
    branch: "archetype",
    vector,
    vectorCombined,
  });
  return vector;
});

const allVectors = [...skillPoints, ...archetypePoints];
const allCombinedVectors = contentPoints.map(
  (point) => point.vectorCombined ?? [...point.vector, ...combinedVectorExtensionNames.map(() => 0)],
);

if (allVectors.length === 0) {
  console.error("No content points");
  process.exit(1);
}

function runPca(vectors, nComp = 3) {
  const pca = new PCA(vectors, { nComponents: nComp });
  const pred = pca.predict(vectors, { nComponents: nComp });
  const projected = pred && typeof pred.to2DArray === "function" ? pred.to2DArray() : pred;
  const mean = pca.means && Array.isArray(pca.means) ? Array.from(pca.means) : new Array(vectors[0].length).fill(0);
  const eig = pca.getEigenvectors?.();
  const components = eig ? (eig.to2DArray ? eig.to2DArray() : Array.isArray(eig) ? eig : []) : [];
  return { projected, mean, components };
}

const vectorPca = runPca(allVectors);
const combinedPca = runPca(allCombinedVectors);

const k = Math.min(6, Math.max(2, Math.floor(Math.sqrt(contentPoints.length))));
let kmeansResult;
try {
  kmeansResult = kmeans(allVectors, k, { withIterations: false });
} catch (error) {
  console.warn("K-means failed:", error.message);
}
if (kmeansResult?.clusters) {
  for (let index = 0; index < contentPoints.length; index += 1) {
    contentPoints[index].cluster = kmeansResult.clusters[index];
  }
}

for (let index = 0; index < contentPoints.length; index += 1) {
  const vectorRow = vectorPca.projected[index];
  const combinedRow = combinedPca.projected[index];
  if (vectorRow) {
    contentPoints[index].x = vectorRow[0];
    contentPoints[index].y = vectorRow[1];
    contentPoints[index].z = vectorRow[2];
  }
  if (combinedRow) {
    contentPoints[index].xCombined = combinedRow[0];
    contentPoints[index].yCombined = combinedRow[1];
    contentPoints[index].zCombined = combinedRow[2];
  }
}

const output = {
  schemaVersion: "space-data/v1",
  vectorNames,
  combinedVectorExtensionNames,
  pca: {
    mean: Array.isArray(vectorPca.mean) ? vectorPca.mean : vectorPca.mean.slice?.(0) ?? [],
    components: (vectorPca.components ?? []).slice(0, 3).map((row) => Array.from(row)),
  },
  projections: {
    vector: {
      pca: {
        mean: Array.isArray(vectorPca.mean) ? vectorPca.mean : vectorPca.mean.slice?.(0) ?? [],
        components: (vectorPca.components ?? []).slice(0, 3).map((row) => Array.from(row)),
      },
    },
    combined: {
      pca: {
        mean: Array.isArray(combinedPca.mean) ? combinedPca.mean : combinedPca.mean.slice?.(0) ?? [],
        components: (combinedPca.components ?? []).slice(0, 3).map((row) => Array.from(row)),
      },
    },
  },
  content: contentPoints,
};

const outPath = path.join(__dirname, "../public/space-data.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
console.log(`Wrote ${contentPoints.length} points to ${outPath}`);
