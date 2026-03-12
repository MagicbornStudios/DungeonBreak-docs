"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

const PLANNING_APP_URL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_PLANNING_APP_URL
    ? process.env.NEXT_PUBLIC_PLANNING_APP_URL
    : "http://localhost:3101";

export default function PlanningCockpitPage() {
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <p className="text-sm text-muted-foreground">
        The planning cockpit (dashboard, reports, tasks, phases, CLI) runs in{" "}
        <strong>RepoPlanner</strong>. Open it in a separate tab or run it from
        the RepoPlanner repo.
      </p>
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-2">Open RepoPlanner</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Start the planning app with <code className="rounded bg-muted px-1">pnpm planning:standalone</code> or{" "}
          <code className="rounded bg-muted px-1">pnpm --dir vendor/repo-planner web:dev</code> from the host repo, then open:
        </p>
        <a
          href={PLANNING_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open planning cockpit
          <ExternalLink className="size-4" />
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Set <code>NEXT_PUBLIC_PLANNING_APP_URL</code> to your deployed RepoPlanner URL to link to production.
      </p>
    </div>
  );
}
