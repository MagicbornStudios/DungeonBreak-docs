"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { canonicalizeModelIdRaw } from "@/lib/space-explorer-schema";
import type { SchemaLanguage } from "@/lib/space-explorer-schema";

const NO_MODEL_SELECTED = "__none__";

type ModelInstanceBindingLike = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

type ModelMigrationOpLike = {
  id: string;
  instanceId: string;
  fromModelId: string;
  toModelId: string;
  at: string;
};

type ModelSchemaViewerState = {
  activeModelSchemaId: string;
  activeModelInstanceId: string | null;
  schemaLanguage: SchemaLanguage;
  modelInstances: ModelInstanceBindingLike[];
  migrationOps: ModelMigrationOpLike[];
  initFromSchemas: (
    schemas: Array<{ modelId: string }>,
    inferredKaelModelId: string
  ) => void;
  ensureKaelBinding: (modelId: string) => void;
  setActiveSelection: (modelId: string, instanceId: string | null) => void;
  setSchemaLanguage: (language: SchemaLanguage) => void;
  addCanonicalAsset: (modelId: string, name?: string) => void;
  toggleCanonical: (instanceId: string) => void;
  renameModelInstance: (instanceId: string, name: string) => void;
  deleteModelInstance: (instanceId: string) => void;
  moveInstancesToModel: (instanceIds: string[], toModelId: string) => void;
  clearMigrationOps: () => void;
  replaceModelInstances: (instances: ModelInstanceBindingLike[]) => void;
};

export const useModelSchemaViewerStore = create<ModelSchemaViewerState>()(
  devtools(
    persist(
      immer<ModelSchemaViewerState>((set) => ({
        activeModelSchemaId: "",
        activeModelInstanceId: null,
        schemaLanguage: "typescript",
        modelInstances: [],
        migrationOps: [],
        initFromSchemas: (schemas, _inferredKaelModelId) =>
          set((state) => {
            state.modelInstances = state.modelInstances.map((row) => ({
              ...row,
              modelId: canonicalizeModelIdRaw(row.modelId),
            }));
            if (
              !state.activeModelSchemaId ||
              (state.activeModelSchemaId !== NO_MODEL_SELECTED &&
                !schemas.some((row) => row.modelId === state.activeModelSchemaId))
            ) {
              state.activeModelSchemaId = NO_MODEL_SELECTED;
              state.activeModelInstanceId = null;
            }
          }),
        ensureKaelBinding: (modelId) =>
          set((state) => {
            if (!modelId || modelId === "none") return;
            const idx = state.modelInstances.findIndex(
              (row) => row.id === "entity-instance.kael"
            );
            if (idx >= 0) {
              state.modelInstances[idx]!.modelId = modelId;
              return;
            }
            state.modelInstances.unshift({
              id: "entity-instance.kael",
              name: "Kael",
              modelId,
              canonical: true,
            });
          }),
        setActiveSelection: (modelId, instanceId) =>
          set((state) => {
            state.activeModelSchemaId = modelId;
            state.activeModelInstanceId = instanceId;
          }),
        setSchemaLanguage: (language) =>
          set((state) => {
            state.schemaLanguage = language;
          }),
        addCanonicalAsset: (modelId, name) =>
          set((state) => {
            const base = modelId.replace(/\./g, "_");
            const index =
              state.modelInstances.filter((row) => row.modelId === modelId).length +
              1;
            state.modelInstances.push({
              id: `${base}-asset-${Date.now()}-${index}`,
              name:
                name?.trim() || `${modelId.split(".")[0] ?? "asset"}_asset_${index}`,
              modelId,
              canonical: true,
            });
          }),
        toggleCanonical: (instanceId) =>
          set((state) => {
            const row = state.modelInstances.find((item) => item.id === instanceId);
            if (!row) return;
            row.canonical = !row.canonical;
          }),
        renameModelInstance: (instanceId, name) =>
          set((state) => {
            const row = state.modelInstances.find((item) => item.id === instanceId);
            if (!row) return;
            const nextName = name.trim();
            if (!nextName) return;
            row.name = nextName;
          }),
        deleteModelInstance: (instanceId) =>
          set((state) => {
            state.modelInstances = state.modelInstances.filter(
              (item) => item.id !== instanceId
            );
            if (state.activeModelInstanceId === instanceId)
              state.activeModelInstanceId = null;
          }),
        moveInstancesToModel: (instanceIds, toModelId) =>
          set((state) => {
            for (const instanceId of instanceIds) {
              const row = state.modelInstances.find((item) => item.id === instanceId);
              if (!row || row.modelId === toModelId) continue;
              state.migrationOps.push({
                id: `${instanceId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                instanceId,
                fromModelId: row.modelId,
                toModelId,
                at: new Date().toISOString(),
              });
              row.modelId = toModelId;
            }
          }),
        clearMigrationOps: () =>
          set((state) => {
            state.migrationOps = [];
          }),
        replaceModelInstances: (instances) =>
          set((state) => {
            state.modelInstances = instances.map((row) => ({
              ...row,
              modelId: canonicalizeModelIdRaw(row.modelId),
            }));
          }),
      })),
      {
        name: "space-explorer-model-viewer-v1",
        partialize: (state) => ({
          activeModelSchemaId: state.activeModelSchemaId,
          activeModelInstanceId: state.activeModelInstanceId,
          schemaLanguage: state.schemaLanguage,
          modelInstances: state.modelInstances,
          migrationOps: state.migrationOps,
        }),
      }
    ),
    { name: "space-explorer-model-schema-viewer-store" }
  )
);
