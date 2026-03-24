import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const managedTypeIncludes = new Set([
  ".next/dev/types/**/*.ts",
  ".next/types/**/*.ts",
  ".next/types/**/*.d.ts",
  ".next/types/validator.ts",
]);

for (const dir of generatedTypeDirs) {
  rmSync(dir, { recursive: true, force: true });
}

rmSync(path.join(docsSiteDir, "tsconfig.tsbuildinfo"), { force: true });

runPnpm(["exec", "next", "typegen"]);

const tsconfigPath = path.join(docsSiteDir, "tsconfig.json");
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8"));
const include = Array.isArray(tsconfig.include) ? tsconfig.include : [];
tsconfig.include = [
  ...new Set([
    ...include.filter((entry) => !managedTypeIncludes.has(entry)),
    ".next/types/**/*.d.ts",
    ".next/types/validator.ts",
  ]),
];
writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);

const cacheLifeFiles = generatedTypeDirs.flatMap((dir) => [
  path.join(dir, "cache-life.ts"),
  path.join(dir, "cache-life.d.ts"),
]);

for (const file of cacheLifeFiles) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, "export {};\n");
}

runPnpm(["exec", "tsc", "--noEmit"]);
