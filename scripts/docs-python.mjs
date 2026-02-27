#!/usr/bin/env node
/**
 * Generate Python API docs as JSON via fumapy-generate (fumadocs-python).
 * Requires: uv, docs-site/node_modules/fumadocs-python (pnpm install in docs-site).
 * Run from repo root: npm run docs:python
 * Output: docs-site/dungeonbreak_narrative.json for docs:generate to convert to MDX.
 */
import { spawnSync } from "node:child_process";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const docsSite = join(root, "docs-site");
const isWin = process.platform === "win32";
const fumadocsPython = join(docsSite, "node_modules", "fumadocs-python");

if (!existsSync(fumadocsPython)) {
  console.warn(
    "docs-site/node_modules/fumadocs-python not found. Run: cd docs-site && pnpm install"
  );
  process.exit(1);
}

// Ensure venv and package are available
const sync = spawnSync("uv", ["sync"], { cwd: root, stdio: "inherit", shell: isWin });
if (sync.status !== 0) process.exit(sync.status ?? 1);

// Install fumadocs-python into venv so fumapy-generate is available
const pipInstall = spawnSync("uv", ["pip", "install", fumadocsPython], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
});
if (pipInstall.status !== 0) process.exit(pipInstall.status ?? 1);

// Generate JSON (fumapy-generate writes to cwd, typically <package>.json)
const gen = spawnSync("uv", ["run", "fumapy-generate", "dungeonbreak_narrative"], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
});
if (gen.status !== 0) process.exit(gen.status ?? 1);

const jsonInRoot = join(root, "dungeonbreak_narrative.json");
const jsonInDocsSite = join(docsSite, "dungeonbreak_narrative.json");
if (existsSync(jsonInRoot)) {
  mkdirSync(docsSite, { recursive: true });
  copyFileSync(jsonInRoot, jsonInDocsSite);
  console.log("Python API JSON written to docs-site/dungeonbreak_narrative.json");
} else {
  console.warn("fumapy-generate did not produce dungeonbreak_narrative.json in repo root");
}
