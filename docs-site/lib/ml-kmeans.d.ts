declare module "ml-kmeans" {
  type KMeansResult = {
    clusters: number[];
    centroids?: number[][];
  };
  function kmeans(
    data: number[][],
    K: number,
    options?: { maxIterations?: number; withIterations?: boolean },
  ): KMeansResult;
  export default kmeans;
}
