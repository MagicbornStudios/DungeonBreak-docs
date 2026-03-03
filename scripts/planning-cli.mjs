#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const cliPath = join(repoRoot, "packages", "planning-mcp", "dist", "cli.js");

const args = process.argv.slice(2);
const result = spawnSync(process.execPath, [cliPath, ...args], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
