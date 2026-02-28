#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsSiteDir = path.resolve(__dirname, "..");
const engineDir = path.resolve(docsSiteDir, "../packages/engine");
const enginePackageJson = path.resolve(engineDir, "package.json");
const engineDistEntry = path.resolve(engineDir, "dist/index.js");
const skip = process.env.DUNGEONBREAK_SKIP_ENGINE_BOOTSTRAP === "1";
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (skip) {
  console.log("[ensure-engine-dist] skipped by DUNGEONBREAK_SKIP_ENGINE_BOOTSTRAP=1");
  process.exit(0);
}

if (!fs.existsSync(enginePackageJson)) {
  console.log("[ensure-engine-dist] no local engine package found; skipping bootstrap.");
  process.exit(0);
}

if (fs.existsSync(engineDistEntry)) {
  console.log("[ensure-engine-dist] engine dist already present.");
  process.exit(0);
}

const run = (args) => {
  const result = spawnSync(pnpmCmd, args, {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`[ensure-engine-dist] command failed: ${pnpmCmd} ${args.join(" ")}`);
  }
};

console.log("[ensure-engine-dist] engine dist missing; installing/building local engine package...");
run(["--dir", engineDir, "install", "--frozen-lockfile"]);
run(["--dir", engineDir, "run", "build"]);

if (!fs.existsSync(engineDistEntry)) {
  throw new Error("[ensure-engine-dist] engine dist was not generated.");
}

console.log("[ensure-engine-dist] engine dist ready.");
