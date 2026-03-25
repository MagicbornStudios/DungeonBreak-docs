#!/usr/bin/env node
/**
 * Reads `content-pack.bundle.v1.json` and emits Mermaid diagrams + a small
 * used/unused id report for review (documentation / hub — not runtime).
 *
 * Usage:
 *   node scripts/generate-content-graph-mermaid.mjs [bundlePath] [outDir]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(__dirname, "..");
const bundlePath = resolve(
  process.argv[2] ?? join(docsRoot, "public/game/content-pack.bundle.v1.json")
);
const outDir = resolve(
  process.argv[3] ?? join(docsRoot, "public/game/content-graphs")
);

const raw = JSON.parse(readFileSync(bundlePath, "utf8"));
const packs = raw.packs;
if (!packs || typeof packs !== "object") {
  throw new Error("Bundle missing `packs` object.");
}

mkdirSync(outDir, { recursive: true });

function esc(s) {
  return String(s).replace(/"/g, '\\"').replace(/\n/g, " ");
}

function mid(s) {
  return String(s).replace(/[^a-zA-Z0-9_]/g, "_");
}

const quests = packs.questPack?.quests ?? [];
let questMmd =
  "flowchart TB\n  %% Auto-generated — quests → progress rules\n";
for (const q of quests) {
  const nid = `Q_${mid(q.questId)}`;
  questMmd += `  ${nid}["${esc(q.title)} (${esc(q.questId)})"]\n`;
  const rules = q.progressRules ?? [];
  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    const rid = `${nid}_pr${i}`;
    const label =
      r.kind +
      (r.actionType ? `: ${r.actionType}` : "") +
      (r.amount != null ? ` ×${r.amount}` : "") +
      (r.setToRequired ? " →required" : "");
    questMmd += `  ${rid}["${esc(label)}"]\n`;
    questMmd += `  ${nid} --> ${rid}\n`;
  }
}
writeFileSync(join(outDir, "content-graph-quests.mmd"), `${questMmd}\n`, "utf8");

const events = packs.eventPack?.events ?? [];
let evMmd = "flowchart LR\n  %% Auto-generated — events → trigger summary\n";
for (const e of events) {
  const nid = `E_${mid(e.eventId)}`;
  const trig = e.trigger;
  let tlabel = "no trigger";
  if (trig && typeof trig === "object") {
    const gte = trig.gte != null ? `>= ${trig.gte}` : "";
    const key = trig.key ? ` key:${trig.key}` : "";
    tlabel = `${trig.metric ?? "?"} ${gte}${key}`.trim();
  }
  evMmd += `  ${nid}["${esc(e.eventId)}"]\n`;
  evMmd += `  ${nid}_t["${esc(tlabel)}"]\n`;
  evMmd += `  ${nid} --> ${nid}_t\n`;
}
writeFileSync(join(outDir, "content-graph-events.mmd"), `${evMmd}\n`, "utf8");

const dialogues = packs.dialoguePack?.dialogues ?? [];
const byScene = new Map();
for (const d of dialogues) {
  const sid = d.sceneId || "_no_scene";
  if (!byScene.has(sid)) {
    byScene.set(sid, []);
  }
  byScene.get(sid).push(d);
}
let dlgMmd =
  "flowchart TB\n  %% Auto-generated — dialogue lines by sceneId\n";
for (const [sceneId, lines] of [...byScene.entries()].sort((a, b) =>
  a[0].localeCompare(b[0])
)) {
  const sg = `S_${mid(sceneId)}`;
  dlgMmd += `  subgraph ${sg}["${esc(sceneId)}"]\n`;
  dlgMmd += `    direction TB\n`;
  for (const d of lines) {
    const did = `${sg}_D_${mid(d.dialogueId)}`;
    dlgMmd += `      ${did}["${esc(d.dialogueId)}"]\n`;
  }
  dlgMmd += `  end\n`;
}
writeFileSync(
  join(outDir, "content-graph-dialogue-scenes.mmd"),
  `${dlgMmd}\n`,
  "utf8"
);

const definedEvents = new Set(events.map((e) => e.eventId));
const referenced = new Set();

function walk(node) {
  if (node === null || node === undefined) {
    return;
  }
  if (Array.isArray(node)) {
    for (const x of node) {
      walk(x);
    }
    return;
  }
  if (typeof node !== "object") {
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === "eventId" && typeof v === "string") {
      referenced.add(v);
    }
    if (k === "onSelectEventIds" && Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string") {
          referenced.add(x);
        }
      }
    }
    walk(v);
  }
}

walk(packs);

const definedList = [...definedEvents].sort();
const referencedDefined = definedList.filter((id) => referenced.has(id));
const unreferenced = definedList.filter((id) => !referenced.has(id));

const report = {
  schemaVersion: "content-graph-report.v1",
  generatedAt: new Date().toISOString(),
  bundlePath,
  events: {
    defined: definedList,
    referencedInPacks: referencedDefined,
    unreferenced,
  },
  note: "event references are detected via object keys `eventId` and `onSelectEventIds` anywhere under `packs`.",
};

writeFileSync(
  join(outDir, "content-graph-used-unused.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

console.log(`[content-graph-mermaid] wrote ${outDir}`);
