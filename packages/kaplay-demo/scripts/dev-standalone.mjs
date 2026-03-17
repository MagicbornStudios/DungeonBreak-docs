import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const lockPath = join(root, ".dev-standalone.lock.json");

function readLock() {
  if (!existsSync(lockPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    return null;
  }
}

function processIsAlive(pid) {
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function claimLock() {
  const existing = readLock();
  if (existing && processIsAlive(existing.pid)) {
    throw new Error(
      `Standalone dev is already running (pid ${String(existing.pid)}). Stop that process before starting another.`
    );
  }
  if (existing) {
    unlinkSync(lockPath);
  }
  writeFileSync(
    lockPath,
    JSON.stringify(
      {
        pid: process.pid,
        startedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

function releaseLock() {
  const existing = readLock();
  if (existing?.pid === process.pid && existsSync(lockPath)) {
    unlinkSync(lockPath);
  }
}

function createPnpmSpawn(command) {
  if (process.platform === "win32") {
    return {
      cmd: "cmd.exe",
      args: ["/d", "/s", "/c", `pnpm ${command}`],
    };
  }
  return {
    cmd: "pnpm",
    args: command.split(" "),
  };
}

function runOnce(command) {
  return new Promise((resolve, reject) => {
    const invocation = createPnpmSpawn(command);
    const child = spawn(invocation.cmd, invocation.args, {
      cwd: root,
      stdio: "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(`Command failed: pnpm ${command} (exit ${String(code ?? 1)})`)
      );
    });
    child.on("error", reject);
  });
}

function spawnPersistent(command) {
  const invocation = createPnpmSpawn(command);
  return spawn(invocation.cmd, invocation.args, {
    cwd: root,
    stdio: "inherit",
  });
}

async function main() {
  claimLock();
  await runOnce("run build");

  const children = [
    spawnPersistent("run dev"),
    spawnPersistent("exec node scripts/serve-standalone.mjs"),
  ];

  const shutdown = () => {
    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGINT");
      }
    }
    releaseLock();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", releaseLock);

  for (const child of children) {
    child.on("exit", (code) => {
      if (code === 0 || code === null) {
        return;
      }
      shutdown();
      process.exit(code);
    });
    child.on("error", (error) => {
      console.error(error);
      shutdown();
      process.exit(1);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
