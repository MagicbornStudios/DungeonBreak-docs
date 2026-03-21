#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(__dirname, "..");
const contractsRoot = join(engineRoot, "src", "escape-the-dungeon", "contracts");
const dataDir = join(contractsRoot, "data");
const sourcePath = join(contractsRoot, "source", "content-source.json");
const generatedDir = join(contractsRoot, "generated");
const generatedCppDir = join(generatedDir, "cpp");
const generatedCsharpDir = join(generatedDir, "csharp");

const source = readJson(sourcePath);

const directPackEntries = [
  {
    packId: "entityTypes",
    title: "Entity Types",
    kind: "lookup",
    exportName: "ENTITY_TYPE_PACK",
    sourceFile: "contracts/data/lookup_entity_types.json",
    bundleKey: "entityTypes",
  },
  {
    packId: "combatStats",
    title: "Combat Stats",
    kind: "lookup",
    exportName: "COMBAT_STAT_PACK",
    sourceFile: "contracts/data/lookup_combat_stats.json",
    bundleKey: "combatStats",
  },
  {
    packId: "effects",
    title: "Effects",
    kind: "lookup",
    exportName: "EFFECT_PACK",
    sourceFile: "contracts/data/lookup_effects.json",
  },
  {
    packId: "equipmentSlots",
    title: "Equipment Slots",
    kind: "lookup",
    exportName: "EQUIPMENT_SLOT_PACK",
    sourceFile: "contracts/data/lookup_equipment_slots.json",
  },
  {
    packId: "skillStats",
    title: "Skill Stats",
    kind: "lookup",
    exportName: "SKILL_STAT_PACK",
    sourceFile: "contracts/data/lookup_skill_stats.json",
    bundleKey: "skillStats",
  },
  {
    packId: "narrativeStats",
    title: "Narrative Stats",
    kind: "lookup",
    exportName: "NARRATIVE_STAT_PACK",
    sourceFile: "contracts/data/lookup_narrative_traits.json",
    bundleKey: "narrativeStats",
  },
  {
    packId: "occupations",
    title: "Occupations",
    kind: "lookup",
    exportName: "OCCUPATION_PACK",
    sourceFile: "contracts/data/lookup_occupations.json",
  },
  {
    packId: "partyRoles",
    title: "Party Roles",
    kind: "lookup",
    exportName: "PARTY_ROLE_PACK",
    sourceFile: "contracts/data/lookup_party_roles.json",
  },
  {
    packId: "gameStats",
    title: "Game Stats",
    kind: "config",
    exportName: "GAME_STATS",
    sourceFile: "contracts/data/config_game_stats.json",
    bundleKey: "gameStats",
  },
  {
    packId: "guides",
    title: "Guides",
    kind: "content",
    exportName: "GUIDE_PACK",
    sourceFile: "contracts/data/content_guides.json",
    bundleKey: "guides",
  },
  {
    packId: "rarities",
    title: "Rarities",
    kind: "lookup",
    exportName: "RARITY_PACK",
    sourceFile: "contracts/data/lookup_rarities.json",
    bundleKey: "rarities",
  },
  {
    packId: "runeAffinity",
    title: "Rune Affinity",
    kind: "config",
    exportName: "RUNE_AFFINITY_PACK",
    sourceFile: "contracts/data/config_rune_affinity.json",
    bundleKey: "runeAffinity",
  },
  {
    packId: "spawnTable",
    title: "Spawn Table",
    kind: "content",
    exportName: "SPAWN_TABLE_PACK",
    sourceFile: "contracts/data/content_spawn_table.json",
  },
  {
    packId: "runes",
    title: "Runes",
    kind: "lookup",
    exportName: "RUNE_PACK",
    sourceFile: "contracts/data/lookup_runes.json",
    bundleKey: "runes",
  },
  {
    packId: "spellCategories",
    title: "Spell Categories",
    kind: "lookup",
    exportName: "SPELL_CATEGORY_PACK",
    sourceFile: "contracts/data/lookup_spell_categories.json",
    bundleKey: "spellCategories",
  },
  {
    packId: "spellForgeCosts",
    title: "Spell Forge Costs",
    kind: "config",
    exportName: "SPELL_FORGE_COSTS",
    sourceFile: "contracts/data/config_spell_forge_costs.json",
  },
  {
    packId: "spellEvolution",
    title: "Spell Evolutions",
    kind: "content",
    exportName: "SPELL_EVOLUTION_PACK",
    sourceFile: "contracts/data/content_spell_evolution.json",
    bundleKey: "spellEvolution",
  },
  {
    packId: "spellProgression",
    title: "Spell Progression",
    kind: "config",
    exportName: "SPELL_PROGRESSION_PACK",
    sourceFile: "contracts/data/config_spell_progression.json",
    bundleKey: "spellProgression",
  },
  {
    packId: "spells",
    title: "Spells",
    kind: "content",
    exportName: "SPELL_PACK",
    sourceFile: "contracts/data/content_spells.json",
    bundleKey: "spells",
  },
  {
    packId: "titles",
    title: "Titles",
    kind: "content",
    exportName: "TITLE_PACK",
    sourceFile: "contracts/data/content_titles.json",
    bundleKey: "titles",
  },
  {
    packId: "mounts",
    title: "Mounts",
    kind: "content",
    exportName: "MOUNT_PACK",
    sourceFile: "contracts/data/content_mounts.json",
    bundleKey: "mounts",
  },
  {
    packId: "worldMap",
    title: "World Map",
    kind: "content",
    exportName: "WORLD_MAP_PACK",
    sourceFile: "contracts/data/content_world_map.json",
    bundleKey: "worldMap",
  },
];

