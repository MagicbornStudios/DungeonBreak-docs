"use client";

import type { ComponentProps } from "react";
import { ContentCreatorTree } from "@/components/reports/content-creator/tree-view";
import { ContentCreatorSchemaEditorPanel } from "@/components/reports/content-creator/schema-editor-panel";

type TreeProps = ComponentProps<typeof ContentCreatorTree>;
type SchemaEditorProps = ComponentProps<typeof ContentCreatorSchemaEditorPanel>;

export function ContentCreatorSidebarContent(props: {
  activeNavigatorMode: "tree" | "json";
  treeProps: TreeProps;
  schemaEditorProps: SchemaEditorProps;
}) {
  const { activeNavigatorMode, treeProps, schemaEditorProps } = props;

  return (
    <div
      className={`min-h-0 flex-1 rounded border border-border bg-background/40 p-1 ${
        activeNavigatorMode === "json" ? "overflow-auto" : "overflow-y-auto"
      }`}
    >
      {activeNavigatorMode === "tree" ? (
        <ContentCreatorTree {...treeProps} />
      ) : (
        <ContentCreatorSchemaEditorPanel {...schemaEditorProps} />
      )}
    </div>
  );
}

