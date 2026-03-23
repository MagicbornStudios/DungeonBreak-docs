import { describe, expect, test } from "vitest";
import {
  assetNameFromDocument,
  canonicalAssetCountForPackSchema,
  collectNumericPaths,
  customSchemaForSupportedGameSchema,
  exploredAssetByDataId,
  exploredAssetsForSchema,
  exploredAssetsFromPack,
  getNumberAtPath,
  nextGameLoopTarget,
  packRecordForSchema,
  schemaBindingMeta,
  schemaRecordBySchemaId,
  setCanonicalAssetName,
  sortCustomSchemasGameFirst,
  supportedGameSchemaForCustomSchema,
  withUpsertedPackAsset,
  type CustomSchemaRecord,
  type JsonValue,
  type PackDocumentRecord,
  type ProjectAssetRecord,
  type ProjectDetailResponse,
} from "@/components/reports/asset-explorer";

const canonicalSchema = {
  id: "schema-1",
  schemaId: "escape-the-dungeon/spells",
  name: "Spell Asset",
  targetPackId: "spells",
  schemaType: "json-schema",
  status: "draft",
  updatedAt: null,
  document: {
    type: "object",
    "x-dungeonbreak-packId": "spells",
    "x-dungeonbreak-collectionKey": "spells",
    "x-dungeonbreak-itemIdKey": "spellId",
  },
} satisfies CustomSchemaRecord;

const supportedGameSchema = {
  packId: "spells",
  schemaId: "escape-the-dungeon/spells",
  title: "Spells",
  kind: "content",
  schemaFile: "spells.schema.json",
  schemaVersion: "v1",
  schemaRef: null,
  description: "Spell content pack",
  imported: true,
  seeded: true,
  customSchemaId: canonicalSchema.id,
} satisfies NonNullable<ProjectDetailResponse["supportedGameSchemas"]>[number];

const spellsPackDocument: JsonValue = {
  spells: [
    {
      spellId: "spark",
      name: "Spark",
      power: 5,
      cost: { mana: 2 },
    },
    {
      spellId: "torrent",
      label: "Torrent",
      power: 9,
      cost: { mana: 4 },
    },
  ],
};

const spellsPack = {
  id: "pack-1",
  packId: "spells",
  title: "Spells",
  kind: "content",
  exportName: "spells.json",
  sourceFile: "contracts/data/spells.json",
  contentSourcePath: null,
  bundleKey: null,
  schemaVersion: "v1",
  status: "imported",
  updatedAt: "2026-03-22T00:00:00.000Z",
  document: spellsPackDocument,
} satisfies PackDocumentRecord;

const genericSchema = {
  id: "schema-2",
  schemaId: "escape-the-dungeon/custom-widget",
  name: "Custom Widget",
  targetPackId: null,
  schemaType: "json-schema",
  status: "draft",
  updatedAt: null,
  document: {
    type: "object",
    properties: {
      name: { type: "string" },
      power: { type: "number" },
    },
  },
} satisfies CustomSchemaRecord;

const genericProjectAsset = {
  id: "asset-1",
  dataId: "widget-alpha",
  name: "Widget Alpha",
  projectLayer: "project-data",
  namespace: "generic-extension",
  targetId: "escape-the-dungeon/custom-widget",
  status: "draft",
  updatedAt: "2026-03-22T00:00:00.000Z",
  document: {
    name: "Widget Alpha",
    power: 4,
  },
} satisfies ProjectAssetRecord;

const projectDetail = {
  ok: true,
  customSchemas: [canonicalSchema, genericSchema],
  packs: [spellsPack],
  projectData: [genericProjectAsset],
  supportedGameSchemas: [supportedGameSchema],
} satisfies Pick<
  ProjectDetailResponse,
  "ok" | "customSchemas" | "packs" | "projectData" | "supportedGameSchemas"
>;

