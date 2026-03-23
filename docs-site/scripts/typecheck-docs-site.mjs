import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsSiteDir = path.resolve(__dirname, "..");

function runPnpm(args) {
  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", `pnpm ${args.join(" ")}`], {
      cwd: docsSiteDir,
      stdio: "inherit",
    });
    return;
  }

  execFileSync("pnpm", args, {
    cwd: docsSiteDir,
    stdio: "inherit",
  });
}

const generatedTypeDirs = [
  path.join(docsSiteDir, ".next", "dev", "types"),
  path.join(docsSiteDir, ".next", "types"),
];

for (const dir of generatedTypeDirs) {
  rmSync(dir, { recursive: true, force: true });
}

rmSync(path.join(docsSiteDir, "tsconfig.tsbuildinfo"), { force: true });

runPnpm(["exec", "next", "typegen"]);

const cacheLifeFiles = [
  path.join(docsSiteDir, ".next", "types", "cache-life.ts"),
  path.join(docsSiteDir, ".next", "types", "cache-life.d.ts"),
];

for (const file of cacheLifeFiles) {
  mkdirSync(path.dirname(file), { recursive: true });
  if (!existsSync(file)) {
    writeFileSync(file, "export {};\n");
  }
}

runPnpm(["exec", "tsc", "--noEmit"]);
