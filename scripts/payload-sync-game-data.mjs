#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const docsSite = join(root, "docs-site");
const tsxCli = join(docsSite, "node_modules", "tsx", "dist", "cli.mjs");
const syncScript = join(docsSite, "scripts", "sync-game-snapshot.ts");

if (!existsSync(tsxCli)) {
  console.error(
    "Missing docs-site dependencies. Run `pnpm --dir docs-site install --no-frozen-lockfile` first."
  );
  process.exit(1);
}

const result = spawnSync("node", [tsxCli, syncScript], {
  cwd: docsSite,
  env: {
    ...process.env,
    PAYLOAD_CONFIG_PATH: "payload.config.ts",
  },
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
