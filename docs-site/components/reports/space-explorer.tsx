"use client";

import { GameEngine, type PlayerAction } from "@dungeonbreak/engine";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { runPlaythrough } from "@/lib/playthrough-runner";
import { analyzeReport } from "@/lib/playthrough-analyzer";
import { recomputeSpaceData } from "@/lib/space-recompute";
import { JsonView, allExpanded, darkStyles } from "react-json-view-lite";
import { Leva, useControls } from "leva";

const TRAIT_NAMES = [
  "Comprehension",
  "Constraint",
  "Construction",
  "Direction",
  "Empathy",
  "Equilibrium",
  "Freedom",
  "Levity",
  "Projection",
  "Survival",
] as const;

const FEATURE_NAMES = ["Fame", "Effort", "Awareness", "Guile", "Momentum"] as const;

type ContentPoint = {
  type: string;
  id: string;
  name: string;
  branch: string;
  vector: number[];
  vectorCombined?: number[];
  x: number;
  y: number;
  z: number;
  xCombined?: number;
  yCombined?: number;
  zCombined?: number;
  cluster?: number;
  unlockRadius?: number;
};

type SpaceData = {
  schemaVersion: string;
  traitNames: string[];
  featureNames: string[];
  pca?: { mean: number[]; components: number[][] };
  spaces?: {
    trait?: { pca: { mean: number[]; components: number[][] } };
    combined?: { pca: { mean: number[]; components: number[][] } };
  };
  content: ContentPoint[];
};

type SpaceMode = "trait" | "combined";
type ColorBy = "branch" | "type" | "cluster";

const CLUSTER_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4"];

function projectPoint(
  vector: number[],
  mean: number[],
  components: number[][],
): [number, number, number] {
  const centered = vector.map((v, i) => v - (mean[i] ?? 0));
  const dims = Math.min(3, components.length);
  const result = [0, 0, 0];
  for (let d = 0; d < dims; d++) {
    const comp = components[d];
    if (!comp) continue;
    let sum = 0;
    for (let i = 0; i < centered.length; i++) {
      sum += centered[i] * (comp[i] ?? 0);
    }
    result[d] = sum;
  }
  return result as [number, number, number];
}

function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

const BRANCH_COLORS: Record<string, string> = {
  perception: "#3b82f6",
  combat: "#ef4444",
  craft: "#22c55e",
  dialogue: "#a855f7",
  archetype: "#f59e0b",
  default: "#6b7280",
};

const TYPE_COLORS: Record<string, string> = {
  skill: "#22c55e",
  archetype: "#f59e0b",
  dialogue: "#a855f7",
  default: "#6b7280",
};

function getPointColor(pt: ContentPoint, colorBy: ColorBy): string {
  if (colorBy === "branch") return BRANCH_COLORS[pt.branch] ?? BRANCH_COLORS.default;
  if (colorBy === "cluster")
    return pt.cluster != null ? CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length]! : BRANCH_COLORS.default;
  return TYPE_COLORS[pt.type] ?? TYPE_COLORS.default;
}

function getPointCoords(pt: ContentPoint, space: SpaceMode): { x: number; y: number; z: number } {
  if (space === "combined" && pt.xCombined != null) {
    return { x: pt.xCombined, y: pt.yCombined!, z: pt.zCombined! };
  }
  return { x: pt.x, y: pt.y, z: pt.z };
}

type ActionTraceEntry = {
  playerTurn: number;
  action: { actionType: string; payload?: Record<string, unknown> };
};

function getPlayerStateAtTurn(
  seed: number,
  actionTrace: ActionTraceEntry[],
  upToTurn: number,
): { traits: Record<string, number>; features: Record<string, number> } | null {
  const engine = GameEngine.create(seed);
  for (let i = 0; i < upToTurn && i < actionTrace.length; i++) {
    engine.dispatch(actionTrace[i].action as PlayerAction);
  }
  const snapshot = engine.snapshot();
  const player = snapshot?.entities?.[snapshot.playerId];
  if (!player?.traits || !player?.features) return null;
  return {
    traits: { ...(player.traits as Record<string, number>) },
    features: { ...(player.features as Record<string, number>) },
  };
}

