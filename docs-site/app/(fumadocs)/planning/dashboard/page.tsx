"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

const PLANNING_APP_URL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_PLANNING_APP_URL
    ? process.env.NEXT_PUBLIC_PLANNING_APP_URL
    : "http://localhost:3101";

export default function PlanningDashboardPage() {
  return (
    <div className="container max-w-xl py-8 space-y-4">
      <p className="text-muted-foreground">
        The planning dashboard (metrics, completion, usage) runs in RepoPlanner.
      </p>
      <a
        href={`${PLANNING_APP_URL}/dashboard`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Open dashboard in RepoPlanner
        <ExternalLink className="size-4" />
      </a>
      <p className="text-sm">
        <Link href="/planning" className="text-primary hover:underline">
          ← Planning docs
        </Link>
      </p>
    </div>
  );
}
