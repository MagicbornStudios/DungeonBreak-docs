#!/usr/bin/env node
/**
 * Precompute 3D PCA projection of content space (skills, archetypes, dialogue).
 * Adds k-means cluster labels and unlockRadius for skills.
 * Output: space-data.json for API/client.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import kmeans from "ml-kmeans";
import { PCA } from "ml-pca";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ENGINE = path.join(ROOT, "packages/engine");
const TRAIT_NAMES = [
  "Comprehension", "Constraint", "Construction", "Direction",
  "Empathy", "Equilibrium", "Freedom", "Levity", "Projection", "Survival",
];
const FEATURE_NAMES = ["Fame", "Effort", "Awareness", "Guile", "Momentum"];

function toTraitVector(obj = {}) {
  const v = [];
  for (const k of TRAIT_NAMES) {
    v.push(Number(obj[k] ?? 0));
  }
  return v;
}

function toTraitFeatureVector(traits = {}, features = {}) {
  const v = toTraitVector(traits);
  for (const k of FEATURE_NAMES) {
    v.push(Number(features[k] ?? 0));
  }
  return v;
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const skillsPath = path.join(ENGINE, "src/escape-the-dungeon/contracts/data/skills.json");
const archetypesPath = path.join(ENGINE, "src/escape-the-dungeon/contracts/data/archetypes.json");
const dialoguePath = path.join(ENGINE, "src/escape-the-dungeon/contracts/data/dialogue-clusters.json");

const skills = loadJson(skillsPath).skills ?? [];
const archetypes = loadJson(archetypesPath).archetypes ?? [];
const dialogueClusters = loadJson(dialoguePath).clusters ?? [];

const contentPoints = [];
const skillPoints = skills.map((s) => {
  const v = toTraitVector(s.vectorProfile);
  const vComb = [...v, ...FEATURE_NAMES.map(() => 0)];
  contentPoints.push({
    type: "skill",
    id: s.skillId,
    name: s.name,
    branch: s.branch ?? "default",
    unlockRadius: Number(s.unlockRadius ?? 2),
    vector: v,
    vectorCombined: vComb,
  });
  return v;
});

const archetypePoints = archetypes.map((a) => {
  const traitV = toTraitVector(a.vectorProfile);
  const featureV = FEATURE_NAMES.map((k) => Number(a.featureProfile?.[k] ?? 0));
  const vComb = [...traitV, ...featureV];
  contentPoints.push({
    type: "archetype",
    id: a.archetypeId,
    name: a.label,
    branch: "archetype",
    vector: traitV,
    vectorCombined: vComb,
  });
  return traitV;
});

const dialogueOptions = [];
for (const cluster of dialogueClusters) {
  for (const opt of cluster.options ?? []) {
    const v = toTraitVector(opt.anchorVector);
    const vComb = [...v, ...FEATURE_NAMES.map(() => 0)];
    dialogueOptions.push(v);
    contentPoints.push({
      type: "dialogue",
      id: opt.optionId,
      name: opt.label,
      clusterId: cluster.clusterId,
      branch: cluster.clusterId,
      vector: v,
      vectorCombined: vComb,
    });
  }
}

const allTraitVectors = [
  ...skillPoints,
  ...archetypePoints,
  ...dialogueOptions,
];
const allCombinedVectors = contentPoints.map((p) => p.vectorCombined ?? [...p.vector, ...FEATURE_NAMES.map(() => 0)]);

if (allTraitVectors.length === 0) {
  console.error("No content points");
  process.exit(1);
}

function runPca(vectors, nComp = 3) {
  const pca = new PCA(vectors, { nComponents: nComp });
  const pred = pca.predict(vectors, { nComponents: nComp });
  const projected = (pred && typeof pred.to2DArray === "function") ? pred.to2DArray() : pred;
  const mean = (pca.means && Array.isArray(pca.means)) ? Array.from(pca.means) : new Array(vectors[0].length).fill(0);
  const eig = pca.getEigenvectors?.();
  const components = eig ? (eig.to2DArray ? eig.to2DArray() : (Array.isArray(eig) ? eig : [])) : [];
  return { projected, mean, components };
}

const traitPca = runPca(allTraitVectors);
const combinedPca = runPca(allCombinedVectors);

// K-means clustering on trait space (k = min(6, sqrt(n)))
const K = Math.min(6, Math.max(2, Math.floor(Math.sqrt(contentPoints.length))));
let kmeansResult;
try {
  kmeansResult = kmeans(allTraitVectors, K, { withIterations: false });
} catch (e) {
  console.warn("K-means failed:", e.message);
}
if (kmeansResult?.clusters) {
  for (let i = 0; i < contentPoints.length; i++) {
    contentPoints[i].cluster = kmeansResult.clusters[i];
  }
}

for (let i = 0; i < contentPoints.length; i++) {
  const rowT = traitPca.projected[i];
  const rowC = combinedPca.projected[i];
  if (rowT) {
    contentPoints[i].x = rowT[0];
    contentPoints[i].y = rowT[1];
    contentPoints[i].z = rowT[2];
  }
  if (rowC) {
    contentPoints[i].xCombined = rowC[0];
    contentPoints[i].yCombined = rowC[1];
    contentPoints[i].zCombined = rowC[2];
  }
}

const output = {
  schemaVersion: "space-data/v1",
  traitNames: TRAIT_NAMES,
  featureNames: FEATURE_NAMES,
  pca: traitPca.mean && traitPca.components ? {
    mean: Array.isArray(traitPca.mean) ? traitPca.mean : traitPca.mean.slice?.(0) ?? [],
    components: (traitPca.components ?? []).slice(0, 3).map((row) => Array.from(row)),
  } : null,
  spaces: {
    trait: {
      pca: {
        mean: Array.isArray(traitPca.mean) ? traitPca.mean : traitPca.mean.slice?.(0) ?? [],
        components: (traitPca.components ?? []).slice(0, 3).map((row) => Array.from(row)),
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
