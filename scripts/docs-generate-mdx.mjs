#!/usr/bin/env node
/**
 * Generate docs scaffolding for TypeScript package API + guides.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const docsSite = join(root, "docs-site");
const contentDocs = join(docsSite, "content", "docs");
const apiBase = join(contentDocs, "api");
const engineApiDir = join(apiBase, "engine");
const guidesDir = join(contentDocs, "guides");

if (!existsSync(docsSite)) {
  console.warn("docs-site/ not found. Skip docs:generate.");
  process.exit(0);
}

mkdirSync(engineApiDir, { recursive: true });
writeFileSync(
  join(engineApiDir, "index.mdx"),
  `---
title: Engine API
description: @dungeonbreak/engine package API
---

\`@dungeonbreak/engine\` exports:

- \`GameEngine\`
- \`DungeonBreakGame\` React component
- shared contracts (\`ACTION_CONTRACTS\`, \`ROOM_TEMPLATES\`, etc.)
- replay helpers via \`@dungeonbreak/engine/replay\`

Package source lives in \`packages/engine\`.
`,
  "utf8",
);

mkdirSync(apiBase, { recursive: true });
writeFileSync(join(apiBase, "meta.json"), JSON.stringify({ title: "API", pages: ["engine"] }, null, 2), "utf8");

const rootIndex = join(contentDocs, "index.mdx");
if (!existsSync(rootIndex)) {
  mkdirSync(contentDocs, { recursive: true });
  writeFileSync(
    rootIndex,
    `---
title: DungeonBreak Docs
description: API and guides for DungeonBreak
---

Welcome to DungeonBreak docs.
`,
    "utf8",
  );
}

mkdirSync(guidesDir, { recursive: true });
const onboardingPath = join(root, "docs", "onboarding.md");
if (existsSync(onboardingPath)) {
  const raw = readFileSync(onboardingPath, "utf8");
  writeFileSync(
    join(guidesDir, "onboarding.mdx"),
    `---
title: Onboarding
description: Finding code and examples
---

${raw}
`,
    "utf8",
  );
}
writeFileSync(join(guidesDir, "meta.json"), JSON.stringify({ title: "Guides", pages: ["onboarding"] }, null, 2), "utf8");

writeFileSync(
  join(contentDocs, "meta.json"),
  JSON.stringify({ title: "Docs", pages: ["api", "guides"] }, null, 2),
  "utf8",
);

console.log("docs:generate done.");
