import { describe, expect, test } from "vitest";
import {
  ENGINE_RUNTIME_FEATURE_STAT_SET_ID,
  ENGINE_RUNTIME_TRAIT_STAT_SET_ID,
  getFeatureValueFromStatSets,
  setFeatureValueInStatSets,
  toEngineRuntimeStatMaps,
} from "@/components/reports/space-explorer/stat-set-state";

describe("space explorer stat-set state", () => {
  test("resolves feature ownership across generic stat sets", () => {
    const statSetValuesById = {
      [ENGINE_RUNTIME_TRAIT_STAT_SET_ID]: {
        Awareness: 0.25,
      },
      [ENGINE_RUNTIME_FEATURE_STAT_SET_ID]: {
        Momentum: 20,
      },
      "custom.stats": {
        Focus: 0.5,
      },
    };
    const statSetDeltaValuesById = {
      "custom.stats": {
        Focus: 0.1,
      },
    };

    expect(
      getFeatureValueFromStatSets({
        featureId: "Focus",
        statSetValuesById,
        statSetDeltaValuesById,
      })
    ).toBe(0.5);

    expect(
      setFeatureValueInStatSets({
        featureId: "Focus",
        value: 0.9,
        statSetValuesById,
        statSetDeltaValuesById,
      })
    ).toEqual({
      ...statSetValuesById,
      "custom.stats": {
        Focus: 0.9,
      },
    });
  });

  test("builds runtime trait and feature maps from generic stat sets", () => {
    expect(
      toEngineRuntimeStatMaps(
        {
          [ENGINE_RUNTIME_TRAIT_STAT_SET_ID]: {
            Awareness: 0.25,
          },
          [ENGINE_RUNTIME_FEATURE_STAT_SET_ID]: {
            Momentum: 18,
          },
        },
        {
          [ENGINE_RUNTIME_TRAIT_STAT_SET_ID]: {
            Awareness: 0.1,
          },
          [ENGINE_RUNTIME_FEATURE_STAT_SET_ID]: {
            Momentum: 2,
          },
        }
      )
    ).toEqual({
      traits: {
        Awareness: 0.35,
      },
      features: {
        Momentum: 20,
      },
    });
  });
});
