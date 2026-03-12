import { describe, expect, test } from "vitest";
import {
  buildCanonicalInstancesDocument,
  buildContentSchemaDocument,
  buildLevelContentDocument,
  extractCanonicalInstancesPatch,
  extractLevelContentPatch,
  extractSpaceVectorSchemaPatch,
  isCanonicalInstancesDocument,
  isContentSchemaDocument,
  isLevelContentDocument,
  toSpaceVectorPackFromDocuments,
} from "@dungeonbreak/engine/content-schema";

describe("content schema documents", () => {
  test("round-trips schema and canonical instance documents into space-vector overrides", () => {
    const schemaDocument = buildContentSchemaDocument(
      {
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
            featureRefs: [
              {
                featureId: "unit_feature",
                spaces: ["dialogue"],
                required: true,
              },
            ],
          },
        ],
        actionSemantics: {
          fight: { combatIntensity: 1 },
        },
      },
      {
        schemaId: "unit.test.schema",
        title: "Unit Test Schema",
      }
    );
    const canonicalInstancesDocument = buildCanonicalInstancesDocument(
      {
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
      {
        documentId: "unit.test.canonical",
        title: "Unit Test Canonical Instances",
      }
    );
    const levelContentDocument = buildLevelContentDocument(
      {
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
                feature: "start",
                row: 0,
                column: 0,
                index: 0,
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
      {
        documentId: "unit.test.level-content",
        title: "Unit Test Level Content",
      }
    );

    expect(isContentSchemaDocument(schemaDocument)).toBe(true);
    expect(isCanonicalInstancesDocument(canonicalInstancesDocument)).toBe(true);
    expect(isLevelContentDocument(levelContentDocument)).toBe(true);
    expect(
      (extractSpaceVectorSchemaPatch(schemaDocument) as {
        featureSchema?: Array<unknown>;
      }).featureSchema
    ).toHaveLength(1);
    expect(
      extractCanonicalInstancesPatch(canonicalInstancesDocument)
        ?.canonicalModelInstances
    ).toHaveLength(1);
    expect(extractLevelContentPatch(levelContentDocument)?.levels).toHaveLength(
      1
    );

    const overrides = toSpaceVectorPackFromDocuments({
      schema: schemaDocument,
      canonicalInstances: canonicalInstancesDocument,
      levelContent: levelContentDocument,
    }) as {
      featureSchema?: Array<unknown>;
      modelSchemas?: Array<unknown>;
      actionSemantics?: Record<string, unknown>;
      contentBindings?: {
        canonicalModelInstances?: Array<unknown>;
      };
      levelContent?: {
        levels?: Array<unknown>;
        dungeonRuns?: Array<unknown>;
      };
    };

    expect(overrides.featureSchema).toHaveLength(1);
    expect(overrides.modelSchemas).toHaveLength(1);
    expect(overrides.actionSemantics).toEqual({
      fight: { combatIntensity: 1 },
    });
    expect(overrides.contentBindings?.canonicalModelInstances).toEqual([
      {
        id: "entity-instance.unit",
        name: "Unit",
        modelId: "entity.unit",
        canonical: true,
      },
    ]);
    expect(overrides.levelContent?.levels).toHaveLength(1);
    expect(overrides.levelContent?.dungeonRuns).toHaveLength(1);
  });
});
