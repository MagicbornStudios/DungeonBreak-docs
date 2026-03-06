export type SchemaLanguage = "typescript" | "cpp" | "csharp";

export type SchemaFile = {
  path: string;
  code: string;
};

export type SchemaFeatureRefLike = {
  featureId: string;
  spaces: string[];
  required?: boolean;
  defaultValue?: number;
};

export type SchemaModelLike = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  statModifiers?: Array<{
    modifierStatModelId: string;
    mappings: Array<{ modifierFeatureId: string; targetFeatureId: string }>;
  }>;
  featureRefs: SchemaFeatureRefLike[];
};

export type ModelInstanceBindingLike = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

export function canonicalizeModelIdRaw(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "_")
    .replace(/\.base(?=\.|$)/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export function migrateModelSchemasAwayFromBase<T extends SchemaModelLike>(
  rows: T[]
): T[] {
  const mergedById = new Map<string, T>();
  for (const row of rows) {
    const modelId = canonicalizeModelIdRaw(row.modelId);
    if (!modelId) continue;
    const extendsModelId = row.extendsModelId
      ? canonicalizeModelIdRaw(row.extendsModelId)
      : undefined;
    const attachedStatModelIds = (row.attachedStatModelIds ?? [])
      .map((id) => canonicalizeModelIdRaw(id))
      .filter((id): id is string => Boolean(id));
    const nextFeatureRefs = row.featureRefs.map((ref) => ({
      featureId: ref.featureId,
      spaces: [...ref.spaces],
      required: ref.required,
      defaultValue: ref.defaultValue,
    }));
    const statModifiers = (row.statModifiers ?? []).map((modifier) => ({
      modifierStatModelId: canonicalizeModelIdRaw(modifier.modifierStatModelId),
      mappings: (modifier.mappings ?? [])
        .filter((mapping) => mapping?.modifierFeatureId && mapping?.targetFeatureId)
        .map((mapping) => ({
          modifierFeatureId: mapping.modifierFeatureId,
          targetFeatureId: mapping.targetFeatureId,
        })),
    }));
    const existing = mergedById.get(modelId);
    if (!existing) {
      mergedById.set(modelId, {
        ...row,
        modelId,
        label: row.label || modelId,
        extendsModelId:
          extendsModelId && extendsModelId !== modelId ? extendsModelId : undefined,
        attachedStatModelIds:
          attachedStatModelIds.length > 0
            ? [...new Set(attachedStatModelIds.filter((id) => id !== modelId))]
            : undefined,
        statModifiers:
          statModifiers.filter(
            (modifier) =>
              modifier.modifierStatModelId && modifier.modifierStatModelId !== modelId
          ).length > 0
            ? statModifiers.filter(
                (modifier) =>
                  modifier.modifierStatModelId &&
                  modifier.modifierStatModelId !== modelId
              )
            : undefined,
        featureRefs: nextFeatureRefs,
      } as T);
      continue;
    }
    const featureMap = new Map(
      existing.featureRefs.map((ref) => [ref.featureId, ref] as const)
    );
    for (const ref of nextFeatureRefs) {
      if (!featureMap.has(ref.featureId)) featureMap.set(ref.featureId, ref);
    }
    existing.featureRefs = Array.from(featureMap.values());
    if (!existing.label && row.label) existing.label = row.label;
    if (!existing.description && row.description) existing.description = row.description;
    if (!existing.extendsModelId && extendsModelId && extendsModelId !== modelId) {
      existing.extendsModelId = extendsModelId;
    }
    const mergedAttached = [
      ...new Set([...(existing.attachedStatModelIds ?? []), ...attachedStatModelIds]),
    ].filter((id) => id !== modelId);
    existing.attachedStatModelIds =
      mergedAttached.length > 0 ? mergedAttached : undefined;
    const existingModifiers = new Map(
      (existing.statModifiers ?? []).map((modifier) => [modifier.modifierStatModelId, modifier] as const)
    );
    for (const modifier of statModifiers) {
      if (!modifier.modifierStatModelId || modifier.modifierStatModelId === modelId) continue;
      if (!existingModifiers.has(modifier.modifierStatModelId)) {
        existingModifiers.set(modifier.modifierStatModelId, modifier);
      }
    }
    existing.statModifiers =
      existingModifiers.size > 0 ? Array.from(existingModifiers.values()) : undefined;
  }
  return Array.from(mergedById.values());
}

export function toTypeName(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");
}

export function toConstName(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.toUpperCase())
    .join("_");
}

export function toMemberName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_]/g, "_");
  if (!cleaned) return "value";
  if (/^[0-9]/.test(cleaned)) return `v_${cleaned}`;
  return cleaned;
}

export function toFileStem(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "asset"
  );
}

export function codeLanguageForTabId(
  tabId: string
): "typescript" | "cpp" | "csharp" | "json" {
  if (tabId.includes("cpp")) return "cpp";
  if (tabId.includes("csharp")) return "csharp";
  if (tabId.includes("ts")) return "typescript";
  return "json";
}

