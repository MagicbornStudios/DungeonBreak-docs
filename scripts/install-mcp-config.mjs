#!/usr/bin/env node
/**
 * Install/merge local DungeonBreak MCP server entries for Cursor and Codex.
 *
 * Usage:
 *   node scripts/install-mcp-config.mjs --target all
 *   node scripts/install-mcp-config.mjs --target cursor --repo-path C:/path/to/DungeonBreak-docs
 *   node scripts/install-mcp-config.mjs --target codex --dry-run
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = join(fileURLToPath(import.meta.url), "..");
const repoRootDefault = join(scriptDir, "..");

const parseArgValue = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return undefined;
  }
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(name);

const target = (parseArgValue("--target") ?? "all").toLowerCase();
const dryRun = hasFlag("--dry-run");
const repoPath = parseArgValue("--repo-path") ?? repoRootDefault;

if (!["all", "cursor", "codex"].includes(target)) {
  console.error("Invalid --target. Use: all | cursor | codex");
  process.exit(1);
}

const normalizePath = (value) => value.replaceAll("\\", "/");
const engineMcpDir = normalizePath(join(repoPath, "packages", "engine-mcp"));
const planningMcpDir = normalizePath(join(repoPath, "packages", "planning-mcp"));
const engineArgs = ["--dir", engineMcpDir, "run", "dev"];
const planningArgs = ["--dir", planningMcpDir, "run", "dev"];

const writeOrPrint = (path, content) => {
  if (dryRun) {
    console.log(`--- ${path} (dry-run) ---`);
    console.log(content);
    return;
  }
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content, "utf8");
  console.log(`Updated: ${path}`);
};

const installCursorConfig = () => {
  const cursorPath = join(homedir(), ".cursor", "mcp.json");
  let parsed = { mcpServers: {} };
  if (existsSync(cursorPath)) {
    try {
      parsed = JSON.parse(readFileSync(cursorPath, "utf8"));
    } catch {
      parsed = { mcpServers: {} };
    }
  }
  if (typeof parsed !== "object" || parsed === null) {
    parsed = { mcpServers: {} };
  }
  if (typeof parsed.mcpServers !== "object" || parsed.mcpServers === null) {
    parsed.mcpServers = {};
  }
  parsed.mcpServers["dungeonbreak-engine"] = {
    command: "pnpm",
    args: engineArgs,
  };
  parsed.mcpServers["dungeonbreak-planning"] = {
    command: "pnpm",
    args: planningArgs,
  };
  writeOrPrint(cursorPath, `${JSON.stringify(parsed, null, 2)}\n`);
};

const toTomlArray = (items) => `[${items.map((item) => `"${String(item).replaceAll('"', '\\"')}"`).join(", ")}]`;

const installCodexConfig = () => {
  const codexPath = join(homedir(), ".codex", "config.toml");
  const block = [
    "[mcp_servers.dungeonbreak_engine]",
    'command = "pnpm"',
    `args = ${toTomlArray(engineArgs)}`,
    "",
    "[mcp_servers.dungeonbreak_planning]",
    'command = "pnpm"',
    `args = ${toTomlArray(planningArgs)}`,
    "",
  ].join("\n");

  const existing = existsSync(codexPath) ? readFileSync(codexPath, "utf8") : "";
  const header = "[mcp_servers.dungeonbreak_engine]";
  const planningHeader = "[mcp_servers.dungeonbreak_planning]";
  const hasEngine = existing.includes(header);
  const hasPlanning = existing.includes(planningHeader);

  let next;
  if (hasEngine || hasPlanning) {
    let updated = existing;
    if (hasEngine) {
      const headerIndex = updated.indexOf(header);
      const before = updated.slice(0, headerIndex).trimEnd();
      const fromHeader = updated.slice(headerIndex);
      const nextHeaderMatch = fromHeader.slice(header.length).match(/\n\[[^\]]+\]/);
      const nextHeaderIndex = nextHeaderMatch?.index ?? -1;
      const after =
        nextHeaderIndex >= 0
          ? fromHeader.slice(header.length + nextHeaderIndex + 1).trimStart()
          : "";
      updated = `${before}\n\n${block.trimEnd()}${after ? `\n\n${after}` : ""}`.trimStart();
    } else if (!hasEngine && hasPlanning) {
      const planningIndex = updated.indexOf(planningHeader);
      const before = updated.slice(0, planningIndex).trimEnd();
      const fromHeader = updated.slice(planningIndex);
      const nextHeaderMatch = fromHeader.slice(planningHeader.length).match(/\n\[[^\]]+\]/);
      const nextHeaderIndex = nextHeaderMatch?.index ?? -1;
      const after =
        nextHeaderIndex >= 0
          ? fromHeader.slice(planningHeader.length + nextHeaderIndex + 1).trimStart()
          : "";
      updated = `${before}\n\n${block.trimEnd()}${after ? `\n\n${after}` : ""}`.trimStart();
    }
    next = updated;
  } else {
    next = `${existing.trimEnd()}\n\n${block}`.trimStart();
  }

  writeOrPrint(codexPath, `${next.trimEnd()}\n`);
};

if (target === "all" || target === "cursor") {
  installCursorConfig();
}
if (target === "all" || target === "codex") {
  installCodexConfig();
}

if (dryRun) {
  console.log("Dry-run complete. Re-run without --dry-run to write files.");
}
