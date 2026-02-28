#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsSiteDir = path.resolve(__dirname, "..");
const engineDir = path.resolve(docsSiteDir, "../packages/engine");
const enginePackageJson = path.resolve(engineDir, "package.json");
const engineDistEntry = path.resolve(engineDir, "dist/index.js");
const skip = process.env.DUNGEONBREAK_SKIP_ENGINE_BOOTSTRAP === "1";
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const pnpmExecPath = process.env.npm_execpath;
const jsEntrypointPattern = /\.(c|m)?js$/i;
const require = createRequire(import.meta.url);

const resolvePnpmRunner = () => {
  if (!pnpmExecPath) {
    return { command: pnpmCmd, prefixArgs: [] };
  }
  if (jsEntrypointPattern.test(pnpmExecPath)) {
    return { command: process.execPath, prefixArgs: [pnpmExecPath] };
  }
  return { command: pnpmExecPath, prefixArgs: [] };
};

const resolveInstalledEngineDir = () => {
  const linkedEngineDir = path.resolve(docsSiteDir, "node_modules/@dungeonbreak/engine");
  if (fs.existsSync(linkedEngineDir)) {
    return fs.realpathSync(linkedEngineDir);
  }

  // Fallback: if package entry resolves, derive package root from dist entry.
  try {
    const resolvedEntrypoint = require.resolve("@dungeonbreak/engine", { paths: [docsSiteDir] });
    return path.resolve(path.dirname(resolvedEntrypoint), "..");
  } catch {
    return null;
  }
};

const hydrateInstalledEngineDist = () => {
  const installedEngineDir = resolveInstalledEngineDir();
  if (!installedEngineDir) {
    return false;
  }

  const installedDistDir = path.resolve(installedEngineDir, "dist");
  const installedDistEntry = path.resolve(installedDistDir, "index.js");
  if (fs.existsSync(installedDistEntry)) {
    return true;
  }

  const sourceDistDir = path.resolve(engineDir, "dist");
  if (!fs.existsSync(sourceDistDir)) {
    return false;
  }

  fs.mkdirSync(installedDistDir, { recursive: true });
  fs.cpSync(sourceDistDir, installedDistDir, { recursive: true, force: true });
  return fs.existsSync(installedDistEntry);
};

if (skip) {
  console.log("[ensure-engine-dist] skipped by DUNGEONBREAK_SKIP_ENGINE_BOOTSTRAP=1");
  process.exit(0);
}

if (!fs.existsSync(enginePackageJson)) {
  console.log("[ensure-engine-dist] no local engine package found; skipping bootstrap.");
  process.exit(0);
}

const run = (args) => {
  const { command, prefixArgs } = resolvePnpmRunner();
  const commandArgs = [...prefixArgs, ...args];
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`[ensure-engine-dist] command failed: ${command} ${commandArgs.join(" ")}`);
  }
};

if (!fs.existsSync(engineDistEntry)) {
  console.log("[ensure-engine-dist] engine dist missing; installing/building local engine package...");
  run(["--dir", engineDir, "install", "--frozen-lockfile"]);
  run(["--dir", engineDir, "run", "build"]);
} else {
  console.log("[ensure-engine-dist] engine source dist already present.");
}

if (!fs.existsSync(engineDistEntry)) {
  throw new Error("[ensure-engine-dist] engine dist was not generated.");
}

if (hydrateInstalledEngineDist()) {
  console.log("[ensure-engine-dist] installed @dungeonbreak/engine dist is ready.");
} else {
  console.log("[ensure-engine-dist] installed @dungeonbreak/engine not linked yet (expected during preinstall).");
}
