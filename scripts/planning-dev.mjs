#!/usr/bin/env node
/**
 * Default dev for planning: start the Next server and open the web app in the browser.
 * One unified way to run planning (web). For desktop window use: pnpm desktop
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const planningDir = path.join(root, "packages", "planning");
const PLANNING_URL = "http://localhost:3101";
const WAIT_MS = 5000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForUrl(url, maxAttempts = 40) {
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

function openBrowser(url) {
  const start =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  spawn(start, [url], { shell: true, stdio: "ignore" });
}

const next = spawn("pnpm", ["run", "dev"], {
  cwd: planningDir,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, REPOPLANNER_PROJECT_ROOT: root },
});

next.on("error", (err) => {
  console.error("Failed to start planning server:", err);
  process.exit(1);
});

next.on("exit", (code) => {
  if (code !== null && code !== 0) process.exit(code ?? 1);
});

await wait(WAIT_MS);
try {
  await waitForUrl(PLANNING_URL);
  openBrowser(PLANNING_URL);
  console.log("Planning (web):", PLANNING_URL);
} catch (e) {
  console.warn("Server may not be ready yet; open", PLANNING_URL, "when it is.");
}
