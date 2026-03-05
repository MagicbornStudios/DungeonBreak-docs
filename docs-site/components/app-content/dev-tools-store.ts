"use client";

import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

export type TestModeBundleSource = "default" | "empty";
export type DevToolbarCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface DevToolsState {
  testModeEnabled: boolean;
  testModeBundleSource: TestModeBundleSource;
  showUiIds: boolean;
  codexAutoConnect: boolean;
  planningApiMockMode: boolean;
  toolbarCollapsed: boolean;
  toolbarCorner: DevToolbarCorner;
  setTestModeEnabled: (value: boolean) => void;
  setTestModeBundleSource: (value: TestModeBundleSource) => void;
  setShowUiIds: (value: boolean) => void;
  setCodexAutoConnect: (value: boolean) => void;
  setPlanningApiMockMode: (value: boolean) => void;
  setToolbarCollapsed: (value: boolean) => void;
  setToolbarCorner: (value: DevToolbarCorner) => void;
}

export const useDevToolsStore = create<DevToolsState>()(
  devtools(
    persist(
      (set) => ({
        testModeEnabled: true,
        testModeBundleSource: "default",
        showUiIds: false,
        codexAutoConnect: true,
        planningApiMockMode: false,
        toolbarCollapsed: false,
        toolbarCorner: "bottom-right",
        setTestModeEnabled: (value) => set({ testModeEnabled: value }),
        setTestModeBundleSource: (value) =>
          set({ testModeBundleSource: value }),
        setShowUiIds: (value) => set({ showUiIds: value }),
        setCodexAutoConnect: (value) => set({ codexAutoConnect: value }),
        setPlanningApiMockMode: (value) => set({ planningApiMockMode: value }),
        setToolbarCollapsed: (value) => set({ toolbarCollapsed: value }),
        setToolbarCorner: (value) => set({ toolbarCorner: value }),
      }),
      {
        name: "db-dev-tools-v1",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          testModeEnabled: state.testModeEnabled,
          testModeBundleSource: state.testModeBundleSource,
          showUiIds: state.showUiIds,
          codexAutoConnect: state.codexAutoConnect,
          planningApiMockMode: state.planningApiMockMode,
          toolbarCollapsed: state.toolbarCollapsed,
          toolbarCorner: state.toolbarCorner,
        }),
      }
    ),
    { name: "db-dev-tools-store" }
  )
);
