import * as EngineRuntime from "@dungeonbreak/engine";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
} from "react";
import {
  cosineSimilarity,
  euclideanDist,
  hashToUnit,
  projectPoint,
} from "@/lib/space-explorer-shared";
import {
  CONTENT_SPACE_KEYS,
  isContentRuntimeView,
  resolveEffectiveAlgorithm,
  type ContentSpaceKey,
  type DistanceAlgorithm,
  type RuntimeSpaceView,
} from "@/lib/space-explorer-runtime";
import { formatModelIdForUi } from "@/lib/space-explorer-schema";
import {
  coordsFromUnifiedVector,
  flattenUnifiedVector,
  type RuntimeUnifiedModel,
  type UnifiedSpaceVector,
  vectorToCoords,
} from "@/lib/space-vector";
import {
  getPointCoords,
  type SpaceMode,
} from "@/components/reports/space-explorer/view-helpers";
import type {
  ContentPoint,
  RuntimeFeatureSchemaRow,
  RuntimeModelSchemaRow,
  RuntimeVizPoint,
  SpaceData,
  SpaceVectorPackOverrides,
  ModelSpaceOverlayPoint,
} from "@/components/reports/space-explorer/config";

type UseSpaceRuntimeMetricsParams = {
  runtimeSpaceView: RuntimeSpaceView;
  distanceAlgorithm: DistanceAlgorithm;
  nearestK: number;
  data: SpaceData;
  traits: Record<string, number>;
  features: Record<string, number>;
  traitDeltas: Record<string, number>;
  featureDeltas: Record<string, number>;
  setTraits: Dispatch<SetStateAction<Record<string, number>>>;
  setFeatures: Dispatch<SetStateAction<Record<string, number>>>;
  customFeatureValues: Record<string, number>;
  setCustomFeatureValues: Dispatch<SetStateAction<Record<string, number>>>;
  spaceFeatureMap: Record<ContentSpaceKey, string[]>;
  statContentLevels: Array<{ modelId: string; featureIds: string[] }>;
  enabledStatFeatureIdSet: Set<string>;
  combinedVector: number[];
  spaceOverrides: SpaceVectorPackOverrides | undefined;
  unifiedModel: RuntimeUnifiedModel;
  movementBudget: number;
  selectedModelInheritanceChain: RuntimeModelSchemaRow[];
  featureDefaultsById: Map<string, number>;
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
};

