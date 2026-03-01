import type { KAPLAYCtx } from "kaplay";
import { addHeader, addTabBar, PAD } from "./shared";

type FrameOptions = {
  width: number;
  title: string;
  subtitle: string;
  tabs?: readonly string[];
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
};

export function beginSceneFrame(k: KAPLAYCtx, options: FrameOptions): number {
  let y = addHeader(k, options.width, options.title, options.subtitle);
  if (options.tabs && options.tabs.length > 0 && options.activeTab && options.onSelectTab) {
    y = addTabBar(k, PAD, y, options.tabs, options.activeTab, options.onSelectTab);
    y += 2;
  }
  return y;
}