type ReportData = {
  seed: number;
  run: { actionTrace: ActionTraceEntry[] };
};

function RecomputeButton({
  data,
  onRecomputed,
}: {
  data: SpaceData | null;
  onRecomputed: (d: SpaceData) => void;
}) {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    if (!data?.content?.length) return;
    setBusy(true);
    try {
      const result = recomputeSpaceData(
        data.content.map((p) => ({
          type: p.type,
          id: p.id,
          name: p.name,
          branch: p.branch,
          vector: p.vector,
          vectorCombined: p.vectorCombined,
          unlockRadius: p.unlockRadius,
        })),
        data.traitNames ?? [],
      );
      onRecomputed(result as SpaceData);
    } finally {
      setBusy(false);
    }
  }, [data, onRecomputed]);
  if (!data) return null;
  return (
    <details className="rounded border bg-background">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-muted-foreground hover:bg-muted/50">
        Recompute
      </summary>
      <div className="border-t px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Run PCA + K-means in browser on current content.
        </p>
        <button
          type="button"
          onClick={onClick}
          disabled={busy || !data.content?.length}
          className="mt-2 w-full rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Computing…" : "Recompute PCA & clusters"}
        </button>
      </div>
    </details>
  );
}

function GenerateReportButton({ onGenerated }: { onGenerated: (r: ReportData) => void }) {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    setBusy(true);
    try {
      const report = runPlaythrough(undefined, 75);
      const analysis = analyzeReport(report);
      const payload = { report, analysis };
      try {
        sessionStorage.setItem("dungeonbreak-browser-report", JSON.stringify(payload));
      } catch {
        // ignore
      }
      onGenerated({
        seed: report.seed,
        run: {
          actionTrace: report.run.actionTrace as ActionTraceEntry[],
        },
      });
    } finally {
      setBusy(false);
    }
  }, [onGenerated]);
  return (
    <details className="rounded border bg-background" open>
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-muted-foreground hover:bg-muted/50">
        Report
      </summary>
      <div className="border-t px-3 py-2">
        <p className="text-xs text-muted-foreground">No report loaded.</p>
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          className="mt-2 w-full rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate report in browser"}
        </button>
        <a
          href="/play/reports"
          className="mt-2 block text-center text-xs text-primary underline"
        >
          View full report
        </a>
      </div>
    </details>
  );
}

