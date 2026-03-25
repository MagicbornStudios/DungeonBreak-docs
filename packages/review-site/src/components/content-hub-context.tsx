"use client";

import { createContext, useContext } from "react";

export type ContentHubApi = {
  allPacks: Record<string, unknown> | null;
  openPack: (packKey: string, listFilter?: string) => void;
};

export const ContentHubContext = createContext<ContentHubApi | null>(null);

export function useContentHub(): ContentHubApi | null {
  return useContext(ContentHubContext);
}
