#!/usr/bin/env node
/**
 * Lab deps: engine + engine-mcp only (--ignore-scripts). Skips engine build.
 * - `pnpm lab:install` — always run pnpm (refresh lock / node_modules).
 * - Called with `--if-needed` from `pnpm lab` — no-op when lock + package.jsons unchanged.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const enginePkg = join(root, "packages", "engine");
const engineMcpPkg = join(root, "packages", "engine-mcp");
const fingerprintFile = join(root, ".dungeonbreak", "lab-deps.sha256");
const isWin = process.platform === "win32";

const fingerprintInputs = () => {
  const files = [
    join(root, "pnpm-lock.yaml"),
    join(enginePkg, "package.json"),
    join(engineMcpPkg, "package.json"),
  ];
  const h = createHash("sha256");
  for (const f of files) {
    if (existsSync(f)) {
      h.update(readFileSync(f));
    }
  }
  return h.digest("hex");
};

const nodeModulesOk = () =>
  existsSync(join(enginePkg, "node_modules")) &&
  existsSync(join(engineMcpPkg, "node_modules"));

const shouldSkipInstall = (ifNeeded) => {
  if (!ifNeeded) {
    return false;
  }
  if (!nodeModulesOk()) {
    return false;
  }
  if (!existsSync(fingerprintFile)) {
    return false;
  }
  try {
    return readFileSync(fingerprintFile, "utf8").trim() === fingerprintInputs();
  } catch {
    return false;
  }
};

const writeFingerprint = () => {
  mkdirSync(dirname(fingerprintFile), { recursive: true });
  writeFileSync(fingerprintFile, `${fingerprintInputs()}\n`, "utf8");
};

const runPnpmInstall = () => {
  const args = [
    "install",
    "--filter",
    "@dungeonbreak/engine...",
    "--filter",
    "@dungeonbreak/engine-mcp...",
    "--ignore-scripts",
    "--no-frozen-lockfile",
  ];
  if (isWin) {
    try {
      execFileSync(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", "pnpm", ...args],
        {
          cwd: root,
          stdio: "inherit",
          env: {
            ...process.env,
            DUNGEONBREAK_SKIP_KAPLAY_GAME:
              process.env.DUNGEONBREAK_SKIP_KAPLAY_GAME ?? "1",
          },
        }
      );
    } catch (e) {
      const code = e && typeof e === "object" && "status" in e ? e.status : 1;
      process.exit(typeof code === "number" ? code : 1);
    }
    return;
  }
  const result = spawnSync("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      DUNGEONBREAK_SKIP_KAPLAY_GAME:
        process.env.DUNGEONBREAK_SKIP_KAPLAY_GAME ?? "1",
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const ifNeeded = process.argv.includes("--if-needed");

if (!(existsSync(enginePkg) && existsSync(engineMcpPkg))) {
  console.error(
    "lab-install: expected packages/engine and packages/engine-mcp"
  );
  process.exit(1);
}

if (shouldSkipInstall(ifNeeded)) {
  console.log("Lab deps unchanged — skipping pnpm install.");
  process.exit(0);
}

runPnpmInstall();
writeFingerprint();
console.log("Lab install complete.");
