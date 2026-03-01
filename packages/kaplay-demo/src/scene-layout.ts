import type { KAPLAYCtx } from "kaplay";
import { addHeader, addTabBar, PAD } from "./shared";

export type SceneLayout = {
  width: number;
  title: string;
  subtitle: string;
  tabs?: readonly string[];
};

export type SceneLayoutState = {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
};

export function renderSceneLayout(k: KAPLAYCtx, layout: SceneLayout, state?: SceneLayoutState): number {
  let y = addHeader(k, layout.width, layout.title, layout.subtitle);
  if (layout.tabs && layout.tabs.length > 0 && state?.activeTab && state.onSelectTab) {
    y = addTabBar(k, PAD, y, layout.tabs, state.activeTab, state.onSelectTab);
    y += 2;
  }
  return y;
}

