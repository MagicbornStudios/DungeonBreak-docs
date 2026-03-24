import type { TestReviewCategory } from "@docs/lib/test-report-review";
import type { LucideIcon } from "lucide-react";
import { Activity, Bot, Box, Braces, FolderOpen, Gamepad2 } from "lucide-react";
import { categoryLabels } from "../categories";

const CATEGORY_ICONS: Record<TestReviewCategory, LucideIcon> = {
  "asset-explorer": FolderOpen,
  "game-runtime": Gamepad2,
  performance: Activity,
  "schema-data-codegen": Braces,
  "assistant-mcp": Bot,
  other: Box,
};

export function CategorySectionTitle({
  category,
}: {
  category: TestReviewCategory;
}) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground text-lg tracking-tight">
      <Icon aria-hidden className="size-5 shrink-0 text-primary" />
      {categoryLabels[category]}
    </h2>
  );
}
