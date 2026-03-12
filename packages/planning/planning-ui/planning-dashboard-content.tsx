"use client";

import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileText,
  HelpCircle,
  LayoutGrid,
  MessageCircle,
  RefreshCw,
  Search,
  Users,
  XCircle,
  XIcon,
} from "lucide-react";
import { PlanningServerLogPanel } from "@/planning-ui/planning-server-log-panel";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/planning-ui/ui/card";
import { Button } from "@/planning-ui/ui/button";
import { Badge } from "@/planning-ui/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/planning-ui/ui/collapsible";
import { createPortal } from "react-dom";
import { PlanningChatPanel } from "@/planning-ui/planning-chat-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/planning-ui/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const POLL_MS = 8000;

type Bundle = {
  snapshot?: {
    currentPhase: string;
    currentPlan: string;
    status: string;
    agents?: Array<{ id: string; name: string; phase: string; status: string }>;
  };
  openTasks?: Array<{
    id: string;
    status: string;
    agentId: string;
    goal: string;
    phase: string;
  }>;
  openQuestions?: Array<{ phaseId: string; id: string; text: string }>;
  context?: {
    summary?: {
      phases?: Array<{
        id: string;
        title: string;
        status: string;
        goal?: string;
        tasks?: Array<{ id: string; status: string; goal: string; agentId?: string }>;
        fileRefs?: string[];
      }>;
    };
  };
  generatedAt?: string;
};

type RoadmapResponse = {
  phases: Array<{
    id: string;
    title: string;
    status: string;
    goal: string;
    taskCount: number;
    fileRefs?: string[];
    tasks?: Array<{ id: string; status: string; goal?: string }>;
  }>;
  sprintSize: number;
  sprintIndex: number;
  phaseIdsInSprint: string[];
};

type MetricRow = {
  at: string;
  tasksTotal: number;
  tasksDone: number;
  completionRate: number;
  openQuestionsCount: number;
  activeAgentsCount: number;
  snapshotTokensApprox?: number;
  bundleTokensApprox?: number;
};

/** Status colors/border only. Use with .status-badge for consistent pill (no jagged statuses). */
function statusClass(status: string): string {
  const s = status?.toLowerCase() ?? "";
  if (["done", "complete", "completed"].some((x) => s === x)) return "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (["in-progress", "in_progress", "active"].some((x) => s === x)) return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  if (["failed", "cancelled"].some((x) => s === x)) return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400";
  if (["superseded", "archived"].some((x) => s.includes(x))) return "border-border bg-muted/50 text-muted-foreground";
  return "border-border bg-muted/50 text-muted-foreground";
}

/** Left border color for phase/sprint context (status-based). */
function statusLeftBorderClass(status: string): string {
  const s = status?.toLowerCase() ?? "";
  if (["done", "complete", "completed"].some((x) => s === x)) return "border-l-emerald-500/70";
  if (["in-progress", "in_progress", "active"].some((x) => s === x)) return "border-l-amber-500/70";
  if (["failed", "cancelled"].some((x) => s === x)) return "border-l-red-500/70";
  return "border-l-border";
}

const TAB_VALUES = ["overview", "sprints", "phases", "agents", "reports"] as const;

