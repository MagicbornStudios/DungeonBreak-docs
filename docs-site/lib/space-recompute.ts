/**
 * Browser-side PCA + K-means recompute for content vectors.
 * Uses ml-pca and ml-kmeans (same as space-data.mjs).
 */

import kmeans from "ml-kmeans";
import { PCA } from "ml-pca";

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
  vectorNames: string[];
  combinedVectorExtensionNames: string[];
  pca: { mean: number[]; components: number[][] };
  projections: {
    vector: { pca: { mean: number[]; components: number[][] } };
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
  vectorNames: string[],
  combinedVectorExtensionNames: string[] = [],
): SpaceDataOutput {
  const allVectors = content.map((point) => point.vector);
  const allCombinedVectors = content.map(
    (point) => point.vectorCombined ?? [...point.vector, ...combinedVectorExtensionNames.map(() => 0)],
  );

  const vectorPca = runPca(allVectors);
  const combinedPca = runPca(allCombinedVectors);

  const k = Math.min(6, Math.max(2, Math.floor(Math.sqrt(content.length))));
  let clusters: number[] = [];
  try {
    const kmeansResult = kmeans(allVectors, k, { maxIterations: 100 });
    clusters = (kmeansResult as { clusters: number[] }).clusters ?? [];
  } catch {
    // keep empty
  }

  const updatedContent: ContentPointOutput[] = content.map((point, index) => {
    const projectedVector = vectorPca.projected[index];
    const projectedCombined = combinedPca.projected[index];
    return {
      ...point,
      x: projectedVector?.[0] ?? 0,
      y: projectedVector?.[1] ?? 0,
      z: projectedVector?.[2] ?? 0,
      xCombined: projectedCombined?.[0],
      yCombined: projectedCombined?.[1],
      zCombined: projectedCombined?.[2],
      cluster: clusters[index],
    };
  });

  const vectorMean = Array.isArray(vectorPca.mean) ? vectorPca.mean : [];
  const vectorComponents = (vectorPca.components ?? []).slice(0, 3).map((row) => Array.from(row));
  const combinedMean = Array.isArray(combinedPca.mean) ? combinedPca.mean : [];
  const combinedComponents = (combinedPca.components ?? []).slice(0, 3).map((row) => Array.from(row));

  return {
    schemaVersion: "space-data/v1",
    vectorNames,
    combinedVectorExtensionNames,
    pca: { mean: vectorMean, components: vectorComponents },
    projections: {
      vector: { pca: { mean: vectorMean, components: vectorComponents } },
      combined: { pca: { mean: combinedMean, components: combinedComponents } },
    },
    content: updatedContent,
  };
}
