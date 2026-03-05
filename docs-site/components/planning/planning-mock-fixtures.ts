export type PlanningMetricRow = {
  at: string;
  tasksTotal: number;
  tasksDone: number;
  completionRate: number;
  openQuestionsCount: number;
  activeAgentsCount: number;
  snapshotTokensApprox?: number;
  bundleTokensApprox?: number;
};

export type PlanningUsageRow = { at: string; command: string };

export type PlanningBundleFixture = {
  snapshot: {
    currentPhase: string;
    currentPlan: string;
    status: string;
    nextAction?: string;
    agents?: Array<{ id: string; name: string; phase: string; plan: string; status: string }>;
  };
  openTasks: Array<{ id: string; status: string; agentId: string; goal: string; phase: string }>;
  openQuestions: Array<{ phaseId: string; id: string; text: string; file?: string }>;
  context: { phaseIds: string[]; paths: string[]; summary: { phases: Array<{ id: string; title: string; status: string }> } };
  agentsWithTasks: Array<{
    agent: { id: string; name: string; phase: string; plan: string; status: string };
    tasks: Array<{ id: string; status: string; goal: string; phase: string }>;
  }>;
  format: string;
  generatedAt: string;
};

export const PLANNING_MOCK_BUNDLE: PlanningBundleFixture = {
  snapshot: {
    currentPhase: "52",
    currentPlan: "52-03",
    status: "in-progress",
    nextAction: "Validate delivery publish/pull in Space Explorer",
    agents: [{ id: "agent-dev-mock", name: "Dev Mock Agent", phase: "52", plan: "52-03", status: "active" }],
  },
  openTasks: [
    {
      id: "52-03",
      status: "in-progress",
      agentId: "agent-dev-mock",
      goal: "Implement and validate content pack delivery publish/pull contract.",
      phase: "52",
    },
  ],
  openQuestions: [
    {
      phaseId: "52",
      id: "52-q-01",
      text: "Should plugin/runtime compatibility strict-match or wildcard by default?",
      file: ".planning/REQUIREMENTS.xml",
    },
  ],
  context: {
    phaseIds: ["50", "51", "52"],
    paths: ["docs-site", ".planning"],
    summary: {
      phases: [
        { id: "50", title: "AI integration baseline", status: "completed" },
        { id: "51", title: "Content schema authoring loop", status: "in-progress" },
        { id: "52", title: "Unreal DLC delivery", status: "in-progress" },
      ],
    },
  },
  agentsWithTasks: [
    {
      agent: { id: "agent-dev-mock", name: "Dev Mock Agent", phase: "52", plan: "52-03", status: "active" },
      tasks: [{ id: "52-03", status: "in-progress", goal: "Run mock delivery validation loop", phase: "52" }],
    },
  ],
  format: "loop-bundle.v1",
  generatedAt: new Date().toISOString(),
};

export const PLANNING_MOCK_METRICS: PlanningMetricRow[] = [
  {
    at: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    tasksTotal: 12,
    tasksDone: 8,
    completionRate: 67,
    openQuestionsCount: 3,
    activeAgentsCount: 2,
    snapshotTokensApprox: 9200,
    bundleTokensApprox: 14600,
  },
  {
    at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    tasksTotal: 12,
    tasksDone: 9,
    completionRate: 75,
    openQuestionsCount: 2,
    activeAgentsCount: 2,
    snapshotTokensApprox: 9700,
    bundleTokensApprox: 15200,
  },
  {
    at: new Date().toISOString(),
    tasksTotal: 12,
    tasksDone: 10,
    completionRate: 83,
    openQuestionsCount: 1,
    activeAgentsCount: 1,
    snapshotTokensApprox: 10100,
    bundleTokensApprox: 15800,
  },
];

export const PLANNING_MOCK_USAGE: PlanningUsageRow[] = [
  { at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), command: "snapshot" },
  { at: new Date(Date.now() - 1000 * 60 * 16).toISOString(), command: "open-questions" },
  { at: new Date(Date.now() - 1000 * 60 * 11).toISOString(), command: "report generate" },
  { at: new Date(Date.now() - 1000 * 60 * 8).toISOString(), command: "state --json" },
];

export const PLANNING_MOCK_REPORT = `# Planning Mock Report

- Mode: local fixture
- Purpose: deterministic UI validation without API/process dependencies
- Current phase: 52
- Current plan: 52-03

## Notes

- Completion is synthetic fixture data.
- Use Dev Toolbar to disable mock mode and restore live APIs.
`;

