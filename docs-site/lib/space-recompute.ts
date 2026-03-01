/**
 * Browser-side PCA + K-means recompute for content space.
 * Uses ml-pca and ml-kmeans (same as space-data.mjs).
 */

import kmeans from "ml-kmeans";
import { PCA } from "ml-pca";

const FEATURE_NAMES = ["Fame", "Effort", "Awareness", "Guile", "Momentum"];

export type ContentPointInput = {
  type: string;
  id: string;
  name: string;
  branch: string;
  vector: number[];
  vectorCombined?: number[];
  unlockRadius?: number;
};

export type ContentPointOutput = ContentPointInput & {
  x: number;
  y: number;
  z: number;
  xCombined?: number;
  yCombined?: number;
  zCombined?: number;
  cluster?: number;
};

export type SpaceDataOutput = {
  schemaVersion: string;
  traitNames: string[];
  featureNames: string[];
  pca: { mean: number[]; components: number[][] };
  spaces: {
    trait: { pca: { mean: number[]; components: number[][] } };
    combined: { pca: { mean: number[]; components: number[][] } };
  };
  content: ContentPointOutput[];
};

function runPca(
  vectors: number[][],
  nComp = 3,
): { projected: number[][]; mean: number[]; components: number[][] } {
  const pca = new PCA(vectors);
  const pred = pca.predict(vectors, { nComponents: nComp });
  const projected =
    pred && typeof (pred as { to2DArray?: () => number[][] }).to2DArray === "function"
      ? (pred as { to2DArray: () => number[][] }).to2DArray()
      : (pred as unknown as number[][]);
  const model = pca.toJSON();
  const mean = Array.isArray(model.means) ? [...model.means] : new Array(vectors[0]?.length ?? 0).fill(0);
  const eig = pca.getEigenvectors();
  const components =
    eig && typeof (eig as { to2DArray?: () => number[][] }).to2DArray === "function"
      ? (eig as { to2DArray: () => number[][] }).to2DArray()
      : [];
  return { projected, mean, components };
}

export function recomputeSpaceData(
  content: ContentPointInput[],
  traitNames: string[],
): SpaceDataOutput {
  const allTraitVectors = content.map((p) => p.vector);
  const allCombinedVectors = content.map(
    (p) => p.vectorCombined ?? [...p.vector, ...FEATURE_NAMES.map(() => 0)],
  );

  const traitPca = runPca(allTraitVectors);
  const combinedPca = runPca(allCombinedVectors);

  const K = Math.min(6, Math.max(2, Math.floor(Math.sqrt(content.length))));
  let clusters: number[] = [];
  try {
    const kmeansResult = kmeans(allTraitVectors, K, { maxIterations: 100 });
    clusters = (kmeansResult as { clusters: number[] }).clusters ?? [];
  } catch {
    // keep empty
  }

  const updatedContent: ContentPointOutput[] = content.map((pt, i) => {
    const rowT = traitPca.projected[i];
    const rowC = combinedPca.projected[i];
    return {
      ...pt,
      x: rowT?.[0] ?? 0,
      y: rowT?.[1] ?? 0,
      z: rowT?.[2] ?? 0,
      xCombined: rowC?.[0],
      yCombined: rowC?.[1],
      zCombined: rowC?.[2],
      cluster: clusters[i],
    };
  });

  const meanT = Array.isArray(traitPca.mean) ? traitPca.mean : [];
  const compT = (traitPca.components ?? []).slice(0, 3).map((r) => Array.from(r));
  const meanC = Array.isArray(combinedPca.mean) ? combinedPca.mean : [];
  const compC = (combinedPca.components ?? []).slice(0, 3).map((r) => Array.from(r));

  return {
    schemaVersion: "space-data/v1",
    traitNames,
    featureNames: FEATURE_NAMES,
    pca: { mean: meanT, components: compT },
    spaces: {
      trait: { pca: { mean: meanT, components: compT } },
      combined: { pca: { mean: meanC, components: compC } },
    },
    content: updatedContent,
  };
}
