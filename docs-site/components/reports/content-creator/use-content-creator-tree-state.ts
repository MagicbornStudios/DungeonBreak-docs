"use client";

import { useState } from "react";

export function useContentCreatorTreeState() {
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string>("");
  const [expandedTreeNodeIds, setExpandedTreeNodeIds] = useState<Record<string, boolean>>({
    "group:stats": true,
    "group:models": true,
    "group:canonical": true,
    "group:objects": true,
  });

  const toggleTreeNode = (nodeId: string) => {
    setExpandedTreeNodeIds((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };
  const isExpanded = (nodeId: string) => !!expandedTreeNodeIds[nodeId];

  return {
    selectedTreeNodeId,
    expandedTreeNodeIds,
    setSelectedTreeNodeId,
    setExpandedTreeNodeIds,
    toggleTreeNode,
    isExpanded,
  };
}
