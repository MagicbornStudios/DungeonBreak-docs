import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dialoguePath = path.resolve(__dirname, "../src/escape-the-dungeon/contracts/data/content_dialogue.json");
const raw = fs.readFileSync(dialoguePath, "utf8");
const data = JSON.parse(raw);

const errors = [];

if (!Array.isArray(data.dialogues) || data.dialogues.length === 0) {
  errors.push("content_dialogue.json must contain at least one dialogue entry.");
}

const dialogueIds = new Set();
for (const d of data.dialogues ?? []) {
  if (!d.dialogueId) {
    errors.push("Dialogue entry missing dialogueId.");
    continue;
  }
  if (dialogueIds.has(d.dialogueId)) {
    errors.push(`Duplicate dialogueId '${d.dialogueId}'.`);
  }
  dialogueIds.add(d.dialogueId);
  if (typeof d.responseText !== "string" || d.responseText.trim().length < 8) {
    errors.push(`Dialogue '${d.dialogueId}' must include meaningful responseText.`);
  }
}

for (const d of data.dialogues ?? []) {
  if (d.nextDialogueId && !dialogueIds.has(d.nextDialogueId)) {
    errors.push(`Dialogue '${d.dialogueId}' references missing nextDialogueId '${d.nextDialogueId}'.`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[dialogue-validate] ${error}`);
  }
  throw new Error(`Dialogue content validation failed with ${errors.length} issue(s).`);
}

console.log(`[dialogue-validate] OK (${dialogueIds.size} dialogue entries).`);
