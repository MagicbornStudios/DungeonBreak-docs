"use client";

import { useMemo } from "react";

type FeatureRef = {
  featureId: string;
  spaces: string[];
  required?: boolean;
  defaultValue?: number;
};

type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  featureRefs: FeatureRef[];
};

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

type ContentObjectLike = {
  name: string;
};

type SchemaFile = {
  path: string;
  code: string;
};

type UseContentCreatorCodeTabsParams = {
  panelModelSchema: RuntimeModelSchemaRow | null;
  panelModelInstance: ModelInstanceBinding | null;
  selectedContentObject: ContentObjectLike | null;
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  featureDefaultMap: Map<string, number>;
  definitionCode: string;
  marshalledObjectCode: string;
  toFileStem: (value: string) => string;
  buildSingleSchemaFileForLanguage: (
    target: RuntimeModelSchemaRow,
    allRows: RuntimeModelSchemaRow[],
    featureDefaults: Map<string, number>,
    language: "typescript" | "cpp" | "csharp",
    assetFileStem: string,
  ) => SchemaFile | null;
};

export function useContentCreatorCodeTabs({
  panelModelSchema,
  panelModelInstance,
  selectedContentObject,
  runtimeModelSchemas,
  featureDefaultMap,
  definitionCode,
  marshalledObjectCode,
  toFileStem,
  buildSingleSchemaFileForLanguage,
}: UseContentCreatorCodeTabsParams) {
  return useMemo(() => {
    const tabs: Array<{ id: string; label: string; code: string }> = [];
    const assetFileStem = toFileStem(
      panelModelInstance?.name ?? selectedContentObject?.name ?? panelModelSchema?.modelId ?? "asset",
    );
    if (panelModelSchema) {
      const tsFile = buildSingleSchemaFileForLanguage(
        panelModelSchema,
        runtimeModelSchemas,
        featureDefaultMap,
        "typescript",
        assetFileStem,
      );
      const cppFile = buildSingleSchemaFileForLanguage(
        panelModelSchema,
        runtimeModelSchemas,
        featureDefaultMap,
        "cpp",
        assetFileStem,
      );
      const csFile = buildSingleSchemaFileForLanguage(
        panelModelSchema,
        runtimeModelSchemas,
        featureDefaultMap,
        "csharp",
        assetFileStem,
      );
      if (tsFile) tabs.push({ id: "lang:typescript", label: tsFile.path, code: tsFile.code });
      if (cppFile) tabs.push({ id: "lang:cpp", label: cppFile.path, code: cppFile.code });
      if (csFile) tabs.push({ id: "lang:csharp", label: csFile.path, code: csFile.code });
    }
    if (definitionCode) tabs.push({ id: "json:schema", label: `${assetFileStem}.schema.json`, code: definitionCode });
    if (marshalledObjectCode) tabs.push({ id: "json:data", label: `${assetFileStem}.json`, code: marshalledObjectCode });
    return tabs;
  }, [
    buildSingleSchemaFileForLanguage,
    definitionCode,
    featureDefaultMap,
    marshalledObjectCode,
    panelModelInstance,
    panelModelSchema,
    runtimeModelSchemas,
    selectedContentObject,
    toFileStem,
  ]);
}
