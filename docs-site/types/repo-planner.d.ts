declare module "@/vendor/repo-planner" {
  import type { ComponentType } from "react";
  export const PlanningCockpit: ComponentType;
  export const PlanningChatPanel: ComponentType;
  export const PlanningEditReview: ComponentType;
  export const PlanningTestReportsTab: ComponentType;
  export function statusClassName(...args: unknown[]): string;
  export function statusVariant(...args: unknown[]): string;
  export type PlanningEdit = { path: string; oldContent: string; newContent: string; summary?: string };
}

declare module "@/vendor/repo-planner/api/planning-cli/run/route" {
  export function POST(req: Request): Promise<Response>;
}
declare module "@/vendor/repo-planner/api/planning-state/route" {
  export function GET(req: Request): Promise<Response>;
}
declare module "@/vendor/repo-planner/api/planning-metrics/route" {
  export function GET(req: Request): Promise<Response>;
}
declare module "@/vendor/repo-planner/api/planning-reports/latest/route" {
  export function GET(req: Request): Promise<Response>;
}
declare module "@/vendor/repo-planner/api/planning-edits/apply/route" {
  export function POST(req: Request): Promise<Response>;
}
declare module "@/vendor/repo-planner/api/test-reports/unit/route" {
  export function GET(req: Request): Promise<Response>;
}
