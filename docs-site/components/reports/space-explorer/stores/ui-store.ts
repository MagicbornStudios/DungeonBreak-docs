"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type RuntimeSpaceView =
  | "content-combined"
  | "content-skill"
  | "content-dialogue"
  | "content-archetype"
  | "action"
  | "event"
  | "effect";

type ContentSpaceKey =
  | "content-combined"
  | "content-dialogue"
  | "content-skill"
  | "content-archetype";

type DistanceAlgorithm = "game-default" | "euclidean" | "cosine";
type ColorBy = "branch" | "type" | "cluster";

export type SpaceExplorerUiState = {
  vizMode: "3d" | "2d" | "json" | "deltas";
  colorBy: ColorBy;
  distanceAlgorithm: DistanceAlgorithm;
  nearestK: number;
  runtimeSpaceView: RuntimeSpaceView;
  spaceFeatureMap: Record<ContentSpaceKey, string[]>;
  customFeatureValues: Record<string, number>;
  customFeatureLabels: Record<string, string>;
  movementFeatureIds: string[];
  scopeRootModelId: string | null;
  hiddenModelIds: string[];
  collapsedDepths: number[];
  setVizMode: (next: "3d" | "2d" | "json" | "deltas") => void;
  setColorBy: (next: ColorBy) => void;
  setDistanceAlgorithm: (next: DistanceAlgorithm) => void;
  setNearestK: (next: number) => void;
  setRuntimeSpaceView: (next: RuntimeSpaceView) => void;
  setSpaceFeatureMap: (
    next:
      | Record<ContentSpaceKey, string[]>
      | ((prev: Record<ContentSpaceKey, string[]>) => Record<ContentSpaceKey, string[]>)
  ) => void;
  setCustomFeatureValues: (
    next:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  setCustomFeatureLabels: (
    next:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>)
  ) => void;
  setMovementFeatureIds: (next: string[] | ((prev: string[]) => string[])) => void;
  setScopeRootModelId: (next: string | null) => void;
  setHiddenModelIds: (next: string[] | ((prev: string[]) => string[])) => void;
  setCollapsedDepths: (next: number[] | ((prev: number[]) => number[])) => void;
};

const DEFAULT_SPACE_FEATURES: Record<ContentSpaceKey, string[]> = {
  "content-combined": [],
  "content-dialogue": [],
  "content-skill": [],
  "content-archetype": [],
};

const MOVEMENT_CONTROL_NAMES = ["Effort", "Momentum"] as const;

export const useSpaceExplorerUiStore = create<SpaceExplorerUiState>()(
  devtools(
    persist(
      immer<SpaceExplorerUiState>((set) => ({
        vizMode: "2d",
        colorBy: "branch",
        distanceAlgorithm: "game-default",
        nearestK: 10,
        runtimeSpaceView: "content-combined",
        spaceFeatureMap: DEFAULT_SPACE_FEATURES,
        customFeatureValues: {},
        customFeatureLabels: {},
        movementFeatureIds: [...MOVEMENT_CONTROL_NAMES],
        scopeRootModelId: null,
        hiddenModelIds: [],
        collapsedDepths: [],
        setVizMode: (next) =>
          set((state) => {
            state.vizMode = next;
          }),
        setColorBy: (next) =>
          set((state) => {
            state.colorBy = next;
          }),
        setDistanceAlgorithm: (next) =>
          set((state) => {
            state.distanceAlgorithm = next;
          }),
        setNearestK: (next) =>
          set((state) => {
            state.nearestK = Math.max(1, Math.min(50, next));
          }),
        setRuntimeSpaceView: (next) =>
          set((state) => {
            state.runtimeSpaceView = next;
          }),
        setSpaceFeatureMap: (next) =>
          set((state) => {
            state.spaceFeatureMap =
              typeof next === "function" ? next(state.spaceFeatureMap) : next;
          }),
        setCustomFeatureValues: (next) =>
          set((state) => {
            state.customFeatureValues =
              typeof next === "function"
                ? next(state.customFeatureValues)
                : next;
          }),
        setCustomFeatureLabels: (next) =>
          set((state) => {
            state.customFeatureLabels =
              typeof next === "function"
                ? next(state.customFeatureLabels)
                : next;
          }),
        setMovementFeatureIds: (next) =>
          set((state) => {
            state.movementFeatureIds =
              typeof next === "function" ? next(state.movementFeatureIds) : next;
          }),
        setScopeRootModelId: (next) =>
          set((state) => {
            state.scopeRootModelId = next;
          }),
        setHiddenModelIds: (next) =>
          set((state) => {
            state.hiddenModelIds =
              typeof next === "function" ? next(state.hiddenModelIds) : next;
          }),
        setCollapsedDepths: (next) =>
          set((state) => {
            state.collapsedDepths =
              typeof next === "function" ? next(state.collapsedDepths) : next;
          }),
      })),
      {
        name: "space-explorer-ui-v1",
        partialize: (state) => ({
          vizMode: state.vizMode,
          colorBy: state.colorBy,
          distanceAlgorithm: state.distanceAlgorithm,
          nearestK: state.nearestK,
          runtimeSpaceView: state.runtimeSpaceView,
          spaceFeatureMap: state.spaceFeatureMap,
          customFeatureValues: state.customFeatureValues,
          customFeatureLabels: state.customFeatureLabels,
          movementFeatureIds: state.movementFeatureIds,
          scopeRootModelId: state.scopeRootModelId,
          hiddenModelIds: state.hiddenModelIds,
          collapsedDepths: state.collapsedDepths,
        }),
      }
    ),
    { name: "space-explorer-ui-store" }
  )
);