const sourcePackEntries = [
  { packId: "actionCatalog", title: "Action Catalog", exportName: "ACTION_CATALOG" },
  { packId: "actionIntents", title: "Action Intents", exportName: "ACTION_INTENTS" },
  { packId: "actionPolicies", title: "Action Policies", exportName: "ACTION_POLICIES" },
  { packId: "actionContracts", title: "Action Contracts", exportName: "ACTION_CONTRACTS" },
  { packId: "roomTemplates", title: "Room Templates", exportName: "ROOM_TEMPLATES" },
  { packId: "dungeonLayouts", title: "Dungeon Layouts", exportName: "DUNGEON_LAYOUT_PACK" },
  { packId: "itemPack", title: "Items", exportName: "ITEM_PACK" },
  { packId: "skillPack", title: "Skills", exportName: "SKILL_PACK" },
  { packId: "archetypePack", title: "Archetypes", exportName: "ARCHETYPE_PACK" },
  { packId: "dialoguePack", title: "Dialogue", exportName: "DIALOGUE_PACK" },
  { packId: "cutscenePack", title: "Cutscenes", exportName: "CUTSCENE_PACK" },
  { packId: "questPack", title: "Quests", exportName: "QUEST_PACK" },
  { packId: "eventPack", title: "Events", exportName: "EVENT_PACK" },
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function countTopLevelCollections(value) {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).flatMap(([key, item]) => {
      if (Array.isArray(item)) {
        return [[key, item.length]];
      }
      if (item && typeof item === "object") {
        return [[key, Object.keys(item).length]];
      }
      return [];
    }),
  );
}

function buildEntry(metadata, document) {
  const record = asRecord(document);
  return {
    packId: metadata.packId,
    title: metadata.title,
    kind: metadata.kind,
    exportName: metadata.exportName,
    sourceFile: metadata.sourceFile,
    ...(metadata.bundleKey ? { bundleKey: metadata.bundleKey } : {}),
    ...(metadata.contentSourcePath
      ? { contentSourcePath: metadata.contentSourcePath }
      : {}),
    ...(typeof record.schemaVersion === "string"
      ? { schemaVersion: record.schemaVersion }
      : {}),
    ...(typeof record.$schema === "string" ? { schemaRef: record.$schema } : {}),
    ...(typeof record.description === "string"
      ? { description: record.description }
      : {}),
    topLevelCounts: countTopLevelCollections(document),
  };
}

