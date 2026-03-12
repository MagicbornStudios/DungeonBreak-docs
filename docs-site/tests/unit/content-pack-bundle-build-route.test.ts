import { describe, expect, test } from "vitest";
import { POST } from "@/app/api/content-packs/build-bundle/route";

describe("content-pack bundle builder route", () => {
  test("merges space-vectors patch and returns a full bundle payload", async () => {
    const request = new Request(
      "http://localhost/api/content-packs/build-bundle",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patchName: "unit-test.patch",
          spaceVectorsPatch: {
            featureSchema: [
              {
                featureId: "unit_feature",
                label: "Unit Feature",
                groups: ["content_features"],
                spaces: ["dialogue"],
                defaultValue: 0,
              },
            ],
            modelSchemas: [
              {
                modelId: "entity.unit",
                label: "Entity Unit",
                description: "Unit test model",
                featureRefs: [
                  {
                    featureId: "unit_feature",
                    spaces: ["dialogue"],
                    required: true,
                  },
                ],
              },
            ],
            contentFeatures: [
              {
                basisId: "basis_unit_feature",
                label: "Unit Feature Basis",
                traits: { unit_feature: 1 },
              },
            ],
            actionSemantics: {
              fight: { combatIntensity: 1, risk: 0.6 },
            },
            behaviorDefaults: {
              windowSeconds: 7,
              stepSeconds: 1,
              actionStyle: {
                fight: "burst",
              },
              eventStyle: {},
              roomStyle: {},
            },
            contentBindings: {
              canonicalModelInstances: [
                {
                  id: "entity-instance.unit",
                  name: "Unit",
                  modelId: "entity.unit",
                  canonical: true,
                },
              ],
            },
          },
          levelContentPatch: {
            levels: [
              {
                levelId: "level.unit-floor",
                name: "Unit Floor",
                kind: "dungeon-floor",
                dungeonFloor: {
                  depth: 1,
                  rows: 1,
                  columns: 1,
                  startRoomId: "room.unit",
                  escapeRoomId: "room.unit",
                },
                rooms: [
                  {
                    roomId: "room.unit",
                    row: 0,
                    column: 0,
                    index: 0,
                    feature: "start",
                  },
                ],
              },
            ],
            dungeonRuns: [
              {
                runId: "run.unit",
                title: "Unit Run",
                levelIds: ["level.unit-floor"],
                startLevelId: "level.unit-floor",
                escapeLevelId: "level.unit-floor",
                roomSize: { x: 1, y: 1, z: 1 },
                levelSpacing: 1,
                dungeonOrigin: { x: 0, y: 0, z: 0 },
              },
            ],
          },
        }),
      }
    );

    const response = await POST(request);
    const body = (await response.json()) as {
      ok: boolean;
      bundle?: {
        schemaVersion: string;
        patchName: string;
        hashes: Record<string, string>;
        packs: {
          spaceVectors?: {
            featureSchema?: Array<{ featureId: string }>;
            modelSchemas?: Array<{ modelId: string }>;
            contentFeatures?: Array<{ basisId: string }>;
            actionSemantics?: Record<string, unknown>;
            behaviorDefaults?: { windowSeconds?: number };
            contentBindings?: {
              canonicalModelInstances?: Array<{ id: string; modelId: string }>;
            };
          };
          levelContent?: {
            levels?: Array<{ levelId: string; kind: string }>;
            dungeonRuns?: Array<{ runId: string; title: string }>;
          };
        };
      };
      manifest?: {
        schemaVersion: string;
        models: Array<{ modelId: string }>;
        canonicalAssets: Array<{ assetId: string; modelId: string }>;
      };
      generatedOutputs?: Array<{
        artifactId: string;
        label: string;
        fileName: string;
        text: string;
      }>;
      error?: string;
    };

    expect(body.ok).toBe(true);
    expect(body.bundle).toBeDefined();
    expect(body.bundle?.schemaVersion).toBe("content-pack.bundle.v1");
    expect(body.bundle?.patchName).toBe("unit-test.patch");
    expect(body.bundle?.hashes.overall).toMatch(/^[a-f0-9]{64}$/);
    expect(
      body.bundle?.packs.spaceVectors?.featureSchema?.some(
        (row) => row.featureId === "unit_feature"
      )
    ).toBe(true);
    expect(
      body.bundle?.packs.spaceVectors?.modelSchemas?.some(
        (row) => row.modelId === "entity.unit"
      )
    ).toBe(true);
    expect(
      body.bundle?.packs.spaceVectors?.contentFeatures?.some(
        (row) => row.basisId === "basis_unit_feature"
      )
    ).toBe(true);
    expect(body.bundle?.packs.spaceVectors?.actionSemantics?.fight).toEqual({
      combatIntensity: 1,
      risk: 0.6,
    });
    expect(
      body.bundle?.packs.spaceVectors?.behaviorDefaults?.windowSeconds
    ).toBe(7);
    expect(
      body.bundle?.packs.spaceVectors?.contentBindings?.canonicalModelInstances?.some(
        (row) =>
          row.id === "entity-instance.unit" && row.modelId === "entity.unit"
      )
    ).toBe(true);
    expect(
      body.bundle?.packs.levelContent?.levels?.some(
        (row) => row.levelId === "level.unit-floor" && row.kind === "dungeon-floor"
      )
    ).toBe(true);
    expect(body.manifest?.schemaVersion).toBe("content-pack.manifest.v1");
    expect(
      body.manifest?.models.some((row) => row.modelId === "entity.unit")
    ).toBe(true);
    expect(
      body.manifest?.canonicalAssets.some(
        (row) => row.assetId === "entity-instance.unit"
      )
    ).toBe(true);
    expect(body.generatedOutputs?.map((row) => row.artifactId)).toEqual(
      expect.arrayContaining([
        "report",
        "manifest",
        "schemaBundle",
        "levelContentDocument",
        "levelBrowserPayload",
        "modelsTs",
        "modelsCpp",
        "modelsCsharp",
        "index",
      ])
    );
    expect(
      body.generatedOutputs?.some(
        (row) =>
          row.artifactId === "modelsTs" &&
          row.fileName.endsWith(".ts") &&
          row.text.includes("EntityUnitModel")
      )
    ).toBe(true);
    const levelBrowserPayload = body.generatedOutputs?.find(
      (row) => row.artifactId === "levelBrowserPayload"
    );
    expect(levelBrowserPayload).toBeDefined();
    expect(JSON.parse(levelBrowserPayload?.text ?? "{}")).toMatchObject({
      runs: [
        {
          runId: "run.unit",
          levelIds: ["level.unit-floor"],
        },
      ],
    });
  });
});
