"use client";

import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DungeonbreakContentAppOverviewPage() {
  const tabs = [
    {
      id: "space",
      label: "Space Explorer",
      href: "/dungeonbreak-content-app/space-explorer",
      desc: "Vector controls, event/effect models, behavior similarity lenses.",
      keywords: ["traits", "events", "behaviors"],
    },
    {
      id: "dungeon",
      label: "DungeonExplorer",
      href: "/dungeonbreak-content-app/dungeon-explorer",
      desc: "Rooms, levels, effects per tile, 3D scatter of dungeon-space points.",
      keywords: ["rooms", "levels", "visualization"],
    },
    {
      id: "content",
      label: "Content Packs",
      href: "/dungeonbreak-content-app/content",
      desc: "Bundles, schema metrics, agent ingestion, Dolt-powered patches.",
      keywords: ["ingest", "Dolt", "schema"],
    },
    {
      id: "game",
      label: "Game Value",
      href: "/dungeonbreak-content-app/game-value",
      desc: "Game value reports, agent policy metrics, replayability signals.",
      keywords: ["value", "agent", "reports"],
    },
    {
      id: "migrations",
      label: "Migrations",
      href: "/dungeonbreak-content-app/migrations",
      desc: "Versioned transforms and migration notes for content packs.",
      keywords: ["compatibility", "history"],
    },
  ];
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const quickStats = useMemo(
    () => [
      { label: "Content Features", value: "10", hint: "trait axes" },
      { label: "Power Features", value: "5", hint: "navigation stats" },
      { label: "Semantics", value: "9", hint: "latent axes" },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>DungeonBreak Content App</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          We model dungeons as points in separable metric feature spaces and the app surfaces the orchestrated spaces you can author: content features, power features, rooms, levels, and behaviors.
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="outline"
                size="sm"
                className={`text-xs tracking-widest ${activeTab === tab.id ? "border-primary text-primary" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <Card className="border-border/60 bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">{currentTab.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>{currentTab.desc}</p>
              <div className="flex flex-wrap gap-2">
                {currentTab.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {keyword}
                  </span>
                ))}
              </div>
              <Link href={currentTab.href} className="text-primary text-[11px] font-semibold underline">
                Open {currentTab.label}
              </Link>
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-3">
            {quickStats.map((stat) => (
              <Card key={stat.label} className="rounded border border-border/60 bg-background/60 px-4 py-3">
                <div className="text-[10px] uppercase text-muted-foreground">{stat.label}</div>
                <div className="text-2xl font-semibold">{stat.value}</div>
                <p className="text-[10px] text-muted-foreground">{stat.hint}</p>
              </Card>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Card className="bg-background/70">
            <CardHeader>
              <CardTitle>Operational Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>Ingest steps: drop JSON into <code>docs-site/content-packs/inbox</code>, run <code>pnpm --dir docs-site run content:ingest</code>, and Kaplay auto-updates via <code>/game/content-pack.bundle.v1.json</code>.</p>
              <p>Optional Dolt table: set <code>CONTENT_PACK_DOLT_PATH</code> and keep a <code>content_pack_patches</code> table for automated patch ingestion.</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Next focus</p>
              <p className="text-[11px]">
                Tighten UX labeling in Space Explorer (tabs, tooltips) and create a navigation layer in the docs site shell so other docs (Play, Reports) contextually link to this workspace.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-background/70">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs">
              {tabs.map((tab) => (
                <Link key={tab.id} href={tab.href} className="flex items-center justify-between rounded border border-border px-3 py-2 text-muted-foreground hover:border-primary hover:text-primary">
                  <span>{tab.label}</span>
                  <ArrowUpRightIcon className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
