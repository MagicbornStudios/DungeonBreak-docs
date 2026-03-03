#!/usr/bin/env node
/**
 * Build kaplay-demo and copy dist to public/game for Grid mode iframe.
 * Skips if kaplay-demo dist is missing; does not fail the build.
 */
import { existsSync, mkdirSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsSiteDir = join(__dirname, "..");
const kaplayDemoDir = join(docsSiteDir, "..", "packages", "kaplay-demo");
const kaplayDistDir = join(kaplayDemoDir, "dist");
const publicGameDir = join(docsSiteDir, "public", "game");

const skip = process.env.DUNGEONBREAK_SKIP_KAPLAY_GAME === "1";

if (skip) {
  console.log("[ensure-kaplay-game] skipped by DUNGEONBREAK_SKIP_KAPLAY_GAME=1");
  process.exit(0);
}

if (!existsSync(kaplayDemoDir)) {
  console.log("[ensure-kaplay-game] packages/kaplay-demo not found; skipping.");
  process.exit(0);
}

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function runPnpm(args) {
  return spawnSync(pnpmCmd, args, {
    stdio: "inherit",
    shell: false,
    cwd: docsSiteDir,
  });
}

function ensureKaplayDependencies() {
  console.log("[ensure-kaplay-game] installing kaplay-demo dependencies...");
  const installResult = runPnpm(["--dir", kaplayDemoDir, "install"]);
  if (installResult.status !== 0) {
    console.error("[ensure-kaplay-game] failed to install kaplay-demo dependencies.");
    process.exit(1);
  }
}

if (!existsSync(join(kaplayDistDir, "game.js"))) {
  ensureKaplayDependencies();
  console.log("[ensure-kaplay-game] building kaplay-demo...");
  const result = runPnpm(["--dir", kaplayDemoDir, "run", "build"]);
  if (result.status !== 0) {
    console.warn("[ensure-kaplay-game] kaplay-demo build failed; Grid mode iframe may 404.");
    process.exit(0);
  }
}

if (existsSync(kaplayDistDir)) {
  mkdirSync(publicGameDir, { recursive: true });
  cpSync(kaplayDistDir, publicGameDir, { recursive: true, force: true });
  console.log("[ensure-kaplay-game] copied kaplay-demo dist to public/game");
}
