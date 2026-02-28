#!/usr/bin/env node
/**
 * TypeScript-only lab install.
 * Installs docs-site deps, engine package deps, and builds @dungeonbreak/engine.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const docsSite = join(root, "docs-site");
const enginePkg = join(root, "packages", "engine");
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
  run(enginePkg, ["install", "--no-frozen-lockfile"]);
  run(enginePkg, ["run", "build"]);
}

if (existsSync(docsSite)) {
  run(docsSite, ["install", "--no-frozen-lockfile"]);
}

console.log("Lab install complete. Run: npm run lab");