describe("asset explorer helpers", () => {
  test("reads canonical pack binding metadata from schema document", () => {
    expect(schemaBindingMeta(canonicalSchema)).toEqual({
      packId: "spells",
      collectionKey: "spells",
      itemIdKey: "spellId",
    });
  });

  test("explores canonical pack assets and supports search", () => {
    const assets = exploredAssetsFromPack(
      spellsPack,
      schemaBindingMeta(canonicalSchema),
      ""
    );

    expect(assets).toHaveLength(2);
    expect(assets[0]?.dataId).toBe("spark");
    expect(assets[0]?.name).toBe("Spark");
    expect(assets[1]?.name).toBe("Torrent");

    const filtered = exploredAssetsFromPack(
      spellsPack,
      schemaBindingMeta(canonicalSchema),
      "torrent"
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.dataId).toBe("torrent");
  });

  test("upserts canonical pack assets by authored item id", () => {
    const meta = schemaBindingMeta(canonicalSchema);
    expect(meta).toBeTruthy();
    if (!meta) {
      return;
    }

    const updated = withUpsertedPackAsset(spellsPack.document, meta, "spark", {
      name: "Spark+",
      power: 7,
      cost: { mana: 3 },
    }) as { spells?: JsonValue[] };

    expect(Array.isArray(updated.spells)).toBe(true);
    expect(updated.spells).toHaveLength(2);
    expect((updated.spells?.[0] as { spellId?: string }).spellId).toBe("spark");
    expect((updated.spells?.[0] as { name?: string }).name).toBe("Spark+");

    const appended = withUpsertedPackAsset(spellsPack.document, meta, "ember", {
      name: "Ember",
      power: 4,
    }) as { spells?: JsonValue[] };
    expect(appended.spells).toHaveLength(3);
    expect(
      (appended.spells?.[2] as { spellId?: string; name?: string }).spellId
    ).toBe("ember");
  });

  test("derives numeric paths and numeric values from nested asset json", () => {
    const paths = collectNumericPaths({
      power: 5,
      cost: { mana: 2 },
      presentation: { title: "Spark" },
    });

    expect(paths).toEqual(["power", "cost.mana"]);
    expect(getNumberAtPath({ power: 5, cost: { mana: 2 } }, "cost.mana")).toBe(
      2
    );
    expect(getNumberAtPath({ power: 5 }, "cost.mana")).toBeNull();
  });

  test("prefers name, then label, then title for asset naming", () => {
    expect(assetNameFromDocument({ name: "One" }, "fallback")).toBe("One");
    expect(assetNameFromDocument({ label: "Two" }, "fallback")).toBe("Two");
    expect(assetNameFromDocument({ title: "Three" }, "fallback")).toBe("Three");
    expect(assetNameFromDocument({}, "fallback")).toBe("fallback");
  });

  test("looks up schema and pack records by canonical ids", () => {
    expect(
      schemaRecordBySchemaId(projectDetail, canonicalSchema.schemaId)?.id
    ).toBe(canonicalSchema.id);
    expect(packRecordForSchema(projectDetail, canonicalSchema)?.packId).toBe(
      spellsPack.packId
    );
    expect(packRecordForSchema(projectDetail, genericSchema)).toBeNull();
  });

  test("maps supported game schemas to seeded custom schemas", () => {
    expect(
      customSchemaForSupportedGameSchema(
        projectDetail.customSchemas ?? [],
        supportedGameSchema
      )?.id
    ).toBe(canonicalSchema.id);
    expect(
      supportedGameSchemaForCustomSchema(
        projectDetail.supportedGameSchemas ?? [],
        canonicalSchema
      )?.packId
    ).toBe("spells");
    expect(
      supportedGameSchemaForCustomSchema(
        projectDetail.supportedGameSchemas ?? [],
        genericSchema
      )
    ).toBeNull();
  });

  test("sorts supported game schemas ahead of generic manual forms", () => {
    expect(
      sortCustomSchemasGameFirst(
        [genericSchema, canonicalSchema],
        projectDetail.supportedGameSchemas ?? []
      ).map((schema) => schema.id)
    ).toEqual([canonicalSchema.id, genericSchema.id]);
  });

  test("counts canonical assets and recommends the next game-loop target", () => {
    expect(canonicalAssetCountForPackSchema(spellsPack, canonicalSchema)).toBe(2);
    expect(
      nextGameLoopTarget(
        projectDetail.supportedGameSchemas ?? [],
        projectDetail.customSchemas ?? [],
        projectDetail.packs ?? []
      )
    ).toMatchObject({
      reason: "open-form",
      schema: { packId: "spells" },
    });

    expect(
      nextGameLoopTarget(
        [
          supportedGameSchema,
          {
            ...supportedGameSchema,
            packId: "entityTypes",
            schemaId: "escape-the-dungeon/entityTypes",
            title: "Entity Types",
            imported: false,
            seeded: false,
            customSchemaId: null,
          },
        ],
        projectDetail.customSchemas ?? [],
        projectDetail.packs ?? []
      )
    ).toMatchObject({
      reason: "seed-form",
      schema: { packId: "entityTypes" },
    });
  });

  test("derives explored assets from canonical packs and project data schemas", () => {
    const canonicalAssets = exploredAssetsForSchema(
      projectDetail,
      canonicalSchema
    );
    expect(canonicalAssets).toHaveLength(2);
    expect(canonicalAssets[0]?.source).toBe("pack");

    const projectAssets = exploredAssetsForSchema(projectDetail, genericSchema);
    expect(projectAssets).toHaveLength(1);
    expect(projectAssets[0]?.source).toBe("project-data");
    expect(projectAssets[0]?.dataId).toBe(genericProjectAsset.dataId);
  });

  test("finds one explored asset by data id across schema-backed sources", () => {
    expect(
      exploredAssetByDataId(projectDetail, canonicalSchema, "torrent")?.name
    ).toBe("Torrent");
    expect(
      exploredAssetByDataId(projectDetail, genericSchema, "widget-alpha")?.name
    ).toBe("Widget Alpha");
    expect(
      exploredAssetByDataId(projectDetail, genericSchema, "missing")
    ).toBeNull();
  });

  test("updates canonical asset names using existing name-like fields", () => {
    expect(setCanonicalAssetName({ name: "Old" }, "New")).toEqual({
      name: "New",
    });
    expect(setCanonicalAssetName({ label: "Old" }, "New")).toEqual({
      label: "New",
    });
    expect(setCanonicalAssetName({ title: "Old" }, "New")).toEqual({
      title: "New",
    });
    expect(setCanonicalAssetName({ power: 5 }, "New")).toEqual({
      power: 5,
      name: "New",
    });
  });
});