export function useSpaceRuntimeMetrics({
  runtimeSpaceView,
  distanceAlgorithm,
  nearestK,
  data,
  traits,
  features,
  traitDeltas,
  featureDeltas,
  setTraits,
  setFeatures,
  customFeatureValues,
  setCustomFeatureValues,
  spaceFeatureMap,
  statContentLevels,
  enabledStatFeatureIdSet,
  combinedVector,
  spaceOverrides,
  unifiedModel,
  movementBudget,
  selectedModelInheritanceChain,
  featureDefaultsById,
  runtimeFeatureSchema,
}: UseSpaceRuntimeMetricsParams) {
  const playerUnified = useMemo(() => {
    const runtime = EngineRuntime as unknown as {
      projectEntitySpaceVector?: (
        input: {
          traits: Record<string, number>;
          features: Record<string, number>;
          health?: number;
          energy?: number;
          reputation?: number;
        },
        overrides?: SpaceVectorPackOverrides
      ) => UnifiedSpaceVector;
    };
    const traitRecord = Object.fromEntries(
      Object.keys(traits).map((featureId) => [
        featureId,
        Number(traits[featureId] ?? 0) + Number(traitDeltas[featureId] ?? 0),
      ])
    ) as Record<string, number>;
    const featureRecord = Object.fromEntries(
      Object.keys(features).map((featureId) => [
        featureId,
        Number(features[featureId] ?? 0) + Number(featureDeltas[featureId] ?? 0),
      ])
    ) as Record<string, number>;
    if (typeof runtime.projectEntitySpaceVector === "function") {
      return runtime.projectEntitySpaceVector(
        {
          traits: traitRecord,
          features: featureRecord,
        },
        spaceOverrides
      );
    }
    return {
      traits: traitRecord,
      features: featureRecord,
    } satisfies UnifiedSpaceVector;
  }, [traits, features, traitDeltas, featureDeltas, spaceOverrides]);

  const runtimeVizPoints = useMemo((): RuntimeVizPoint[] => {
    const source = flattenUnifiedVector(playerUnified);
    const actionRows: RuntimeVizPoint[] = unifiedModel.actionSpace.map((row) => ({
      id: row.actionType,
      name: row.actionType,
      type: "action",
      branch: "action",
      vector: flattenUnifiedVector(row.vector),
      coords: coordsFromUnifiedVector(row.vector),
      similarity: cosineSimilarity(source, flattenUnifiedVector(row.vector)),
    }));
    const eventRows: RuntimeVizPoint[] = unifiedModel.eventSpace.map((row) => ({
      id: row.eventId,
      name: row.eventId,
      type: "event",
      branch: row.kind,
      vector: flattenUnifiedVector(row.vector),
      coords: coordsFromUnifiedVector(row.vector),
      similarity: cosineSimilarity(source, flattenUnifiedVector(row.vector)),
    }));
    const effectRows: RuntimeVizPoint[] = unifiedModel.effectSpace.map((row) => ({
      id: row.effectId,
      name: row.effectId,
      type: "effect",
      branch: row.sourceType,
      vector: flattenUnifiedVector(row.delta),
      coords: coordsFromUnifiedVector(row.delta),
      similarity: cosineSimilarity(source, flattenUnifiedVector(row.delta)),
      netImpact: row.behavior.aggregates.netImpact,
      behaviorStyle: row.behavior.style,
    }));
    if (runtimeSpaceView === "action") return actionRows;
    if (runtimeSpaceView === "event") return eventRows;
    if (runtimeSpaceView === "effect") return effectRows;
    return [];
  }, [playerUnified, unifiedModel, runtimeSpaceView]);

  const getFeatureValue = useCallback(
    (featureId: string): number => {
      if (featureId in traits || featureId in traitDeltas) {
        return traits[featureId] ?? 0;
      }
      if (featureId in features || featureId in featureDeltas) {
        return features[featureId] ?? 0;
      }
      return customFeatureValues[featureId] ?? 0;
    },
    [traits, features, traitDeltas, featureDeltas, customFeatureValues]
  );

  const setFeatureValue = useCallback(
    (featureId: string, nextValue: number) => {
      if (featureId in traits || featureId in traitDeltas) {
        setTraits((prev) => ({
          ...prev,
          [featureId]: nextValue,
        }));
        return;
      }
      if (featureId in features || featureId in featureDeltas) {
        setFeatures((prev) => ({
          ...prev,
          [featureId]: nextValue,
        }));
        return;
      }
      setCustomFeatureValues((prev) => ({ ...prev, [featureId]: nextValue }));
    },
    [traits, features, traitDeltas, featureDeltas, setTraits, setFeatures, setCustomFeatureValues]
  );

  const runtimeSpaceFeatureIds = useMemo(() => {
    if (
      runtimeSpaceView === "content-combined" ||
      runtimeSpaceView === "content-dialogue" ||
      runtimeSpaceView === "content-skill" ||
      runtimeSpaceView === "content-archetype"
    ) {
      return spaceFeatureMap[runtimeSpaceView] ?? [];
    }
    return [];
  }, [runtimeSpaceView, spaceFeatureMap]);

  const contentSpaceFeatureIds = useMemo(() => {
    if (statContentLevels.length === 0) return [];
    return runtimeSpaceFeatureIds.filter((featureId) =>
      enabledStatFeatureIdSet.has(featureId)
    );
  }, [runtimeSpaceFeatureIds, statContentLevels, enabledStatFeatureIdSet]);

  const normalizeFeatureValue = useCallback(
    (_featureId: string, value: number): number => Number(value),
    []
  );

  const traitIndexByFeatureId = useMemo(
    () =>
      new Map((data?.traitNames ?? []).map((featureId, index) => [featureId, index])),
    [data]
  );

  const spaceFeatureNameSet = useMemo(() => new Set(data?.featureNames ?? []), [data]);

  const getContentPointFeatureValue = useCallback(
    (point: ContentPoint, featureId: string): number => {
      const traitIndex = traitIndexByFeatureId.get(featureId);
      if (typeof traitIndex === "number") {
        return Number(point.vector[traitIndex] ?? 0);
      }
      if (spaceFeatureNameSet.has(featureId)) {
        return hashToUnit(`${point.id}:${point.branch}:${featureId}`) * 100;
      }
      return hashToUnit(`${point.id}:${point.type}:${point.branch}:${featureId}`) * 2 - 1;
    },
    [traitIndexByFeatureId, spaceFeatureNameSet]
  );

  const playerSpaceVector = useMemo(() => {
    if (!isContentRuntimeView(runtimeSpaceView) || runtimeSpaceView === "content-combined") {
      return combinedVector;
    }
    return contentSpaceFeatureIds.map((featureId) =>
      normalizeFeatureValue(featureId, getFeatureValue(featureId))
    );
  }, [
    runtimeSpaceView,
    combinedVector,
    contentSpaceFeatureIds,
    normalizeFeatureValue,
    getFeatureValue,
  ]);

  const selectedModelSpacePoints = useMemo<ModelSpaceOverlayPoint[]>(() => {
    const selectedSchemas = selectedModelInheritanceChain;
    if (selectedSchemas.length === 0) return [];
    const getModelDefault = (
      schema: RuntimeModelSchemaRow,
      featureId: string
    ): number => {
      const ref = schema.featureRefs.find((row) => row.featureId === featureId);
      return ref?.defaultValue ?? featureDefaultsById.get(featureId) ?? 0;
    };
    if (isContentRuntimeView(runtimeSpaceView)) {
      const featureIds = contentSpaceFeatureIds;
      if (featureIds.length === 0) return [];
      return selectedSchemas.map((schema, index) => {
        const vector = featureIds.map((featureId) =>
          normalizeFeatureValue(featureId, getModelDefault(schema, featureId))
        );
        const coords = vectorToCoords(vector);
        const levelLabel = index === 0 ? "parent" : `derived-${index}`;
        return {
          id: `model-space:${schema.modelId}`,
          name: `${formatModelIdForUi(schema.modelId)} [${levelLabel}]`,
          coords,
          vector,
        };
      });
    }
    return selectedSchemas.map((schema, index) => {
      const featureRecord = Object.fromEntries(
        runtimeFeatureSchema.map((row) => [
          row.featureId,
          getModelDefault(schema, row.featureId),
        ])
      ) as Record<string, number>;
      const unified = {
        traits: {},
        features: featureRecord,
      } satisfies UnifiedSpaceVector;
      const levelLabel = index === 0 ? "parent" : `derived-${index}`;
      return {
        id: `model-space:${schema.modelId}`,
        name: `${formatModelIdForUi(schema.modelId)} [${levelLabel}]`,
        coords: coordsFromUnifiedVector(unified),
        vector: flattenUnifiedVector(unified),
      };
    });
  }, [
    selectedModelInheritanceChain,
    featureDefaultsById,
    runtimeSpaceView,
    contentSpaceFeatureIds,
    runtimeFeatureSchema,
    normalizeFeatureValue,
  ]);

  const activeContentSpace = useMemo<SpaceMode | null>(() => {
    if (!isContentRuntimeView(runtimeSpaceView)) return null;
    return runtimeSpaceView === "content-combined" ? "combined" : "trait";
  }, [runtimeSpaceView]);

  const pca = useMemo(() => {
    if (!data) return null;
    if (runtimeSpaceView !== "content-combined") return null;
    if (!activeContentSpace) return null;
    const s = data.spaces?.[activeContentSpace];
    if (s?.pca) return s.pca;
    if (data.pca && activeContentSpace === "trait") return data.pca;
    return null;
  }, [data, activeContentSpace, runtimeSpaceView]);

  const { player3d, knn, content, contentCoords, reachability } = useMemo(() => {
    if (!isContentRuntimeView(runtimeSpaceView)) {
      const runtimeKnn = [...runtimeVizPoints]
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          branch: row.branch,
          vector: [],
          x: row.coords.x,
          y: row.coords.y,
          z: row.coords.z,
          distance: 1 - row.similarity,
        })) as (ContentPoint & { distance: number })[];
      return {
        player3d: [
          coordsFromUnifiedVector(playerUnified).x,
          coordsFromUnifiedVector(playerUnified).y,
          coordsFromUnifiedVector(playerUnified).z,
        ] as [number, number, number],
        knn: runtimeKnn,
        content: runtimeKnn.map((row) => ({
          ...row,
          cluster: undefined,
          unlockRadius: undefined,
        })) as ContentPoint[],
        contentCoords: runtimeKnn.map((row) => ({
          x: row.x,
          y: row.y,
          z: row.z,
        })),
        reachability: {
          skillsInRange: 0,
          skillsTotal: 0,
          minDistanceToSkill: runtimeKnn[0]?.distance ?? 0,
          meanDistanceToNearest5:
            runtimeKnn.length > 0
              ? runtimeKnn
                  .slice(0, 5)
                  .reduce((sum, row) => sum + row.distance, 0) /
                Math.max(1, Math.min(5, runtimeKnn.length))
              : 0,
          reachableIds: runtimeKnn.slice(0, 5).map((row) => row.id),
          rangeBonus: 0,
        },
      };
    }
    if (!data?.content || !activeContentSpace) {
      return {
        player3d: [0, 0, 0] as [number, number, number],
        knn: [] as (ContentPoint & { distance: number })[],
        content: [] as ContentPoint[],
        contentCoords: [] as { x: number; y: number; z: number }[],
        reachability: {
          skillsInRange: 0,
          skillsTotal: 0,
          minDistanceToSkill: 0,
          meanDistanceToNearest5: 0,
          reachableIds: [] as string[],
          rangeBonus: 0,
        },
      };
    }
    const filteredContent = data.content;
    const playerVec =
      runtimeSpaceView === "content-combined" ? combinedVector : playerSpaceVector;
    const contentWithVectors = filteredContent.map((pt) => {
      if (runtimeSpaceView === "content-combined") {
        return {
          ...pt,
          runtimeVector: pt.vectorCombined ?? pt.vector,
          runtimeCoords: getPointCoords(pt, "combined"),
        };
      }
      const runtimeVector = contentSpaceFeatureIds.map((featureId) =>
        normalizeFeatureValue(featureId, getContentPointFeatureValue(pt, featureId))
      );
      return {
        ...pt,
        runtimeVector,
        runtimeCoords: vectorToCoords(runtimeVector),
      };
    });
    const player3d =
      runtimeSpaceView === "content-combined" && pca
        ? projectPoint(playerVec, pca.mean, pca.components)
        : ([
            vectorToCoords(playerVec).x,
            vectorToCoords(playerVec).y,
            vectorToCoords(playerVec).z,
          ] as [number, number, number]);
    const contentCoords = contentWithVectors.map((pt) => ({
      x: pt.runtimeCoords.x,
      y: pt.runtimeCoords.y,
      z: pt.runtimeCoords.z,
    }));
    const distances = contentWithVectors.map((pt) => ({
      ...pt,
      vector: pt.runtimeVector,
      distance: euclideanDist(playerVec, pt.runtimeVector),
    }));
    distances.sort((a, b) => a.distance - b.distance);
    const knn = distances.slice(0, 10);

    const skills = data.content.filter((p) => p.type === "skill");
    const skillsWithDist = skills
      .map((s) => ({
        ...s,
        distance:
          runtimeSpaceView === "content-combined"
            ? euclideanDist(playerVec, s.vectorCombined ?? s.vector)
            : euclideanDist(
                playerVec,
                contentSpaceFeatureIds.map((featureId) =>
                  normalizeFeatureValue(
                    featureId,
                    getContentPointFeatureValue(s, featureId)
                  )
                )
              ),
      }))
      .sort((a, b) => a.distance - b.distance);
    const rangeBonus = movementBudget * 0.02;
    const inRange = skillsWithDist.filter(
      (s) => s.distance <= (s.unlockRadius ?? 2) + rangeBonus
    );
    const nearest5 = skillsWithDist.slice(0, 5);
    const meanDist5 = nearest5.length
      ? nearest5.reduce((s, x) => s + x.distance, 0) / nearest5.length
      : 0;
    const minDist = skillsWithDist.length
      ? Math.min(...skillsWithDist.map((s) => s.distance))
      : 0;

    const nextReachability = {
      skillsInRange: inRange.length,
      skillsTotal: skills.length,
      minDistanceToSkill: minDist,
      meanDistanceToNearest5: meanDist5,
      reachableIds: inRange.map((s) => s.id),
      rangeBonus,
    };

    return {
      player3d,
      knn,
      content: distances as ContentPoint[],
      contentCoords,
      reachability: nextReachability,
    };
  }, [
    data,
    pca,
    combinedVector,
    activeContentSpace,
    movementBudget,
    runtimeSpaceView,
    runtimeVizPoints,
    playerUnified,
    playerSpaceVector,
    contentSpaceFeatureIds,
    getContentPointFeatureValue,
    normalizeFeatureValue,
  ]);

  const effectiveAlgorithm = useMemo(
    () => resolveEffectiveAlgorithm(runtimeSpaceView, distanceAlgorithm),
    [runtimeSpaceView, distanceAlgorithm]
  );

  const nearestRows = useMemo(() => {
    const k = Math.max(1, Math.min(50, nearestK));
    if (isContentRuntimeView(runtimeSpaceView)) {
      if (!data?.content || !activeContentSpace) return [];
      const source =
        runtimeSpaceView === "content-combined" ? combinedVector : playerSpaceVector;
      return data.content
        .map((row) => {
          const target =
            runtimeSpaceView === "content-combined"
              ? (row.vectorCombined ?? row.vector)
              : contentSpaceFeatureIds.map((featureId) =>
                  normalizeFeatureValue(
                    featureId,
                    getContentPointFeatureValue(row, featureId)
                  )
                );
          const score =
            effectiveAlgorithm === "cosine"
              ? 1 - cosineSimilarity(source, target)
              : euclideanDist(source, target);
          return {
            id: row.id,
            name: row.name,
            type: row.type,
            branch: row.branch,
            score,
          };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, k);
    }
    const source = flattenUnifiedVector(playerUnified);
    return [...runtimeVizPoints]
      .map((row) => {
        const score =
          effectiveAlgorithm === "cosine"
            ? 1 - cosineSimilarity(source, row.vector)
            : euclideanDist(source, row.vector);
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          branch: row.branch,
          score,
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, k);
  }, [
    runtimeSpaceView,
    nearestK,
    playerUnified,
    runtimeVizPoints,
    effectiveAlgorithm,
    data,
    activeContentSpace,
    combinedVector,
    playerSpaceVector,
    contentSpaceFeatureIds,
    getContentPointFeatureValue,
    normalizeFeatureValue,
  ]);

  const activeFeatureSpace = useMemo<ContentSpaceKey | null>(
    () =>
      CONTENT_SPACE_KEYS.includes(runtimeSpaceView as ContentSpaceKey)
        ? (runtimeSpaceView as ContentSpaceKey)
        : null,
    [runtimeSpaceView]
  );

  return {
    getFeatureValue,
    setFeatureValue,
    runtimeSpaceFeatureIds,
    contentSpaceFeatureIds,
    selectedModelSpacePoints,
    player3d,
    knn,
    content,
    contentCoords,
    reachability,
    effectiveAlgorithm,
    nearestRows,
    activeFeatureSpace,
  };
}
