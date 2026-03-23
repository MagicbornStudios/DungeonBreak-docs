import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/app-content/dashboard-shell";

export const metadata = {
  title: "DungeonBreak Portal",
  description: "Internal asset authoring, AI-assisted schema management, and content pipeline operations for DungeonBreak.",
};

export default function DungeonBreakContentAppLayout({ children }: { children: ReactNode }) {
  return <AppDashboardShell>{children}</AppDashboardShell>;
}
