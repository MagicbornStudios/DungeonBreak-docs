"use client";

import { PlanningCockpit } from "@/vendor/repo-planner";

export default function PlanningCockpitPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Real-time planning cockpit: dashboard, reports, tasks, phases, state, agents, CLI terminal. Data refreshes every 8s.
      </p>
      <PlanningCockpit />
    </div>
  );
}
