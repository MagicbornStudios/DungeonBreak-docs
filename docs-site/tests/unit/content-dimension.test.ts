import { describe, expect, test } from "vitest";
import {
  buildModelGraph,
  buildScopedContentDimensions,
  deriveScopeFromTreeSelection,
} from "@/lib/content-dimension";

const MODELS = [
  { modelId: "entity", label: "Entity" },
  { modelId: "entity.hero", label: "Hero", extendsModelId: "entity" },
  {
    modelId: "entity.hero.knight",
    label: "Knight",
    extendsModelId: "entity.hero",
  },
  { modelId: "item", label: "Item" },
] as const;

const CANONICAL = [
  { id: "a1", name: "Hero A", modelId: "entity.hero" },
  { id: "a2", name: "Hero B", modelId: "entity.hero" },
  { id: "a3", name: "Knight A", modelId: "entity.hero.knight" },
  { id: "a4", name: "Item A", modelId: "item" },
] as const;

describe("content-dimension scope engine", () => {
  test("deriveScopeFromTreeSelection resolves model and canonical node scope", () => {
    const graph = buildModelGraph(MODELS);

    const fromModel = deriveScopeFromTreeSelection(
      { nodeType: "model", modelId: "entity.hero" },
      graph,
      CANONICAL
    );
    expect(fromModel.scopeRootModelId).toBe("entity.hero");

    const fromCanonical = deriveScopeFromTreeSelection(
      { nodeType: "object", instanceId: "a3" },
      graph,
      CANONICAL
    );
    expect(fromCanonical.scopeRootModelId).toBe("entity.hero.knight");

    const fromNone = deriveScopeFromTreeSelection(null, graph, CANONICAL);
    expect(fromNone.scopeRootModelId).toBeNull();
  });

  test("buildScopedContentDimensions scopes to descendants and computes depth + percentages", () => {
    const scoped = buildScopedContentDimensions(MODELS, CANONICAL, {
      scopeRootModelId: "entity.hero",
    });

    const schemaNodes = scoped.filter((row) => row.layerId === "schema-model");
    expect(schemaNodes.map((row) => row.modelId)).toEqual([
      "entity.hero",
      "entity.hero.knight",
    ]);

    const hero = schemaNodes.find((row) => row.modelId === "entity.hero");
    const knight = schemaNodes.find(
      (row) => row.modelId === "entity.hero.knight"
    );
    expect(hero?.inheritanceDepth).toBe(1);
    expect(knight?.inheritanceDepth).toBe(2);

    expect(hero?.contentSharePct).toBeCloseTo(2 / 3, 5);
    expect(knight?.contentSharePct).toBeCloseTo(1 / 3, 5);

    expect(hero?.surface.width).toBeGreaterThanOrEqual(1);
    expect(hero?.surface.height).toBeGreaterThanOrEqual(1);
  });

  test("hidden models and collapsed depths exclude expected nodes", () => {
    const scoped = buildScopedContentDimensions(MODELS, CANONICAL, {
      scopeRootModelId: "entity",
      hiddenModelIds: ["entity.hero"],
      collapsedDepths: [3],
    });

    const schemaModelIds = scoped
      .filter((row) => row.layerId === "schema-model")
      .map((row) => row.modelId);

    expect(schemaModelIds.includes("entity.hero")).toBe(false);
    expect(schemaModelIds.includes("entity.hero.knight")).toBe(false);
    expect(schemaModelIds.includes("entity")).toBe(true);
  });
});
