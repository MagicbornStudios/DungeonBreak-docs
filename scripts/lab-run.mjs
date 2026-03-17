#!/usr/bin/env node
/**
 * Lab: install only. Content + notebooks—no engine build, no kaplay, no docs-site.
 * Run this to get deps ready; then open notebooks in Jupyter or VS Code.
 * For docs-site dev server use: pnpm docs:dev or pnpm --dir docs-site run dev
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const isWin = process.platform === "win32";

const run = (cmd, args, cwd = root, env = undefined) => {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: isWin,
    env: env ?? process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("node", [join(root, "scripts", "lab-install.mjs")], root, {
  ...process.env,
  DUNGEONBREAK_SKIP_KAPLAY_GAME: "1",
});
console.log("Lab ready. Open notebooks in Jupyter or VS Code (e.g. notebooks/*.ipynb).");
