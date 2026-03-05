"use client";

import { PackageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useActiveContentPack } from "@/components/app-content/use-active-content-pack";

export function ActiveContentPackBadge() {
  const snapshot = useActiveContentPack();
  if (!snapshot) {
    return <Badge variant="outline">Pack: default</Badge>;
  }

  return (
    <Badge variant="secondary" title={snapshot.identity.source}>
      <PackageIcon className="mr-1 size-3" />
      {snapshot.identity.packId}@{snapshot.identity.packVersion}
    </Badge>
  );
}