export function formatModelIdForUi(modelId: string): string {
  return canonicalizeModelIdRaw(modelId);
}

export function resolveParentModelId(
  modelId: string,
  modelIdSet: Set<string>,
  modelById?: Map<string, SchemaModelLike>
): string | null {
  const explicitParent = modelById?.get(modelId)?.extendsModelId;
  if (
    explicitParent &&
    explicitParent !== modelId &&
    modelIdSet.has(explicitParent)
  ) {
    return explicitParent;
  }
  const parts = modelId.split(".");
  if (parts.length < 2) return null;
  for (let depth = parts.length - 1; depth >= 1; depth -= 1) {
    const parentCandidate = parts.slice(0, depth).join(".");
    if (parentCandidate !== modelId && modelIdSet.has(parentCandidate))
      return parentCandidate;
    const baseCandidate = `${parentCandidate}.base`;
    if (baseCandidate !== modelId && modelIdSet.has(baseCandidate))
      return baseCandidate;
  }
  return null;
}

export function buildDefaultStatModifierMappings(
  targetStat: SchemaModelLike,
  modifierStat: SchemaModelLike
): Array<{ modifierFeatureId: string; targetFeatureId: string }> {
  const targetIds = targetStat.featureRefs.map((ref) => ref.featureId);
  const modifierIds = modifierStat.featureRefs.map((ref) => ref.featureId);
  if (modifierIds.length === 0) return [];
  if (targetIds.length === 0) {
    return modifierIds.map((modifierFeatureId) => ({
      modifierFeatureId,
      targetFeatureId: modifierFeatureId,
    }));
  }
  return modifierIds.map((modifierFeatureId, index) => ({
    modifierFeatureId,
    targetFeatureId: targetIds[index % targetIds.length] ?? targetIds[0]!,
  }));
}

export function buildSchemaFilesForLanguage(
  activeModel: SchemaModelLike,
  allSchemas: SchemaModelLike[],
  featureDefaults: Map<string, number>,
  language: SchemaLanguage
): SchemaFile[] {
  const modelById = new Map(allSchemas.map((row) => [row.modelId, row] as const));
  const modelIdSet = new Set(allSchemas.map((row) => row.modelId));
  const chain: SchemaModelLike[] = [];
  const visited = new Set<string>();
  let cursor: SchemaModelLike | undefined = activeModel;
  while (cursor && !visited.has(cursor.modelId)) {
    chain.unshift(cursor);
    visited.add(cursor.modelId);
    const parentId = resolveParentModelId(cursor.modelId, modelIdSet, modelById);
    cursor = parentId ? modelById.get(parentId) : undefined;
  }

  return chain.map((schema) => {
    const parentId = resolveParentModelId(schema.modelId, modelIdSet, modelById);
    const parent = parentId ? modelById.get(parentId) : null;
    const fileStem =
      schema.modelId
        .replace(/\.base\b/g, "")
        .replace(/\.+/g, "-")
        .replace(/^-+|-+$/g, "") || "model";
    const typeName = `${toTypeName(schema.modelId)}Schema`;
    const parentTypeName = parent ? `${toTypeName(parent.modelId)}Schema` : null;
    const defaultsName = `${toConstName(schema.modelId)}_DEFAULTS`;
    const parentDefaultsName = parent ? `${toConstName(parent.modelId)}_DEFAULTS` : null;

    if (language === "cpp") {
      const filePath = `${fileStem}.hpp`;
      const code = [
        "#pragma once",
        "",
        `struct ${typeName}${parentTypeName ? ` : ${parentTypeName}` : ""} {`,
        ...schema.featureRefs.map((ref) => `  float ${toMemberName(ref.featureId)} = 0.0f;`),
        "};",
        "",
        `inline ${typeName} ${toTypeName(schema.modelId)}Defaults() {`,
        `  ${typeName} value{};`,
        ...(parentDefaultsName ? [`  value = ${toTypeName(parent!.modelId)}Defaults();`] : []),
        ...schema.featureRefs.map((ref) => {
          const nextDefault = ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
          return `  value.${toMemberName(ref.featureId)} = ${nextDefault.toFixed(3)}f;`;
        }),
        "  return value;",
        "}",
      ].join("\n");
      return { path: filePath, code };
    }

    if (language === "csharp") {
      const filePath = `${toTypeName(fileStem)}.cs`;
      const code = [
        `public record class ${typeName}${parentTypeName ? ` : ${parentTypeName}` : ""}`,
        "{",
        ...schema.featureRefs.map((ref) => {
          const nextDefault = ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
          return `  public float ${toTypeName(ref.featureId)} { get; init; } = ${nextDefault.toFixed(3)}f;`;
        }),
        "}",
      ].join("\n");
      return { path: filePath, code };
    }

    const filePath = `${fileStem}.ts`;
    const code = [
      `export interface ${typeName}${parentTypeName ? ` extends ${parentTypeName}` : ""} {`,
      ...schema.featureRefs.map((ref) => `  "${ref.featureId}": number;`),
      "}",
      "",
      `export const ${defaultsName}: ${parentTypeName ? `Partial<${typeName}>` : typeName} = {`,
      ...schema.featureRefs.map((ref) => {
        const nextDefault = ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
        return `  "${ref.featureId}": ${nextDefault.toFixed(3)},`;
      }),
      "};",
      ...(parentDefaultsName
        ? [
            "",
            `export const ${toConstName(schema.modelId)}_HYDRATED_DEFAULTS: ${typeName} = {`,
            `  ...${parentDefaultsName},`,
            `  ...${defaultsName},`,
            "};",
          ]
        : []),
    ].join("\n");
    return { path: filePath, code };
  });
}

