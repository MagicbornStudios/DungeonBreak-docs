#!/usr/bin/env node
/**
 * Lab install: deps for notebooks only. No engine build, no docs-site.
 * Installs engine and engine-mcp with --ignore-scripts so the engine's prepare
 * (build) never runs. Notebooks read JSON from contracts/data; they don't need
 * engine dist. For docs-site or game, run pnpm install at root or pnpm engine:build.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const enginePkg = join(root, "packages", "engine");
const engineMcpPkg = join(root, "packages", "engine-mcp");
const isWin = process.platform === "win32";
const pnpm = isWin ? "pnpm.cmd" : "pnpm";

const run = (cwd, args) => {
  const result = spawnSync(pnpm, args, {
    cwd,
    stdio: "inherit",
    shell: isWin,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (existsSync(enginePkg)) {
  run(enginePkg, ["install", "--no-frozen-lockfile", "--ignore-scripts"]);
}

if (existsSync(engineMcpPkg)) {
  run(engineMcpPkg, ["install", "--no-frozen-lockfile", "--ignore-scripts"]);
}

console.log("Lab install complete. Open notebooks/*.ipynb in Jupyter or VS Code.");
