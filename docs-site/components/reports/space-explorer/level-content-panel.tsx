"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconBuildingStore as BuildingIcon,
  IconMapPin as MapPinIcon,
  IconRoute as RouteIcon,
  IconSitemap as SitemapIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

type LevelBrowserPayload = {
  runs?: Array<{
    runId: string;
    title: string;
    levelCount: number;
    levelIds: string[];
    startLevelId: string;
    escapeLevelId: string;
  }>;
  levels?: Array<{
    levelId: string;
    name: string;
    kind: string;
    theme?: string;
    summary?: string;
    tags?: string[];
    connectionCount: number;
    structure: {
      townCount: number;
      districtCount: number;
      buildingCount: number;
      roomCount: number;
      siteCount: number;
      wildernessZoneCount: number;
      outskirtsZoneCount: number;
      dungeonEntranceCount: number;
    };
    content: {
      entityRefCount: number;
      contentRefCount: number;
      dialogueRefCount: number;
      questRefCount: number;
    };
    rules?: Record<string, string>;
    visualHints?: Record<string, string>;
  }>;
};

type LevelContentPanelProps = {
  payload: LevelBrowserPayload | null;
};

type BrowserLevel = NonNullable<LevelBrowserPayload["levels"]>[number];

function formatKindLabel(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeKinds(levels: BrowserLevel[]): string {
  return [...new Set(levels.map((level) => level.kind))]
    .map(formatKindLabel)
    .join(", ");
}

function toSummaryRows(level: BrowserLevel) {
  return [
    { label: "Towns", value: level.structure.townCount },
    { label: "Districts", value: level.structure.districtCount },
    { label: "Buildings", value: level.structure.buildingCount },
    { label: "Rooms", value: level.structure.roomCount },
    { label: "Sites", value: level.structure.siteCount },
    { label: "Wilderness", value: level.structure.wildernessZoneCount },
    { label: "Outskirts", value: level.structure.outskirtsZoneCount },
    { label: "Entrances", value: level.structure.dungeonEntranceCount },
  ];
}

function toContentRows(level: BrowserLevel) {
  return [
    { label: "Entities", value: level.content.entityRefCount },
    { label: "Content", value: level.content.contentRefCount },
    { label: "Dialogue", value: level.content.dialogueRefCount },
    { label: "Quests", value: level.content.questRefCount },
    { label: "Connections", value: level.connectionCount },
  ];
}

function mapEntries(value?: Record<string, string>) {
  return Object.entries(value ?? {}).filter(([, entry]) => entry.length > 0);
}

export function LevelContentPanel({ payload }: LevelContentPanelProps) {
  const runs = useMemo(() => payload?.runs ?? [], [payload]);
  const levels = useMemo(() => payload?.levels ?? [], [payload]);
  const [selectedRunId, setSelectedRunId] = useState<string>("all");
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");

  const filteredLevels = useMemo(() => {
    if (selectedRunId === "all") return levels;
    const run = runs.find((row) => row.runId === selectedRunId);
    if (!run) return levels;
    const levelIdSet = new Set(run.levelIds);
    return levels.filter((level) => levelIdSet.has(level.levelId));
  }, [levels, runs, selectedRunId]);

  useEffect(() => {
    if (runs.length === 0) {
      setSelectedRunId("all");
      return;
    }
    if (
      selectedRunId !== "all" &&
      !runs.some((run) => run.runId === selectedRunId)
    ) {
      setSelectedRunId(runs[0]?.runId ?? "all");
    }
  }, [runs, selectedRunId]);

  useEffect(() => {
    if (filteredLevels.length === 0) {
      setSelectedLevelId("");
      return;
    }
    if (!filteredLevels.some((level) => level.levelId === selectedLevelId)) {
      setSelectedLevelId(filteredLevels[0]?.levelId ?? "");
    }
  }, [filteredLevels, selectedLevelId]);

  const selectedRun =
    selectedRunId === "all"
      ? null
      : runs.find((run) => run.runId === selectedRunId) ?? null;
  const selectedLevel =
    filteredLevels.find((level) => level.levelId === selectedLevelId) ?? null;

  if (levels.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <SitemapIcon className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Level Content</h3>
            <p className="text-xs text-muted-foreground">
              No authored levels are available in the active content bundle.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SitemapIcon className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Level Content</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Shared authored topology for Escape the Dungeon and the DungeonBreak
            extension path.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-border/70 bg-muted/40 px-2 py-1.5">
            <div className="font-semibold text-foreground">{levels.length}</div>
            <div className="text-muted-foreground">Levels</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/40 px-2 py-1.5">
            <div className="font-semibold text-foreground">{runs.length}</div>
            <div className="text-muted-foreground">Runs</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/40 px-2 py-1.5">
            <div className="font-semibold text-foreground">
              {[...new Set(levels.map((level) => level.kind))].length}
            </div>
            <div className="text-muted-foreground">Kinds</div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border/70 bg-muted/30 p-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Kinds:</span>{" "}
        {summarizeKinds(levels)}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Run</span>
        <select
          value={selectedRunId}
          onChange={(event) => setSelectedRunId(event.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
        >
          <option value="all">All levels</option>
          {runs.map((run) => (
            <option key={run.runId} value={run.runId}>
              {run.title}
            </option>
          ))}
        </select>
        {selectedRun ? (
          <span className="rounded border border-border bg-background px-2 py-1 text-[11px] text-foreground">
            Start {selectedRun.startLevelId} to escape {selectedRun.escapeLevelId}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border/70 bg-muted/20 p-2">
          {filteredLevels.map((level) => {
            const isSelected = level.levelId === selectedLevelId;
            return (
              <Button
                key={level.levelId}
                type="button"
                variant="ghost"
                onClick={() => setSelectedLevelId(level.levelId)}
                className={`h-auto w-full justify-start rounded-lg border px-2 py-2 text-left ${
                  isSelected
                    ? "border-primary/50 bg-primary/10"
                    : "border-transparent hover:border-border hover:bg-background"
                }`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-foreground">
                      {level.name}
                    </span>
                    <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {formatKindLabel(level.kind)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span>{level.structure.roomCount} rooms</span>
                    <span>{level.structure.buildingCount} buildings</span>
                    <span>{level.content.entityRefCount} entities</span>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {selectedLevel ? (
          <div className="space-y-3 rounded-lg border border-border/70 bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="size-4 text-primary" />
                  <h4 className="text-sm font-semibold">{selectedLevel.name}</h4>
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {formatKindLabel(selectedLevel.kind)}
                  {selectedLevel.theme ? ` · ${selectedLevel.theme}` : ""}
                </p>
                {selectedLevel.summary ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedLevel.summary}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {(selectedLevel.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <div className="mb-2 flex items-center gap-1 text-xs font-medium text-foreground">
                  <BuildingIcon className="size-3.5 text-primary" />
                  Structure
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {toSummaryRows(selectedLevel).map((row) => (
                    <div
                      key={row.label}
                      className="rounded border border-border/60 bg-background px-2 py-1.5"
                    >
                      <div className="font-semibold text-foreground">
                        {row.value}
                      </div>
                      <div className="text-muted-foreground">{row.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <div className="mb-2 flex items-center gap-1 text-xs font-medium text-foreground">
                  <RouteIcon className="size-3.5 text-primary" />
                  Content
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {toContentRows(selectedLevel).map((row) => (
                    <div
                      key={row.label}
                      className="rounded border border-border/60 bg-background px-2 py-1.5"
                    >
                      <div className="font-semibold text-foreground">
                        {row.value}
                      </div>
                      <div className="text-muted-foreground">{row.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <div className="mb-2 text-xs font-medium text-foreground">
                  Rules
                </div>
                <div className="space-y-1 text-xs">
                  {mapEntries(selectedLevel.rules).length > 0 ? (
                    mapEntries(selectedLevel.rules).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background px-2 py-1"
                      >
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-medium text-foreground">
                          {value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No explicit rules.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                <div className="mb-2 text-xs font-medium text-foreground">
                  Visual Hints
                </div>
                <div className="space-y-1 text-xs">
                  {mapEntries(selectedLevel.visualHints).length > 0 ? (
                    mapEntries(selectedLevel.visualHints).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background px-2 py-1"
                      >
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-medium text-foreground">
                          {value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      No Unreal/browser hints.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
