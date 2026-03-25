import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const TEST_ROOT = path.join(ROOT_DIR, "tests", "unit");

async function collectTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectTestFiles(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        return [fullPath];
      }
      return [];
    })
  );
  return files.flat().sort((left, right) => left.localeCompare(right));
}

async function main() {
  const testFiles = await collectTestFiles(TEST_ROOT);
  if (testFiles.length === 0) {
    throw new Error("No package-local unit tests were found.");
  }

  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "--test", ...testFiles],
      {
        cwd: ROOT_DIR,
        stdio: "inherit",
      }
    );
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Unit tests failed with exit code ${String(code)}.`));
    });
    child.on("error", reject);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
