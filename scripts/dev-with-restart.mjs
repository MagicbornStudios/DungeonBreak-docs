#!/usr/bin/env node
/**
 * Restart the planning Next server if it exits. Use for "always on" dev.
 * Run from repo root: node scripts/dev-with-restart.mjs  or  pnpm run dev:planning:restart
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const planningDir = path.join(root, "packages", "planning");

async function run() {
  return new Promise((resolve) => {
    const child = spawn("pnpm", ["run", "dev"], {
      cwd: planningDir,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, REPOPLANNER_PROJECT_ROOT: root },
    });
    child.on("exit", (code) => resolve(code));
  });
}

for (;;) {
  console.log(`[${new Date().toISOString()}] Starting planning server...`);
  await run();
  console.log(`[${new Date().toISOString()}] Server exited. Restarting in 2s...`);
  await new Promise((r) => setTimeout(r, 2000));
}
