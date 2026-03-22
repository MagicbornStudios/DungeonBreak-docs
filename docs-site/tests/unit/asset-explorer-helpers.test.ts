import { describe, expect, test } from "vitest";
import {
  assetNameFromDocument,
  collectNumericPaths,
  exploredAssetsFromPack,
  getNumberAtPath,
  schemaBindingMeta,
  withUpsertedPackAsset,
  type CustomSchemaRecord,
  type JsonValue,
  type PackDocumentRecord,
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
});
