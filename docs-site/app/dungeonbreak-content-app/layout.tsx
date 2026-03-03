import type { ReactNode } from "react";

import { AppDashboardShell } from "@/components/app-content/dashboard-shell";

export const metadata = {
  title: "DungeonBreak Content App",
  description: "Author content packs, explore vector spaces, and inspect dungeon layouts.",
};

export default function DungeonBreakContentAppLayout({ children }: { children: ReactNode }) {
  return <AppDashboardShell>{children}</AppDashboardShell>;
}
