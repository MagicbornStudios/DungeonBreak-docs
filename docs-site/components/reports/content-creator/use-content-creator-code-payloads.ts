"use client";

import { useMemo } from "react";

type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  featureRefs: Array<{ featureId: string; defaultValue?: number }>;
};

type SelectedContentObject = {
  id: string;
  name: string;
  type: string;
  branch: string;
  unlockRadius?: number | null;
  vector: number[];
  vectorCombined?: number[] | null;
  x: number;
  y: number;
  z: number;
};

export function useContentCreatorCodePayloads(params: {
  panelModelSchema: RuntimeModelSchemaRow | null;
  activeModelJsonSchema: unknown | null;
  selectedContentObject: SelectedContentObject | null;
  featureDefaultMap: Map<string, number>;
}) {
  const { panelModelSchema, activeModelJsonSchema, selectedContentObject, featureDefaultMap } = params;

  const activeObjectDefinition = useMemo(() => {
    if (!selectedContentObject) return null;
    return {
      objectId: selectedContentObject.id,
      name: selectedContentObject.name,
      objectType: selectedContentObject.type,
      branch: selectedContentObject.branch,
      unlockRadius: selectedContentObject.unlockRadius ?? null,
      vector: selectedContentObject.vector,
      vectorCombined: selectedContentObject.vectorCombined ?? null,
      position: {
        x: selectedContentObject.x,
        y: selectedContentObject.y,
        z: selectedContentObject.z,
      },
    };
  }, [selectedContentObject]);

  const definitionCode = useMemo(() => {
    if (panelModelSchema && activeModelJsonSchema) return JSON.stringify(activeModelJsonSchema, null, 2);
    if (activeObjectDefinition) return JSON.stringify(activeObjectDefinition, null, 2);
    return "";
  }, [panelModelSchema, activeModelJsonSchema, activeObjectDefinition]);

  const marshalledObjectCode = useMemo(() => {
    if (activeObjectDefinition) return JSON.stringify(activeObjectDefinition, null, 2);
    if (!panelModelSchema) return "";
    const stats = Object.fromEntries(
      panelModelSchema.featureRefs.map((ref) => [
        ref.featureId,
        Number((ref.defaultValue ?? featureDefaultMap.get(ref.featureId) ?? 0).toFixed(3)),
      ]),
    );
    return JSON.stringify(
      {
        modelId: panelModelSchema.modelId,
        label: panelModelSchema.label,
        stats,
      },
      null,
      2,
    );
  }, [activeObjectDefinition, panelModelSchema, featureDefaultMap]);

  return {
    activeObjectDefinition,
    definitionCode,
    marshalledObjectCode,
  };
}