/** Phase icon by state: completed → check, in-progress → activity, failed/cancelled → x, else → file (planning). */
function PhaseIconByStatus({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "";
  if (["done", "complete", "completed"].some((x) => s === x)) return <CheckCircle2 className="size-4 shrink-0 text-emerald-500/90" aria-hidden />;
  if (["in-progress", "in_progress", "active"].some((x) => s === x)) return <Activity className="size-4 shrink-0 text-amber-500/90" aria-hidden />;
  if (["failed", "cancelled"].some((x) => s === x)) return <XCircle className="size-4 shrink-0 text-red-500/90" aria-hidden />;
  return <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
}
const ACTIVE_AGENT_STATUSES = new Set(["in-progress", "in_progress", "active"]);

export function PlanningDashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = TAB_VALUES.includes(tabParam as (typeof TAB_VALUES)[number]) ? tabParam : "overview";

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<{
    metrics: MetricRow[];
    usage: Array<{ at: string; command: string }>;
  } | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => defaultTab);
  const [reportMd, setReportMd] = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const reportsViewedRef = useRef(false);
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatModalOpen, setChatModalOpen] = useState(false);

  useEffect(() => {
    if (!chatModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChatModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatModalOpen]);

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch("/api/planning-state");
      if (r.ok) {
        const data = await r.json();
        setBundle(data);
        setBundleError(null);
      } else {
        const err = await r.json().catch(() => ({}));
        setBundleError(err.detail || err.error || `HTTP ${r.status}`);
        setBundle(null);
      }
    } catch (e) {
      setBundleError(e instanceof Error ? e.message : String(e));
      setBundle(null);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const r = await fetch("/api/planning-metrics?tail=80");
      if (r.ok) {
        const data = await r.json();
        setMetricsData({ metrics: data.metrics ?? [], usage: data.usage ?? [] });
      }
    } catch {
      setMetricsData(null);
    }
  }, []);

  const fetchRoadmap = useCallback(async () => {
    try {
      const r = await fetch("/api/planning-roadmap");
      if (r.ok) {
        const data = await r.json();
        setRoadmap(data);
      } else {
        setRoadmap(null);
      }
    } catch {
      setRoadmap(null);
    }
  }, []);

  const refresh = useCallback(() => {
    setLastScan(new Date());
    void fetchState();
    void fetchRoadmap();
    void fetchMetrics();
  }, [fetchState, fetchMetrics]);

  const fetchReport = useCallback(async () => {
    try {
      const r = await fetch("/api/planning-reports/latest");
      const data = await r.json().catch(() => ({}));
      setReportMd(typeof data.markdown === "string" ? data.markdown : "");
    } catch {
      setReportMd("");
    }
  }, []);

  const runReportGenerate = useCallback(async () => {
    setReportGenerating(true);
    try {
      const r = await fetch("/api/planning-cli/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "report generate" }),
      });
      const body = await r.json().catch(() => ({}));
      if (body.ok) await fetchReport();
    } finally {
      setReportGenerating(false);
    }
  }, [fetchReport]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (activeTab !== "reports") return;
    if (!reportsViewedRef.current) {
      reportsViewedRef.current = true;
      runReportGenerate();
    } else if (reportMd === null) {
      fetchReport();
    }
  }, [activeTab, runReportGenerate, fetchReport, reportMd]);

  const snapshot = bundle?.snapshot;
  const openTasks = bundle?.openTasks ?? [];
  const openQuestions = bundle?.openQuestions ?? [];
  const agents = snapshot?.agents ?? [];
  const activeSnapshotAgents = agents.filter((agent) =>
    ACTIVE_AGENT_STATUSES.has(agent.status?.toLowerCase() ?? ""),
  );
  const phasesFromContext = bundle?.context?.summary?.phases ?? [];
  const phaseIdsFromTasks = Array.from(
    new Set(openTasks.map((t) => String(t.phase || "").padStart(2, "0")).filter(Boolean)),
  );
  /** Full roadmap phases (all phases) when API available; else sprint-only from bundle. */
  const allPhases: Array<{
    id: string;
    title: string;
    status: string;
    goal?: string;
    tasks?: Array<{ id: string; status: string; goal?: string; agentId?: string }>;
    fileRefs?: string[];
    taskCount?: number;
  }> =
    (roadmap?.phases?.length ?? 0) > 0
      ? roadmap.phases.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          goal: p.goal,
          tasks: p.tasks,
          fileRefs: p.fileRefs,
          taskCount: p.taskCount,
        }))
      : phasesFromContext.length > 0
        ? phasesFromContext
        : phaseIdsFromTasks.map((id) => ({
            id,
            title: id,
            status: "",
            tasks: openTasks.filter((t) => String(t.phase || "").padStart(2, "0") === id),
          }));

  const q = searchQuery.trim().toLowerCase();
  const phases = q
    ? allPhases.filter((p) => {
        const matchPhase =
          p.id.toLowerCase().includes(q) ||
          (p.title ?? "").toLowerCase().includes(q) ||
          (p.goal ?? "").toLowerCase().includes(q);
        const taskMatch = p.tasks?.some(
          (t) =>
            t.id.toLowerCase().includes(q) || (t.goal ?? "").toLowerCase().includes(q),
        );
        return matchPhase || taskMatch;
      })
    : allPhases;
  const inSprint = new Set(roadmap?.phaseIdsInSprint ?? bundle?.context?.phaseIds ?? []);
  const metrics = metricsData?.metrics ?? [];
  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const chartData = metrics.map((m) => ({
    at: m.at.slice(0, 16).replace("T", " "),
    completionRate: m.completionRate,
    openQuestions: m.openQuestionsCount,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 lg:px-6 md:gap-6 md:py-6">
      {bundleError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Planning state: {bundleError}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start the app from the repo root that contains <code className="rounded bg-muted px-1">.planning</code>. State is loaded from the planning bundle.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {lastScan ? `Live ${lastScan.toLocaleTimeString()}` : "Loading…"}
          </p>
          {roadmap != null && (
            <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors">
              Sprint {roadmap.sprintIndex} (phases {roadmap.phaseIdsInSprint?.join(", ") ?? "—"})
            </span>
          )}
          {snapshot?.currentPhase && (
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Loop: phase {snapshot.currentPhase}
              {activeSnapshotAgents.length > 0 ? ` · ${activeSnapshotAgents.length} active` : ""}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search phases, tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-md border border-input bg-background pl-7 pr-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring md:w-56"
              aria-label="Search phases and tasks"
            />
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="overview" className="gap-2 transition-all duration-200 data-[state=active]:shadow-md">
            <BarChart3 className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sprints" className="gap-2 transition-all duration-200 data-[state=active]:shadow-md">
            <Activity className="size-4" />
            Sprints
          </TabsTrigger>
          <TabsTrigger value="phases" className="gap-2 transition-all duration-200 data-[state=active]:shadow-md">
            <LayoutGrid className="size-4" />
            Phases
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2 transition-all duration-200 data-[state=active]:shadow-md">
            <Users className="size-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 transition-all duration-200 data-[state=active]:shadow-md">
            <FileText className="size-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.01]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Completion</CardDescription>
                <CheckCircle2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {latestMetric != null ? `${latestMetric.completionRate}%` : "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {latestMetric ? `${latestMetric.tasksDone} / ${latestMetric.tasksTotal} tasks` : "Run planning report generate"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md transition-shadow hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Active agents</CardDescription>
                <Users className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {(activeSnapshotAgents.length || latestMetric?.activeAgentsCount) || "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">In STATE.xml</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.01]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Open questions</CardDescription>
                <HelpCircle className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {(openQuestions.length || latestMetric?.openQuestionsCount) ?? "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">From phase PLANs</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.01]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Snapshot / bundle tokens</CardDescription>
                <Activity className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg font-semibold tabular-nums">
                  {latestMetric?.snapshotTokensApprox != null
                    ? latestMetric.snapshotTokensApprox.toLocaleString()
                    : "—"}{" "}
                  /{" "}
                  {latestMetric?.bundleTokensApprox != null
                    ? latestMetric.bundleTokensApprox.toLocaleString()
                    : "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Approx (report generate)</p>
              </CardContent>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Completion over time</CardTitle>
                <CardDescription>From .planning/reports/metrics.jsonl</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="at" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: "var(--radius)" }} />
                      <Line
                        type="monotone"
                        dataKey="completionRate"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={false}
                        name="Completion %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Open tasks</CardTitle>
              <CardDescription>{openTasks.length} open (from planning bundle)</CardDescription>
            </CardHeader>
            <CardContent>
              {openTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open tasks.</p>
              ) : (
                <ul className="space-y-2">
                  {openTasks.slice(0, 15).map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{t.id}</span>
                      <Badge variant="secondary" className={`status-badge ${statusClass(t.status)}`}>
                        {t.status}
                      </Badge>
                      <span className="w-full max-w-[60%] truncate text-muted-foreground lg:max-w-none">
                        {t.goal}
                      </span>
                    </li>
                  ))}
                  {openTasks.length > 15 && (
                    <li className="text-xs text-muted-foreground">+{openTasks.length - 15} more</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sprints" className="space-y-4">
          <Card className="border-0 shadow-md transition-shadow duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle>Sprints</CardTitle>
              <CardDescription>
                Context window of phases per sprint. Color by status; current sprint highlighted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roadmap == null || !roadmap.phases?.length ? (
                <p className="text-sm text-muted-foreground">Load roadmap to see sprints.</p>
              ) : (
                <div className="space-y-3">
                  {Array.from(
                    { length: Math.ceil((roadmap.phases?.length ?? 0) / (roadmap.sprintSize || 5)) },
                    (_, i) => i,
                  ).map((sprintIdx) => {
                    const size = roadmap.sprintSize || 5;
                    const start = sprintIdx * size;
                    const sprintPhases = roadmap.phases.slice(start, start + size);
                    const isCurrent = sprintIdx === roadmap.sprintIndex;
                    return (
                      <div
                        key={sprintIdx}
                        className={`rounded-lg border px-3 py-2 ${
                          isCurrent
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold tabular-nums text-foreground">
                            Sprint {sprintIdx}
                          </span>
                          {isCurrent ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Current
                            </Badge>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            phases {sprintPhases.map((p) => p.id).join(", ")}
                          </span>
                        </div>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {sprintPhases.map((p) => (
                            <li
                              key={p.id}
                              className={`status-badge flex items-center gap-1.5 ${statusClass(p.status)}`}
                            >
                              <PhaseIconByStatus status={p.status} />
                              <span className="font-mono">{p.id}</span>
                              <span className="max-w-[120px] truncate text-muted-foreground">
                                {p.title}
                              </span>
                              <span className="text-muted-foreground/80">({p.taskCount})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phases" className="space-y-4">
          <Card className="border-0 shadow-md transition-shadow duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle>Phases</CardTitle>
              <CardDescription>
                All phases from roadmap. Collapsible; tasks and files touched per phase. Current sprint highlighted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {phases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No phases. Load planning state and refresh to see full roadmap.
                </p>
              ) : (
                <div className="space-y-2">
                  {phases.map((phase) => {
                    const tasksInPhase =
                      phase.tasks ??
                      openTasks.filter(
                        (t) => String(t.phase || "").padStart(2, "0") === phase.id,
                      );
                    const isInSprint = inSprint.has(phase.id);
                    return (
                      <Collapsible key={phase.id} defaultOpen={isInSprint}>
                        <CollapsibleTrigger
                          className={`group flex w-full items-center gap-2 rounded-md border-l-4 bg-muted/30 px-3 py-2 text-left text-sm font-medium transition-all duration-200 hover:bg-muted/50 hover:shadow-sm ${statusLeftBorderClass(phase.status)}`}
                        >
                          <ChevronRight className="size-4 shrink-0 transition-transform duration-200 group-aria-expanded:rotate-90" />
                          <PhaseIconByStatus status={phase.status} />
                          <span className="font-mono font-semibold tabular-nums text-foreground">
                            {phase.id}
                          </span>
                          <span className="text-muted-foreground">—</span>
                          <span>{phase.title}</span>
                          {phase.status ? (
                            <Badge
                              variant="outline"
                              className={`status-badge ${statusClass(phase.status)}`}
                            >
                              {phase.status}
                            </Badge>
                          ) : null}
                          {isInSprint ? (
                            <Badge variant="secondary" className="text-[10px]">
                              In sprint
                            </Badge>
                          ) : null}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {tasksInPhase.length} task{tasksInPhase.length !== 1 ? "s" : ""}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-border/50 pl-6 pr-3 pt-2 pb-3 space-y-3">
                            {phase.goal ? (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Definition of done:</span>{" "}
                                {phase.goal}
                              </p>
                            ) : null}
                            {phase.fileRefs && phase.fileRefs.length > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Files touched:</span>{" "}
                                <span className="font-mono">{phase.fileRefs.join(", ")}</span>
                              </p>
                            ) : null}
                            {tasksInPhase.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No tasks in this phase.
                              </p>
                            ) : (
                              <ul className="space-y-1.5">
                                {tasksInPhase.map((t) => (
                                  <li
                                    key={t.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded border bg-background/50 px-2 py-1.5 text-xs transition-colors hover:bg-muted/30"
                                  >
                                    <span className="font-mono">{t.id}</span>
                                    <Badge
                                      variant="outline"
                                      className={`status-badge ${statusClass(t.status)}`}
                                    >
                                      {t.status}
                                    </Badge>
                                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                      {t.goal}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Agents</CardTitle>
              <CardDescription>From STATE.xml (snapshot)</CardDescription>
            </CardHeader>
            <CardContent>
              {activeSnapshotAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents in snapshot.</p>
              ) : (
                <ul className="space-y-2">
                  {activeSnapshotAgents.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-xs">{a.id}</span>
                      <Badge variant="outline" className={`status-badge ${statusClass(a.status)}`}>
                        {a.status}
                      </Badge>
                      <span className="text-muted-foreground">Phase {a.phase}</span>
                      <span>{a.name || "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Latest report and metrics</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={reportGenerating}
                onClick={() => runReportGenerate()}
              >
                {reportGenerating ? "Generating…" : "Regenerate"}
              </Button>
            </CardHeader>
            <CardContent>
              {reportGenerating && reportMd === null ? (
                <p className="text-sm text-muted-foreground">Generating…</p>
              ) : reportMd === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : reportMd === "" ? (
                <p className="text-sm text-muted-foreground">No report yet.</p>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border/50 bg-muted/10 p-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{reportMd}</ReactMarkdown>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PlanningServerLogPanel className="mt-4" />

      {/* Codex chat: bubble opens a centered modal */}
      <Button
        type="button"
        size="icon"
        className="fixed bottom-4 right-4 z-40 size-11 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Open Codex authoring chat"
        title="Open Codex authoring chat"
        onClick={() => setChatModalOpen(true)}
      >
        <MessageCircle className="size-5" />
      </Button>
      {chatModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-modal-title"
            onClick={(e) => e.target === e.currentTarget && setChatModalOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setChatModalOpen(false)}
          >
            <div
              className="flex h-[85vh] min-h-[560px] max-h-[90vh] w-full max-w-[960px] flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
                <p id="chat-modal-title" className="text-sm font-semibold">Codex / Assistant</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Close chat"
                  onClick={() => setChatModalOpen(false)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <PlanningChatPanel
                  context={{
                    bundle,
                    openTasks: openTasks.slice(0, 50),
                    openQuestions,
                    snapshot,
                  }}
                  className="h-full border-0 bg-transparent p-0"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
