#!/usr/bin/env node
/**
 * Convert dungeonbreak_narrative.json to MDX under content/docs/api/python.
 * Run from docs-site: node scripts/generate-python-mdx.mjs
 */
import { readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Python from "fumadocs-python";

const docsSite = join(fileURLToPath(import.meta.url), "..", "..");
const jsonPath = join(docsSite, "dungeonbreak_narrative.json");
const outDir = join(docsSite, "content", "docs", "api", "python");

if (!existsSync(jsonPath)) {
  console.warn("No dungeonbreak_narrative.json; run npm run docs:python from repo root.");
  process.exit(0);
}

const content = JSON.parse(readFileSync(jsonPath, "utf8"));
const converted = Python.convert(content, { baseUrl: "/docs" });

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await Python.write(converted, { outDir });
console.log("Python API MDX written to content/docs/api/python/");
