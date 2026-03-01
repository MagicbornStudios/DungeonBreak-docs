import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dialoguePath = path.resolve(__dirname, "../src/escape-the-dungeon/contracts/data/dialogue-clusters.json");
const raw = fs.readFileSync(dialoguePath, "utf8");
const data = JSON.parse(raw);

const errors = [];

if (!Array.isArray(data.clusters) || data.clusters.length === 0) {
  errors.push("dialogue-clusters.json must contain at least one cluster.");
}

const optionIds = new Set();
for (const cluster of data.clusters ?? []) {
  if (!cluster.clusterId) {
    errors.push("Cluster missing clusterId.");
    continue;
  }
  if (!Array.isArray(cluster.options) || cluster.options.length < 2) {
    errors.push(`Cluster '${cluster.clusterId}' must contain at least 2 options.`);
    continue;
  }
  for (const option of cluster.options) {
    if (!option.optionId) {
      errors.push(`Cluster '${cluster.clusterId}' has an option without optionId.`);
      continue;
    }
    if (optionIds.has(option.optionId)) {
      errors.push(`Duplicate optionId '${option.optionId}'.`);
    }
    optionIds.add(option.optionId);

    if (option.clusterId !== cluster.clusterId) {
      errors.push(`Option '${option.optionId}' clusterId '${option.clusterId}' does not match parent '${cluster.clusterId}'.`);
    }
    if (typeof option.responseText !== "string" || option.responseText.trim().length < 8) {
      errors.push(`Option '${option.optionId}' must include meaningful responseText.`);
    }
    if (option.nextOptionId && !optionIds.has(option.nextOptionId)) {
      // defer full check until all options discovered
    }
  }
}

for (const cluster of data.clusters ?? []) {
  for (const option of cluster.options ?? []) {
    if (option.nextOptionId && !optionIds.has(option.nextOptionId)) {
      errors.push(`Option '${option.optionId}' references missing nextOptionId '${option.nextOptionId}'.`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[dialogue-validate] ${error}`);
  }
  throw new Error(`Dialogue content validation failed with ${errors.length} issue(s).`);
}

console.log(`[dialogue-validate] OK (${optionIds.size} options across ${data.clusters.length} clusters).`);

