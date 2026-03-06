"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { DeliveryPullResponse } from "@/lib/space-explorer-shared";

export type ContentDeliveryState = {
  versionDraft: string;
  pluginVersion: string;
  runtimeVersion: string;
  busy: boolean;
  lastPublishedVersion: string | null;
  lastPulledVersion: string | null;
  selection: DeliveryPullResponse | null;
  setVersionDraft: (next: string) => void;
  setPluginVersion: (next: string) => void;
  setRuntimeVersion: (next: string) => void;
  setBusy: (next: boolean) => void;
  setLastPublishedVersion: (next: string | null) => void;
  setLastPulledVersion: (next: string | null) => void;
  setSelection: (next: DeliveryPullResponse | null) => void;
};

export const useContentDeliveryStore = create<ContentDeliveryState>()(
  devtools(
    persist(
      immer<ContentDeliveryState>((set) => ({
        versionDraft: `local-${new Date().toISOString().slice(0, 10)}`,
        pluginVersion: "1.0.0",
        runtimeVersion: "UE5.4",
        busy: false,
        lastPublishedVersion: null,
        lastPulledVersion: null,
        selection: null,
        setVersionDraft: (next) =>
          set((state) => {
            state.versionDraft = next;
          }),
        setPluginVersion: (next) =>
          set((state) => {
            state.pluginVersion = next;
          }),
        setRuntimeVersion: (next) =>
          set((state) => {
            state.runtimeVersion = next;
          }),
        setBusy: (next) =>
          set((state) => {
            state.busy = next;
          }),
        setLastPublishedVersion: (next) =>
          set((state) => {
            state.lastPublishedVersion = next;
          }),
        setLastPulledVersion: (next) =>
          set((state) => {
            state.lastPulledVersion = next;
          }),
        setSelection: (next) =>
          set((state) => {
            state.selection = next;
          }),
      })),
      {
        name: "space-explorer-delivery-v1",
        partialize: (state) => ({
          versionDraft: state.versionDraft,
          pluginVersion: state.pluginVersion,
          runtimeVersion: state.runtimeVersion,
          lastPublishedVersion: state.lastPublishedVersion,
          lastPulledVersion: state.lastPulledVersion,
        }),
      }
    ),
    { name: "space-explorer-delivery-store" }
  )
);
