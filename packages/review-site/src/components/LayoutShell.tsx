"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Database,
  FlaskConical,
  LayoutDashboard,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type * as React from "react";
import type { ReviewTab } from "@/lib/tab-href";
import { tabHref } from "@/lib/tab-href";
import { cn } from "@/lib/utils";

const tabs: {
  id: ReviewTab;
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Game build, coverage, and quick links",
    Icon: LayoutDashboard,
  },
  {
    id: "tests",
    label: "Tests",
    description: "Vitest and Playwright detail with highlighted snippets",
    Icon: FlaskConical,
  },
  {
    id: "guides",
    label: "Guides",
    description: "Where reports come from and design references",
    Icon: BookOpen,
  },
  {
    id: "data",
    label: "Game data",
    description: "Bundled content pack and schema footprint",
    Icon: Database,
  },
];

function pathnameToSegment(pathname: string): ReviewTab {
  if (pathname.includes("/tests")) {
    return "tests";
  }
  if (pathname.includes("/guides")) {
    return "guides";
  }
  if (pathname.includes("/game-data")) {
    return "data";
  }
  if (pathname.includes("/content-graphs")) {
    return "data";
  }
  return "overview";
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathnameToSegment(pathname ?? "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-border border-b bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              DungeonBreak
            </p>
            <p className="font-semibold text-lg tracking-tight">
              Static review hub
            </p>
          </div>
          <nav aria-label="Primary" className="flex flex-wrap gap-1">
            {tabs.map(({ id, label, description, Icon }) => (
              <a
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
                  active === id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                href={tabHref(id, active)}
                key={id}
                title={description}
              >
                <Icon aria-hidden className="size-4 shrink-0 opacity-90" />
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
