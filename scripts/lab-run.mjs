#!/usr/bin/env node
/**
 * One-command lab for TypeScript runtime:
 * - install/build local package + docs deps
 * - regenerate docs metadata
 * - start docs-site dev server
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const isWin = process.platform === "win32";

const run = (cmd, args, cwd = root) => {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: isWin,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("node", [join(root, "scripts", "lab-install.mjs")]);
run("node", [join(root, "scripts", "docs-generate-mdx.mjs")]);
run("node", [join(root, "scripts", "docs-serve.mjs")]);