export function SpaceExplorer() {
  const [data, setData] = useState<SpaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ContentPoint | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedTurn, setSelectedTurn] = useState(0);

  const traitDefaults = useMemo(
    () =>
      Object.fromEntries(
        TRAIT_NAMES.map((t) => [t, { value: 0, min: -1, max: 1, step: 0.01 }]),
      ),
    [],
  );
  const featureDefaults = useMemo(
    () =>
      Object.fromEntries(
        FEATURE_NAMES.map((f) => [f, { value: 0, min: 0, max: 100, step: 1 }]),
      ),
    [],
  );
  const traitDeltaDefaults = useMemo(
    () =>
      Object.fromEntries(
        TRAIT_NAMES.map((t) => [t, { value: 0, min: -0.5, max: 0.5, step: 0.01 }]),
      ),
    [],
  );
  const featureDeltaDefaults = useMemo(
    () =>
      Object.fromEntries(
        FEATURE_NAMES.map((f) => [f, { value: 0, min: -20, max: 20, step: 1 }]),
      ),
    [],
  );

  const [traits, setTraits] = useControls(
    "Traits (base)",
    () => traitDefaults,
    { collapsed: false },
  );
  const [features, setFeatures] = useControls(
    "Features (base)",
    () => featureDefaults,
    { collapsed: false },
  );
  const [traitDeltas, setTraitDeltas] = useControls(
    "Deltas (Traits)",
    () => traitDeltaDefaults,
    { collapsed: true },
  );
  const [featureDeltas, setFeatureDeltas] = useControls(
    "Deltas (Features)",
    () => featureDeltaDefaults,
    { collapsed: true },
  );
  const [space, setSpace] = useControls(
    "Space",
    () => ({
      space: { value: "trait" as SpaceMode, options: { Trait: "trait", Combined: "combined" } },
      colorBy: {
        value: "branch" as ColorBy,
        options: { Branch: "branch", Type: "type", Cluster: "cluster" },
      },
    }),
    { collapsed: false },
  );

  useEffect(() => {
    fetch("/space-data.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    const applyReport = (r: { seed: number; run: { actionTrace: unknown[] } }) => {
      if (r?.seed != null && Array.isArray(r.run?.actionTrace)) {
        setReport({
          seed: r.seed,
          run: { actionTrace: r.run.actionTrace as ActionTraceEntry[] },
        });
      }
    };
    fetch("/api/play-reports")
      .then((r) => r.json())
      .then((body) => {
        if (body.ok && body.report) {
          applyReport(body.report);
          return;
        }
        try {
          const stored = sessionStorage.getItem("dungeonbreak-browser-report");
          if (stored) {
            const { report: r } = JSON.parse(stored);
            if (r) applyReport(r);
          }
        } catch {
          // ignore
        }
      })
      .catch(() => {
        try {
          const stored = sessionStorage.getItem("dungeonbreak-browser-report");
          if (stored) {
            const { report: r } = JSON.parse(stored);
            if (r) applyReport(r);
          }
        } catch {
          // ignore
        }
      });
  }, []);

  const playerStateAtTurn = useMemo(() => {
    if (!report || selectedTurn < 0) return null;
    return getPlayerStateAtTurn(report.seed, report.run.actionTrace, selectedTurn);
  }, [report, selectedTurn]);

  useEffect(() => {
    if (!playerStateAtTurn || !report) return;
    const traitUpdates: Record<string, number> = {};
    const featureUpdates: Record<string, number> = {};
    for (const t of TRAIT_NAMES) {
      traitUpdates[t] = Number(playerStateAtTurn.traits[t] ?? 0);
    }
    for (const f of FEATURE_NAMES) {
      featureUpdates[f] = Number(playerStateAtTurn.features[f] ?? 0);
    }
    setTraits(traitUpdates);
    setFeatures(featureUpdates);
    setTraitDeltas(TRAIT_NAMES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {}));
    setFeatureDeltas(FEATURE_NAMES.reduce((acc, f) => ({ ...acc, [f]: 0 }), {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when turn/playerState changes
  }, [playerStateAtTurn, report]);

  const traitVector = useMemo(
    () =>
      TRAIT_NAMES.map((t) => Number(traits[t] ?? 0) + Number(traitDeltas[t] ?? 0)).map((v) =>
        Math.max(-1, Math.min(1, v)),
      ),
    [traits, traitDeltas],
  );
  const featureVector = useMemo(
    () => FEATURE_NAMES.map((f) => Number(features[f] ?? 0) + Number(featureDeltas[f] ?? 0)),
    [features, featureDeltas],
  );
  const debouncedTraitVector = useDebouncedValue(traitVector, 120);
  const debouncedFeatureVector = useDebouncedValue(featureVector, 120);
  const combinedVector = useMemo(
    () => [...debouncedTraitVector, ...debouncedFeatureVector],
    [debouncedTraitVector, debouncedFeatureVector],
  );

  const spaceMode = (space?.space as SpaceMode) ?? "trait";
  const colorBy = (space?.colorBy as ColorBy) ?? "branch";

  const pca = useMemo(() => {
    if (!data) return null;
    const s = data.spaces?.[spaceMode];
    if (s?.pca) return s.pca;
    if (data.pca && spaceMode === "trait") return data.pca;
    return null;
  }, [data, spaceMode]);

  const { player3d, knn, content, contentCoords, reachability } = useMemo(() => {
    if (!data?.content || !pca) {
      return {
        player3d: [0, 0, 0] as [number, number, number],
        knn: [] as (ContentPoint & { distance: number })[],
        content: [] as ContentPoint[],
        contentCoords: [] as { x: number; y: number; z: number }[],
        reachability: { skillsInRange: 0, skillsTotal: 0, minDistanceToSkill: 0, meanDistanceToNearest5: 0, reachableIds: [] as string[] },
      };
    }
    const { mean, components } = pca;
    const playerVec = spaceMode === "combined" ? combinedVector : debouncedTraitVector;
    const player3d = projectPoint(playerVec, mean, components);
    const contentCoords = data.content.map((pt) => getPointCoords(pt, spaceMode));
    const distances = data.content.map((pt) => ({
      ...pt,
      distance: euclideanDist(
        playerVec,
        spaceMode === "combined" ? (pt.vectorCombined ?? pt.vector) : pt.vector,
      ),
    }));
    distances.sort((a, b) => a.distance - b.distance);
    const knn = distances.slice(0, 10);

    const skills = data.content.filter((p) => p.type === "skill");
    const skillsWithDist = skills
      .map((s) => ({
        ...s,
        distance: euclideanDist(
          playerVec,
          spaceMode === "combined" ? (s.vectorCombined ?? s.vector) : s.vector,
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
    const inRange = skillsWithDist.filter((s) => s.distance <= (s.unlockRadius ?? 2));
    const nearest5 = skillsWithDist.slice(0, 5);
    const meanDist5 = nearest5.length ? nearest5.reduce((s, x) => s + x.distance, 0) / nearest5.length : 0;
    const minDist = skillsWithDist.length ? Math.min(...skillsWithDist.map((s) => s.distance)) : 0;

    const reachability = {
      skillsInRange: inRange.length,
      skillsTotal: skills.length,
      minDistanceToSkill: minDist,
      meanDistanceToNearest5: meanDist5,
      reachableIds: inRange.map((s) => s.id),
    };

    return { player3d, knn, content: data.content, contentCoords, reachability };
  }, [data, pca, debouncedTraitVector, combinedVector, spaceMode]);

  const PlotlyComponent = useMemo(
    () =>
      dynamic(
        () =>
          import("react-plotly.js").then((mod) => {
            const Plot = mod.default;
            return function Plotly3D({
              content,
              contentCoords,
              player3d,
              colorBy,
              selectedId,
              onSelect,
            }: {
              content: ContentPoint[];
              contentCoords: { x: number; y: number; z: number }[];
              player3d: [number, number, number];
              colorBy: ColorBy;
              selectedId: string | null;
              onSelect: (id: string) => void;
            }) {
              const traceContent = {
                x: contentCoords.map((c) => c.x),
                y: contentCoords.map((c) => c.y),
                z: contentCoords.map((c) => c.z),
                text: content.map(
                  (p) =>
                    `<b>${p.name}</b> (${p.type})<br>branch: ${p.branch}<br>${p.vector.map((v, i) => v.toFixed(2)).join(", ")}`,
                ),
                mode: "markers" as const,
                type: "scatter3d" as const,
                marker: {
                  size: content.map((p) => (selectedId === p.id ? 12 : 6)),
                  color: content.map((p) => getPointColor(p, colorBy)),
                  opacity: content.map((p) => (selectedId === p.id ? 1 : 0.85)),
                },
                hovertemplate: "%{text}<extra></extra>",
                hoverinfo: "text" as const,
              };
              const tracePlayer = {
                x: [player3d[0]],
                y: [player3d[1]],
                z: [player3d[2]],
                text: ["You"],
                mode: "markers" as const,
                type: "scatter3d" as const,
                marker: { size: 14, color: "#eab308", symbol: "diamond" },
                hovertemplate: "You<extra></extra>",
              };
              return (
                <Plot
                  data={[traceContent, tracePlayer]}
                  layout={{
                    margin: { l: 0, r: 0, t: 24, b: 0 },
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "rgba(0,0,0,0.1)",
                    scene: {
                      xaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      yaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      zaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      dragmode: "orbit",
                      hovermode: "closest",
                    },
                    showlegend: false,
                  }}
                  config={{
                    responsive: true,
                    scrollZoom: true,
                    displayModeBar: true,
                    modeBarButtonsToAdd: ["hoverclosest", "hovercompare"],
                  }}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                  onClick={(event: { points?: Array<{ curveNumber?: number; pointIndex?: number }> }) => {
                    const pts = event.points;
                    if (pts?.[0] && pts[0].curveNumber === 0) {
                      const idx = pts[0].pointIndex;
                      if (typeof idx === "number" && content[idx]) onSelect(content[idx].id);
                    }
                  }}
                />
              );
            };
          }),
        {
          ssr: false,
          loading: () => (
            <div className="flex h-full items-center justify-center">Loading 3D…</div>
          ),
        },
      ),
    [],
  );

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-amber-500">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Run <code>pnpm --dir docs-site run space:precompute</code> to generate space-data.json
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Loading space data…</p>
      </div>
    );
  }

  const [vizMode, setVizMode] = useState<"3d" | "json">("3d");

  const jsonData = useMemo(
    () => ({
      player: {
        traits: Object.fromEntries(TRAIT_NAMES.map((t, i) => [t, traitVector[i]])),
        features: Object.fromEntries(FEATURE_NAMES.map((f, i) => [f, featureVector[i]])),
        position3d: player3d,
      },
      reachability: {
        skillsInRange: reachability.skillsInRange,
        skillsTotal: reachability.skillsTotal,
        minDistanceToSkill: Math.round(reachability.minDistanceToSkill * 100) / 100,
        meanDistanceToNearest5: Math.round(reachability.meanDistanceToNearest5 * 100) / 100,
        reachableIds: reachability.reachableIds,
      },
      knn: knn.map(({ id, name, type, branch, distance }) => ({ id, name, type, branch, distance })),
      selected: selectedPoint
        ? {
            id: selectedPoint.id,
            name: selectedPoint.name,
            type: selectedPoint.type,
            branch: selectedPoint.branch,
            vector: selectedPoint.vector,
          }
        : null,
        contentCount: content.length,
    }),
    [debouncedTraitVector, debouncedFeatureVector, player3d, knn, selectedPoint, content.length, reachability],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-6">
      {/* Left: Hero + collapsible sections */}
      <aside className="flex shrink-0 flex-col gap-4 lg:w-56">
        <div>
          <h2 className="text-lg font-semibold">Kael</h2>
          <p className="text-2xl font-bold tracking-tight">Space Explorer</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sliders move position. Deltas = buffs/debuffs.
          </p>
        </div>

        <RecomputeButton data={data} onRecomputed={setData} />

        <details className="rounded border bg-background" open>
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-muted-foreground hover:bg-muted/50">
            Reachability
          </summary>
          <div className="border-t px-3 py-2 text-xs">
            <p>
              <span className="font-medium">{reachability.skillsInRange}</span>
              <span className="text-muted-foreground"> / {reachability.skillsTotal} skills in range</span>
            </p>
            <p className="text-muted-foreground">
              Min d to skill: {reachability.minDistanceToSkill.toFixed(2)} · Mean d (nearest 5):{" "}
              {reachability.meanDistanceToNearest5.toFixed(2)}
            </p>
            {reachability.reachableIds.length > 0 && (
              <p className="mt-1 font-mono text-muted-foreground">{reachability.reachableIds.join(", ")}</p>
            )}
          </div>
        </details>

        {report && report.run.actionTrace.length > 0 ? (
          <details className="rounded border bg-background border-primary/30" open>
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-muted-foreground hover:bg-muted/50">
              Entity position at turn
            </summary>
            <div className="border-t px-3 py-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Sliders synced from player state at turn {selectedTurn}.
              </p>
              <label className="block text-xs text-muted-foreground">
                Turn {selectedTurn} / {report.run.actionTrace.length}
              </label>
              <input
                type="range"
                min={0}
                max={report.run.actionTrace.length}
                value={selectedTurn}
                onChange={(e) => setSelectedTurn(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-xs">
                <span className="font-medium">{reachability.skillsInRange}</span> skills in range ·{" "}
                <span className="font-medium">{knn.filter((p) => p.type === "dialogue").length}</span> dialogue in KNN
              </p>
            </div>
          </details>
        ) : (
          <GenerateReportButton onGenerated={setReport} />
        )}

        <details className="rounded border bg-background" open={!!selectedPoint}>
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-muted-foreground hover:bg-muted/50">
            Selected {selectedPoint ? `· ${selectedPoint.name}` : ""}
          </summary>
          {selectedPoint ? (
            <div className="border-t px-3 py-2 text-xs">
              <p className="font-medium">{selectedPoint.name}</p>
              <p className="text-muted-foreground">{selectedPoint.type} · {selectedPoint.branch}</p>
              <p className="mt-1 font-mono text-muted-foreground">
                {selectedPoint.vector.map((v) => v.toFixed(2)).join(", ")}
              </p>
            </div>
          ) : (
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">Click a point in 3D or KNN list.</div>
          )}
        </details>

        <details className="rounded border bg-background">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-muted-foreground hover:bg-muted/50">
            K-Nearest (k=10)
          </summary>
          <ul className="max-h-48 overflow-y-auto border-t px-3 py-2 space-y-1 font-mono text-xs">
            {knn.map((pt, i) => (
              <li
                key={pt.id}
                className={`cursor-pointer hover:underline ${selectedPoint?.id === pt.id ? "font-semibold" : ""}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedPoint(pt)}
                onClick={() => setSelectedPoint(pt)}
              >
                {i + 1}. {pt.name} — d={pt.distance.toFixed(2)}
              </li>
            ))}
          </ul>
        </details>
      </aside>

      {/* Center: Viz + Data panel with 3D | JSON toggle */}
      <section className="min-h-[420px] flex-1 flex flex-col rounded border bg-background">
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setVizMode("3d")}
            className={`px-4 py-2 text-sm font-medium ${vizMode === "3d" ? "border-b-2 border-primary bg-muted/30" : "text-muted-foreground hover:bg-muted/20"}`}
          >
            3D
          </button>
          <button
            type="button"
            onClick={() => setVizMode("json")}
            className={`px-4 py-2 text-sm font-medium ${vizMode === "json" ? "border-b-2 border-primary bg-muted/30" : "text-muted-foreground hover:bg-muted/20"}`}
          >
            JSON
          </button>
        </div>
        <div className="min-h-[400px] flex-1 p-2">
          {vizMode === "3d" ? (
            <div className="h-full min-h-[400px] w-full">
              <PlotlyComponent
                content={content}
                contentCoords={contentCoords}
                player3d={player3d}
                colorBy={colorBy}
                selectedId={selectedPoint?.id ?? null}
                onSelect={(id) => {
                  const pt = content.find((p) => p.id === id);
                  setSelectedPoint(pt ?? null);
                }}
              />
            </div>
          ) : (
            <div className="h-full min-h-[400px] overflow-auto rounded bg-muted/20 p-3">
              <JsonView data={jsonData} shouldExpandNode={allExpanded} style={darkStyles} />
            </div>
          )}
        </div>
      </section>

      {/* Right: Leva controls (collapsible) */}
      <aside className="flex shrink-0 flex-col border-l bg-muted/10 lg:w-72">
        <details open className="group">
          <summary className="cursor-pointer border-b px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30">
            Controls
          </summary>
          <div className="max-h-[70vh] overflow-auto">
            <Leva fill flat titleBar={false} theme={{ sizes: { rootWidth: "100%" } }} />
          </div>
        </details>
      </aside>
    </div>
  );
}