export function buildSingleSchemaFileForLanguage(
  activeModel: SchemaModelLike,
  allSchemas: SchemaModelLike[],
  featureDefaults: Map<string, number>,
  language: SchemaLanguage,
  outputStem: string
): SchemaFile | null {
  const files = buildSchemaFilesForLanguage(activeModel, allSchemas, featureDefaults, language);
  if (files.length === 0) return null;
  const ext = language === "typescript" ? "ts" : language === "cpp" ? "hpp" : "cs";
  const code = files.map((file) => `// ${file.path}\n${file.code}`).join("\n\n");
  return {
    path: `${outputStem}.${ext}`,
    code,
  };
}

export function buildJsonSchemaForModel(
  activeModel: SchemaModelLike,
  allSchemas: SchemaModelLike[],
  featureDefaults: Map<string, number>
): Record<string, unknown> {
  const modelById = new Map(allSchemas.map((row) => [row.modelId, row] as const));
  const modelIdSet = new Set(allSchemas.map((row) => row.modelId));
  const chain: SchemaModelLike[] = [];
  const visited = new Set<string>();
  let cursor: SchemaModelLike | undefined = activeModel;
  while (cursor && !visited.has(cursor.modelId)) {
    chain.unshift(cursor);
    visited.add(cursor.modelId);
    const parentId = resolveParentModelId(cursor.modelId, modelIdSet, modelById);
    cursor = parentId ? modelById.get(parentId) : undefined;
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `dungeonbreak://object-definition/${activeModel.modelId}.object.json`,
    title: `${activeModel.label || activeModel.modelId} Object Definition`,
    description: activeModel.description ?? `Object definition for ${activeModel.modelId}`,
    type: "object",
    "x-modelId": activeModel.modelId,
    "x-extendsModelId": activeModel.extendsModelId ?? null,
    "x-implements": ["content-model"],
    allOf: chain.map((schema) => {
      const statProperties: Record<string, unknown> = {};
      const requiredStats: string[] = [];
      for (const ref of schema.featureRefs) {
        const nextDefault = ref.defaultValue ?? featureDefaults.get(ref.featureId) ?? 0;
        statProperties[ref.featureId] = {
          type: "number",
          default: Number(nextDefault.toFixed(3)),
          "x-spaces": ref.spaces,
        };
        if (ref.required) requiredStats.push(ref.featureId);
      }
      return {
        title: `${schema.modelId} layer`,
        description: schema.description ?? schema.label,
        type: "object",
        "x-modelId": schema.modelId,
        "x-extendsModelId": schema.extendsModelId ?? null,
        properties: {
          stats: {
            type: "object",
            description: "Stat variables for this model layer.",
            properties: statProperties,
            ...(requiredStats.length > 0 ? { required: requiredStats } : {}),
            additionalProperties: false,
          },
        },
        required: ["stats"],
        additionalProperties: false,
      };
    }),
    additionalProperties: false,
  };
}

export function parseModelInstancesFromContentBindings(
  spaceVectors: Record<string, unknown> | undefined
): ModelInstanceBindingLike[] {
  if (!spaceVectors || typeof spaceVectors !== "object") return [];
  const row = spaceVectors as { contentBindings?: unknown };
  if (!row.contentBindings || typeof row.contentBindings !== "object") return [];
  const bindings = row.contentBindings as {
    canonicalModelInstances?: unknown;
    modelInstances?: unknown;
  };
  const source = Array.isArray(bindings.canonicalModelInstances)
    ? bindings.canonicalModelInstances
    : Array.isArray(bindings.modelInstances)
      ? bindings.modelInstances
      : [];
  const instances: ModelInstanceBindingLike[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const parsed = item as {
      id?: unknown;
      name?: unknown;
      modelId?: unknown;
      canonical?: unknown;
    };
    const id = String(parsed.id ?? "").trim();
    const modelId = canonicalizeModelIdRaw(String(parsed.modelId ?? ""));
    if (!id || !modelId) continue;
    instances.push({
      id,
      modelId,
      name: String(parsed.name ?? id),
      canonical: Boolean(parsed.canonical ?? true),
    });
  }
  return instances;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeModelId(value: string): string {
  return canonicalizeModelIdRaw(value);
}
