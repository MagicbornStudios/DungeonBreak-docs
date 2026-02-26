#!/usr/bin/env node
/**
 * Orchestrate: run C++ MDX generator, write Python API stub, optionally copy repo docs.
 * Run after docs:cpp. Use: npm run docs:generate
 */
import { mkdirSync, writeFileSync, readdirSync, copyFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const docsSite = join(root, "docs-site");
const contentDocs = join(docsSite, "content", "docs");
const apiBase = join(contentDocs, "api");

if (!existsSync(docsSite)) {
  console.warn("docs-site/ not found. Skip docs:generate.");
  process.exit(0);
}

// 1) C++ MDX from Doxygen XML
const cppScript = join(root, "scripts", "docs-generate-cpp-mdx.mjs");
const cppResult = spawnSync("node", [cppScript], { cwd: root, stdio: "inherit" });
if (cppResult.status !== 0) {
  console.warn("C++ MDX generator failed; continuing.");
}

// 2) Python API stub + copy pdoc output so the docs site can link to it
const pythonDir = join(apiBase, "python");
mkdirSync(pythonDir, { recursive: true });
const pdocOut = join(root, "docs", "api", "python");
const publicPython = join(docsSite, "public", "api", "python");
if (existsSync(pdocOut)) {
  mkdirSync(publicPython, { recursive: true });
  for (const name of readdirSync(pdocOut)) {
    const src = join(pdocOut, name);
    const dest = join(publicPython, name);
    if (statSync(src).isFile()) {
      copyFileSync(src, dest);
    }
  }
  console.log("Copied pdoc output to docs-site/public/api/python/");
}
const pythonMdx = `---
title: Python API
description: dungeonbreak_narrative and related Python APIs (pdoc)
---

## Overview

The Python API is generated when you run \`npm run lab\` (or \`npm run docs:python\`). It covers \`dungeonbreak_narrative\` and related modules.

## Full reference (pdoc)

<div className="rounded-md border bg-card py-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg">
  <a href="/api/python/index.html" target="_blank" rel="noopener noreferrer" className="block px-6">
    <div className="space-y-1.5">
      <div className="font-semibold leading-none tracking-tight">Python API (pdoc)</div>
      <p className="text-sm text-muted-foreground">
        Open the full module and function reference in a new tab. Available after \`npm run lab\` or \`npm run docs:python\`.
      </p>
    </div>
  </a>
</div>
`;
writeFileSync(join(pythonDir, "index.mdx"), pythonMdx, "utf8");
console.log("Python API stub written to docs-site/content/docs/api/python/");

// 3) Root docs index and meta so sidebar shows API
const rootIndex = join(contentDocs, "index.mdx");
if (!existsSync(rootIndex)) {
  mkdirSync(contentDocs, { recursive: true });
  writeFileSync(
    rootIndex,
    `---
title: DungeonBreak Docs
description: API and guides for DungeonBreak
---

Welcome. Use the sidebar to browse the **C++ API** (by module) and **Python API**.
`,
    "utf8"
  );
}
const apiMeta = join(apiBase, "meta.json");
mkdirSync(apiBase, { recursive: true });
writeFileSync(
  apiMeta,
  JSON.stringify({ title: "API", pages: ["cpp", "python"] }, null, 2),
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

// 4) Optional: copy repo docs into docs-site/content/docs/guides (with Fumadocs frontmatter)
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