function escapeCsString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function escapeCppString(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

const entries = [
  buildEntry(
    {
      packId: "contentSource",
      title: "Merged Content Source",
      kind: "source",
      exportName: "CONTENT_SOURCE_DOCUMENT",
      sourceFile: "contracts/source/content-source.json",
    },
    source,
  ),
  buildEntry(
    {
      packId: "contentSchema",
      title: "Content Schema",
      kind: "schema",
      exportName: "CONTENT_SCHEMA_DOCUMENT",
      sourceFile: "contracts/source/content-source.json",
      bundleKey: "contentSchema",
      contentSourcePath: "contentSchema",
    },
    source.contentSchema,
  ),
  buildEntry(
    {
      packId: "statSchema",
      title: "Stat Schema",
      kind: "schema",
      exportName: "STAT_SCHEMA_DOCUMENT",
      sourceFile: "contracts/source/content-source.json",
      contentSourcePath: "contentSchema.statSchema",
    },
    source.contentSchema?.statSchema,
  ),
  ...directPackEntries.map((entry) =>
    buildEntry(entry, readJson(join(dataDir, entry.sourceFile.replace("contracts/data/", "")))),
  ),
  ...sourcePackEntries.map((entry) =>
    buildEntry(
      {
        ...entry,
        kind: "content",
        sourceFile: "contracts/source/content-source.json",
        bundleKey: entry.packId,
        contentSourcePath: `packs.${entry.packId}`,
      },
      source.packs?.[entry.packId],
    ),
  ),
];

const tsOutput = `// generated by scripts/generate-content-pack-registry.mjs
export interface GeneratedContentPackRegistryEntry {
  packId: string;
  title: string;
  kind: "lookup" | "config" | "content" | "schema" | "source";
  exportName: string;
  sourceFile: string;
  bundleKey?: string;
  contentSourcePath?: string;
  schemaVersion?: string;
  schemaRef?: string;
  description?: string;
  topLevelCounts: Record<string, number>;
}

export const GENERATED_CONTENT_PACK_REGISTRY = ${JSON.stringify(entries, null, 2)} as const satisfies readonly GeneratedContentPackRegistryEntry[];
`;

const csEntries = entries
  .map((entry) => {
    const topLevelCounts = Object.entries(entry.topLevelCounts)
      .map(([key, value]) => `                    { "${escapeCsString(key)}", ${value} },`)
      .join("\n");
    return `            new ContentPackRegistryEntry
            {
                PackId = "${escapeCsString(entry.packId)}",
                Title = "${escapeCsString(entry.title)}",
                Kind = "${escapeCsString(entry.kind)}",
                ExportName = "${escapeCsString(entry.exportName)}",
                SourceFile = "${escapeCsString(entry.sourceFile)}",
                BundleKey = ${entry.bundleKey ? `"${escapeCsString(entry.bundleKey)}"` : "null"},
                ContentSourcePath = ${entry.contentSourcePath ? `"${escapeCsString(entry.contentSourcePath)}"` : "null"},
                SchemaVersion = ${entry.schemaVersion ? `"${escapeCsString(entry.schemaVersion)}"` : "null"},
                SchemaRef = ${entry.schemaRef ? `"${escapeCsString(entry.schemaRef)}"` : "null"},
                Description = ${entry.description ? `"${escapeCsString(entry.description)}"` : "null"},
                TopLevelCounts = new Dictionary<string, int>
                {
${topLevelCounts}
                },
            }`;
  })
  .join(",\n");

const csOutput = `// generated by scripts/generate-content-pack-registry.mjs
using System.Collections.Generic;

namespace DungeonBreak.Contracts
{
    public sealed class ContentPackRegistryEntry
    {
        public string PackId { get; set; } = "";
        public string Title { get; set; } = "";
        public string Kind { get; set; } = "";
        public string ExportName { get; set; } = "";
        public string SourceFile { get; set; } = "";
        public string? BundleKey { get; set; }
        public string? ContentSourcePath { get; set; }
        public string? SchemaVersion { get; set; }
        public string? SchemaRef { get; set; }
        public string? Description { get; set; }
        public Dictionary<string, int> TopLevelCounts { get; set; } = new();
    }

    public static class ContentPackRegistry
    {
        public static readonly IReadOnlyList<ContentPackRegistryEntry> Entries = new List<ContentPackRegistryEntry>
        {
${csEntries}
        };
    }
}
`;

const cppEntries = entries
  .map((entry) => {
    const topLevelCounts = Object.entries(entry.topLevelCounts)
      .map(([key, value]) => `{ "${escapeCppString(key)}", ${value} }`)
      .join(", ");
    return `    {
        "${escapeCppString(entry.packId)}",
        "${escapeCppString(entry.title)}",
        "${escapeCppString(entry.kind)}",
        "${escapeCppString(entry.exportName)}",
        "${escapeCppString(entry.sourceFile)}",
        ${entry.bundleKey ? `"${escapeCppString(entry.bundleKey)}"` : "std::nullopt"},
        ${entry.contentSourcePath ? `"${escapeCppString(entry.contentSourcePath)}"` : "std::nullopt"},
        ${entry.schemaVersion ? `"${escapeCppString(entry.schemaVersion)}"` : "std::nullopt"},
        ${entry.schemaRef ? `"${escapeCppString(entry.schemaRef)}"` : "std::nullopt"},
        ${entry.description ? `"${escapeCppString(entry.description)}"` : "std::nullopt"},
        { ${topLevelCounts} }
    }`;
  })
  .join(",\n");

const cppOutput = `// generated by scripts/generate-content-pack-registry.mjs
#pragma once

#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <vector>

namespace DungeonBreakContracts {

struct ContentPackRegistryEntry {
    std::string pack_id;
    std::string title;
    std::string kind;
    std::string export_name;
    std::string source_file;
    std::optional<std::string> bundle_key;
    std::optional<std::string> content_source_path;
    std::optional<std::string> schema_version;
    std::optional<std::string> schema_ref;
    std::optional<std::string> description;
    std::map<std::string, std::int64_t> top_level_counts;
};

inline const std::vector<ContentPackRegistryEntry> CONTENT_PACK_REGISTRY = {
${cppEntries}
};

} // namespace DungeonBreakContracts
`;

mkdirSync(generatedDir, { recursive: true });
mkdirSync(generatedCppDir, { recursive: true });
mkdirSync(generatedCsharpDir, { recursive: true });
writeFileSync(join(generatedDir, "content-pack-registry.ts"), tsOutput, "utf8");
writeFileSync(join(generatedDir, "content-pack-registry.json"), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
writeFileSync(join(generatedCppDir, "content-pack-registry.hpp"), cppOutput, "utf8");
writeFileSync(join(generatedCsharpDir, "ContentPackRegistry.cs"), csOutput, "utf8");

console.log("[content-codegen] generated TS/C++/C# content-pack registry artifacts");
