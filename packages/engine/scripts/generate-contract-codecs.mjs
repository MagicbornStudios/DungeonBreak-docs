#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(__dirname, "..");
const schemasDir = join(engineRoot, "src", "escape-the-dungeon", "contracts", "schemas");
const generatedDir = join(engineRoot, "src", "escape-the-dungeon", "contracts", "generated");
const generatedCppDir = join(generatedDir, "cpp");
const generatedCsharpDir = join(generatedDir, "csharp");

const contentSourceSchemaPath = join(schemasDir, "content-source.schema.json");
const bundleSchemaPath = join(schemasDir, "content-pack-bundle.schema.json");

const runQuicktype = (args) => {
  const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "pnpm";
  const commandArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", "pnpm", "exec", "quicktype", ...args] : ["exec", "quicktype", ...args];
  const result = spawnSync(command, commandArgs, {
    cwd: engineRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`quicktype failed with exit code ${String(result.status ?? 1)} for args: ${args.join(" ")}`);
  }
};

mkdirSync(generatedDir, { recursive: true });
mkdirSync(generatedCppDir, { recursive: true });
mkdirSync(generatedCsharpDir, { recursive: true });

runQuicktype([
  "-s",
  "schema",
  contentSourceSchemaPath,
  "-o",
  join(generatedDir, "content-source.ts"),
  "--top-level",
  "ContentSource",
  "--lang",
  "ts",
]);

runQuicktype([
  "-s",
  "schema",
  bundleSchemaPath,
  "-o",
  join(generatedDir, "content-pack-bundle.ts"),
  "--top-level",
  "ContentPackBundle",
  "--lang",
  "ts",
]);

runQuicktype([
  "-s",
  "schema",
  contentSourceSchemaPath,
  "-o",
  join(generatedCppDir, "content-source.hpp"),
  "--top-level",
  "ContentSource",
  "--lang",
  "c++",
  "--namespace",
  "DungeonBreakContracts",
  "--source-style",
  "single-source",
  "--include-location",
  "global-include",
]);

runQuicktype([
  "-s",
  "schema",
  bundleSchemaPath,
  "-o",
  join(generatedCppDir, "content-pack-bundle.hpp"),
  "--top-level",
  "ContentPackBundle",
  "--lang",
  "c++",
  "--namespace",
  "DungeonBreakContracts",
  "--source-style",
  "single-source",
  "--include-location",
  "global-include",
]);

runQuicktype([
  "-s",
  "schema",
  contentSourceSchemaPath,
  "-o",
  join(generatedCsharpDir, "ContentSource.cs"),
  "--top-level",
  "ContentSource",
  "--lang",
  "cs",
  "--namespace",
  "DungeonBreak.Contracts",
  "--framework",
  "SystemTextJson",
]);

runQuicktype([
  "-s",
  "schema",
  bundleSchemaPath,
  "-o",
  join(generatedCsharpDir, "ContentPackBundle.cs"),
  "--top-level",
  "ContentPackBundle",
  "--lang",
  "cs",
  "--namespace",
  "DungeonBreak.Contracts",
  "--framework",
  "SystemTextJson",
]);

console.log("[content-codegen] generated TS/C++/C# contract code from JSON Schema");
