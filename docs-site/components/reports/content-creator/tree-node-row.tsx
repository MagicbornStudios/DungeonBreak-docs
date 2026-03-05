"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import {
  IconBraces as BracesIcon,
  IconChartBar as BarChart3Icon,
  IconChevronDown as ChevronDownIcon,
  IconChevronRight as ChevronRightIcon,
  IconFileCode as FileCode2Icon,
  IconFolder as FolderTreeIcon,
  IconHierarchy3 as BoxesIcon,
  IconPackage as PackageIcon,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";

type TreeSectionTone = "none" | "stats" | "models" | "canonical";

type TreeNodeRowProps = {
  node: ContentCreatorTreeNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  selected: boolean;
  nextTone: TreeSectionTone;
  depthClass: string;
  expandedClass: string;
  childCount: number;
  attachedStatIds: string[];
  isCanonicalModelNode: boolean;
  isStatsModelNode: boolean;
  statColorByModelId: Map<string, string>;
  toneTextClasses: Record<TreeSectionTone, string>;
  onSelectNode: (node: ContentCreatorTreeNode, hasChildren: boolean) => void;
  onToggleNode: (nodeId: string) => void;
} & Omit<ComponentPropsWithoutRef<"div">, "onClick">;

export const TreeNodeRow = forwardRef<HTMLDivElement, TreeNodeRowProps>(function TreeNodeRow({
  node,
  depth,
  hasChildren,
  expanded,
  selected,
  nextTone,
  depthClass,
  expandedClass,
  childCount,
  attachedStatIds,
  isCanonicalModelNode,
  isStatsModelNode,
  statColorByModelId,
  toneTextClasses,
  onSelectNode,
  onToggleNode,
  className,
  ...props
}, ref) {
  return (
    <div
      ref={ref}
      key={node.id}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs",
        selected ? "bg-primary/15 text-primary" : `${toneTextClasses[nextTone]} ${depthClass} ${expandedClass}`,
        className,
      )}
      style={{ paddingLeft: `${6 + depth * 14}px` }}
      onClick={() => onSelectNode(node, hasChildren)}
      {...props}
    >
      <button
        type="button"
        className={`inline-flex h-4 w-4 items-center justify-center rounded ${hasChildren ? "hover:bg-muted/40" : "opacity-0"}`}
        onClick={(event) => {
          event.stopPropagation();
          if (hasChildren) onToggleNode(node.id);
        }}
        tabIndex={-1}
      >
        {hasChildren ? (
          expanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />
        ) : null}
      </button>
      {node.id === "group:stats" ? (
        <BarChart3Icon className="h-3.5 w-3.5" />
      ) : node.id === "group:models" ? (
        <BoxesIcon className="h-3.5 w-3.5" />
      ) : node.id === "group:canonical" ? (
        <PackageIcon className="h-3.5 w-3.5" />
      ) : isCanonicalModelNode ? (
        <FolderTreeIcon className="h-3.5 w-3.5" />
      ) : node.nodeType === "group" || node.nodeType === "object-group" || node.nodeType === "model-group" ? (
        <FolderTreeIcon className="h-3.5 w-3.5" />
      ) : node.nodeType === "object" ? (
        <BracesIcon className="h-3.5 w-3.5" />
      ) : (
        <FileCode2Icon className="h-3.5 w-3.5" />
      )}
      {isStatsModelNode ? (
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: statColorByModelId.get(node.modelId ?? "") ?? "hsl(195, 85%, 62%)" }}
          title={node.modelId ?? "stat"}
        />
      ) : null}
      <span className="truncate">{node.name}</span>
      <div className="ml-auto inline-flex items-center gap-1">
        {attachedStatIds.slice(0, 4).map((statId) => (
          <span
            key={`${node.id}:attached-stat:${statId}`}
            className="inline-block size-2 rounded-full border border-black/20"
            style={{ backgroundColor: statColorByModelId.get(statId) ?? "hsl(195, 85%, 62%)" }}
            title={`Attached stat set: ${statId}`}
          />
        ))}
        {attachedStatIds.length > 4 ? (
          <span className="rounded border border-border bg-background/60 px-1 text-[9px] font-mono text-muted-foreground">
            +{attachedStatIds.length - 4}
          </span>
        ) : null}
        {hasChildren ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded border border-border bg-background/60 px-1 text-[10px] font-mono text-muted-foreground">
            {childCount}
          </span>
        ) : null}
        {node.nodeType === "instance" && node.canonical ? (
          <span className="rounded bg-amber-500/20 px-1 text-[10px] text-amber-100">C</span>
        ) : null}
      </div>
    </div>
  );
});
