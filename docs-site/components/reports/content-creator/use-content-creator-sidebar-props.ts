"use client";

import { useMemo, type ComponentProps } from "react";
import { ContentCreatorSidebarContent } from "@/components/reports/content-creator/sidebar-content";

type SidebarProps = ComponentProps<typeof ContentCreatorSidebarContent>;

export function useContentCreatorSidebarProps(params: {
  activeNavigatorMode: "tree" | "json";
  treeProps: SidebarProps["treeProps"];
  schemaEditorProps: SidebarProps["schemaEditorProps"];
}) {
  const { activeNavigatorMode, treeProps, schemaEditorProps } = params;

  return useMemo(
    () => ({
      activeNavigatorMode,
      treeProps,
      schemaEditorProps,
    }),
    [activeNavigatorMode, treeProps, schemaEditorProps],
  );
}

