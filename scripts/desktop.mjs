#!/usr/bin/env node
/**
 * Starts the Next planning server in the background, waits for it to be ready,
 * then launches the Neutralino desktop app. Usage: pnpm desktop
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const planningDir = path.join(root, "packages", "planning");
const neutralinoDir = path.join(root, "packages", "planning-neutralino");
const PLANNING_URL = "http://localhost:3101";
const WAIT_MS = 8000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForUrl(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryFetch = () => {
      attempts++;
      fetch(url, { method: "HEAD" })
        .then((r) => (r.ok ? resolve() : tryFetch()))
        .catch(() => {
          if (attempts >= maxAttempts) reject(new Error(`Timeout waiting for ${url}`));
          else setTimeout(tryFetch, 500);
        });
    };
    tryFetch();
  });
}

const next = spawn("pnpm", ["run", "dev"], {
      cwd: planningDir,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, REPOPLANNER_PROJECT_ROOT: root },
    });

next.on("error", (err) => {
  console.error("Failed to start Next:", err);
  process.exit(1);
});

next.on("exit", (code) => {
  if (code !== null && code !== 0) process.exit(code ?? 1);
});

await wait(WAIT_MS);
try {
  await waitForUrl(PLANNING_URL);
} catch (e) {
  console.warn("Planning server may not be ready yet; desktop will load when it is.", e.message);
}

const neu = spawn("pnpm", ["run", "run"], {
  cwd: neutralinoDir,
  stdio: "inherit",
  shell: true,
});

neu.on("error", (err) => {
  console.error("Failed to start Neutralino:", err);
  process.exit(1);
});

neu.on("exit", (code) => {
  next.kill();
  process.exit(code ?? 0);
});
