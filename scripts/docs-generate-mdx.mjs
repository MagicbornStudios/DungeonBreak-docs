#!/usr/bin/env node
/**
 * Orchestrate: Python API (fumadocs-python JSON→MDX), guides copy, meta. Use: npm run docs:generate
 */
import { mkdirSync, writeFileSync, readdirSync, copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const docsSite = join(root, "docs-site");
const contentDocs = join(docsSite, "content", "docs");
const apiBase = join(contentDocs, "api");
const isWin = process.platform === "win32";

if (!existsSync(docsSite)) {
  console.warn("docs-site/ not found. Skip docs:generate.");
  process.exit(0);
}

// 1) Python API: JSON→MDX via fumadocs-python (run from docs-site so fumadocs-python resolves)
const pythonDir = join(apiBase, "python");
const pythonMdxScript = join(docsSite, "scripts", "generate-python-mdx.mjs");
if (existsSync(pythonMdxScript)) {
  const r = spawnSync("node", [pythonMdxScript], { cwd: docsSite, stdio: "inherit", shell: isWin });
  if (r.status !== 0) console.warn("Python MDX generator failed; continuing.");
}
const pythonJson = join(docsSite, "dungeonbreak_narrative.json");
if (!existsSync(pythonJson)) {
  mkdirSync(pythonDir, { recursive: true });
  writeFileSync(
    join(pythonDir, "index.mdx"),
    `---
title: Python API
description: dungeonbreak_narrative API (generated via fumadocs-python)
---

Run \`npm run docs:python\` then \`npm run docs:generate\` to generate the Python API reference from this repo.
`,
    "utf8"
  );
}

// 2) Root docs index and meta so sidebar shows API
const rootIndex = join(contentDocs, "index.mdx");
if (!existsSync(rootIndex)) {
  mkdirSync(contentDocs, { recursive: true });
  writeFileSync(
    rootIndex,
    `---
title: DungeonBreak Docs
description: API and guides for DungeonBreak
---

Welcome. Use the sidebar to browse the **Python API** and guides.
`,
    "utf8"
  );
}
const apiMeta = join(apiBase, "meta.json");
mkdirSync(apiBase, { recursive: true });
writeFileSync(
  apiMeta,
  JSON.stringify({ title: "API", pages: ["python"] }, null, 2),
  "utf8"
);
const rootMeta = join(contentDocs, "meta.json");
if (!existsSync(rootMeta)) {
  writeFileSync(
    rootMeta,
    JSON.stringify({ title: "Docs", pages: ["api"] }, null, 2),
    "utf8"
  );
}

// 3) Copy repo docs into docs-site/content/docs/guides (with Fumadocs frontmatter)
const repoDocs = join(root, "docs");
const guidesDir = join(contentDocs, "guides");
const guideFrontmatter = {
  "onboarding.md": { title: "Onboarding", description: "Finding code and examples" },
};
function prependFrontmatter(raw, name) {
  const fm = guideFrontmatter[name] || { title: name.replace(/\.md$/, ""), description: "" };
  const hasExisting = /^\s*---\s*\n/.test(raw);
  const body = hasExisting ? raw.replace(/^\s*---\s*\n[\s\S]*?\n---\s*\n?/, "").trimStart() : raw;
  return `---
title: ${fm.title}
description: ${fm.description || "Guide"}
---

${body}
`;
}
if (existsSync(repoDocs)) {
  mkdirSync(guidesDir, { recursive: true });
  const toCopy = ["onboarding.md"];
  for (const name of toCopy) {
    const src = join(repoDocs, name);
    if (existsSync(src)) {
      const dest = join(guidesDir, name.replace(/\.md$/, ".mdx"));
      const raw = readFileSync(src, "utf8");
      writeFileSync(dest, prependFrontmatter(raw, name), "utf8");
      console.log("Copied", name, "->", dest);
    }
  }
  const guidePages = toCopy.filter((name) => existsSync(join(repoDocs, name))).map((n) => n.replace(/\.md$/, ""));
  if (guidePages.length > 0) {
    writeFileSync(
      join(guidesDir, "meta.json"),
      JSON.stringify({ title: "Guides", pages: guidePages }, null, 2),
      "utf8"
    );
  }
  const rootMeta2 = join(contentDocs, "meta.json");
  let meta = { title: "Docs", pages: ["api"] };
  if (existsSync(rootMeta2)) {
    meta = JSON.parse(String(readFileSync(rootMeta2, "utf8")));
  }
  if (Array.isArray(meta.pages) && !meta.pages.includes("guides")) {
    meta.pages = [...meta.pages, "guides"];
    writeFileSync(rootMeta2, JSON.stringify(meta, null, 2), "utf8");
  }
}

console.log("docs:generate done.");
