"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Activity, CheckCircle2, HelpCircle, Users, FileWarning } from "lucide-react";

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

type UsageRow = { at: string; command: string };

const completionConfig = {
  completionRate: { label: "Completion %", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const questionsConfig = {
  openQuestionsCount: { label: "Open questions", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export default function PlanningDashboardPage() {
  const [data, setData] = useState<{ metrics: MetricRow[]; usage: UsageRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/planning-metrics?tail=100")
      .then((r) => r.json())
      .then((body) => {
        if (body.error) throw new Error(body.error);
        setData({ metrics: body.metrics ?? [], usage: body.usage ?? [] });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <p className="text-destructive">Failed to load metrics: {error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Run <code className="rounded bg-muted px-1">planning report generate</code> to populate .planning/reports/metrics.jsonl
        </p>
        <Link href="/planning" className="mt-4 inline-block text-primary hover:underline">
          ← Planning index
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container max-w-4xl py-8">
        <p className="text-muted-foreground">Loading metrics…</p>
      </div>
    );
  }

  const { metrics, usage } = data;
  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const chartData = metrics.map((m) => ({
    at: m.at.slice(0, 16).replace("T", " "),
    completionRate: m.completionRate,
    openQuestionsCount: m.openQuestionsCount,
  }));

  const usageByCommand = usage.reduce<Record<string, number>>((acc, u) => {
    acc[u.command] = (acc[u.command] ?? 0) + 1;
    return acc;
  }, {});
  const usageChartData = Object.entries(usageByCommand).map(([command, count]) => ({ command, count }));

  return (
    <div className="container max-w-5xl space-y-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Planning system health</h1>
        <Link href="/planning" className="text-sm text-primary hover:underline">
          Planning index
        </Link>
      </div>

      {latest && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {latest.tasksDone} / {latest.tasksTotal} tasks
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open questions</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.openQuestionsCount}</div>
              <p className="text-xs text-muted-foreground">From phase PLANs</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{latest.activeAgentsCount}</div>
              <p className="text-xs text-muted-foreground">In STATE.xml</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Snapshot / bundle tokens</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {latest.snapshotTokensApprox != null ? latest.snapshotTokensApprox.toLocaleString() : "—"} /{" "}
                {latest.bundleTokensApprox != null ? latest.bundleTokensApprox.toLocaleString() : "—"}
              </div>
              <p className="text-xs text-muted-foreground">Approx (run report generate)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Completion rate over time</CardTitle>
              <p className="text-sm text-muted-foreground">From metrics.jsonl (each planning report generate)</p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={completionConfig} className="h-[240px] w-full">
                <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="at" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="completionRate" stroke="var(--color-completionRate)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Open questions over time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={questionsConfig} className="h-[200px] w-full">
                <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="at" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="openQuestionsCount" stroke="var(--color-openQuestionsCount)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}

      {usageChartData.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Loop usage (how often agents run key commands)</CardTitle>
            <p className="text-sm text-muted-foreground">
              From usage.jsonl — snapshot, new-agent-id, simulate-loop (last {usage.length} entries)
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Runs" } }} className="h-[200px] w-full">
              <BarChart data={usageChartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="command" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {metrics.length === 0 && usage.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No metrics or usage data yet.</p>
            <p className="mt-2 text-sm">
              Run <code className="rounded bg-muted px-1">planning report generate</code> to append metrics. Usage is logged when agents run{" "}
              <code className="rounded bg-muted px-1">planning snapshot</code>, <code className="rounded bg-muted px-1">planning new-agent-id</code>, or{" "}
              <code className="rounded bg-muted px-1">planning simulate loop</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
