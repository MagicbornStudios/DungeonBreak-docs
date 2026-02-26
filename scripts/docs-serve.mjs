#!/usr/bin/env node
/**
 * Start the Fumadocs docs-site dev server in the background.
 * Used by npm run lab. Prints the docs URL (e.g. http://localhost:3000).
 * If docs-site node_modules are missing, runs pnpm install there first.
 */
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const docsSite = join(root, "docs-site");
const isWin = process.platform === "win32";
const nextBin = join(docsSite, "node_modules", "next", "dist", "bin", "next");

function pnpmSpawn(commandArgs, options) {
  if (isWin) {
    return spawn("cmd.exe", ["/d", "/s", "/c", `pnpm ${commandArgs.join(" ")}`], options);
  }
  return spawn("pnpm", commandArgs, options);
}

function pnpmSpawnSync(commandArgs, options) {
  if (isWin) {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `pnpm ${commandArgs.join(" ")}`], options);
  }
  return spawnSync("pnpm", commandArgs, options);
}

function ensureDocsSiteDeps() {
  if (existsSync(nextBin)) return;
  console.log("docs-site node_modules missing or incomplete; installing dependencies...");
  const r = pnpmSpawnSync(["install", "--no-frozen-lockfile"], {
    cwd: docsSite,
    stdio: "inherit",
  });
  if (r.status !== 0 || !existsSync(nextBin)) {
    console.error("Install failed. From repo root run: npm run lab:install");
    process.exit(1);
  }
}

ensureDocsSiteDeps();

// #region agent log
const LOG_PATH = join(root, ".cursor", "debug.log");
const DEBUG_LOG = (msg, data) => {
  const payload = {
    location: "scripts/docs-serve.mjs",
    message: msg,
    data: data ?? {},
    timestamp: Date.now(),
    hypothesisId: data?.hypothesisId ?? "H",
  };
  try {
    appendFileSync(LOG_PATH, JSON.stringify(payload) + "\n");
  } catch (_) {}
  fetch("http://127.0.0.1:7244/ingest/4272752d-d42e-4d13-ab4b-9196da40dadf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
};
// #endregion

// #region agent log
DEBUG_LOG("docs-serve: spawn start", {
  hypothesisId: "H1",
  cwd: docsSite,
  cwdExists: existsSync(docsSite),
  isWin,
  command: isWin ? "cmd.exe /c pnpm" : "pnpm",
  args: ["run", "dev"],
});
// #endregion

const child = pnpmSpawn(["run", "dev"], {
  cwd: docsSite,
  stdio: "inherit",
});

// #region agent log
child.on("error", (err) => {
  DEBUG_LOG("docs-serve: child spawn error", {
    hypothesisId: "H2",
    error: String(err?.message ?? err),
  });
});
child.on("exit", (code, signal) => {
  DEBUG_LOG("docs-serve: child exited", {
    hypothesisId: "H1",
    code: code ?? null,
    signal: signal ?? null,
    pid: child.pid ?? null,
  });
  process.nextTick(() => process.exit(code !== undefined && code !== null ? code : 0));
});
DEBUG_LOG("docs-serve: child spawned", {
  hypothesisId: "H3",
  pid: child.pid ?? null,
});
// #endregion

console.log("Docs site: http://localhost:3000");
