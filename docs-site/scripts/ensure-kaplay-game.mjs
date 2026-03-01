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

if (!existsSync(join(kaplayDistDir, "game.js"))) {
  console.log("[ensure-kaplay-game] building kaplay-demo...");
  const result = spawnSync(pnpmCmd, ["--dir", kaplayDemoDir, "run", "build"], {
    stdio: "inherit",
    shell: false,
    cwd: docsSiteDir,
  });
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
