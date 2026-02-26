import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPayload } from "payload";
import config from "../payload.config";

type GameTraitsManifest = {
  generated_at_utc?: string;
  source?: string;
  traits?: string[];
  version?: number;
};

type NarrativeSnapshot = {
  basis_vectors?: string[];
  dialogs?: Array<{
    force?: Record<string, unknown>;
    label?: string;
    location?: Record<string, unknown>;
    phrase?: string;
    scenes?: string[];
  }>;
  entities?: Array<{
    name?: string;
    previous_coordinates?: Record<string, unknown>;
    starting_coordinates?: Record<string, unknown>;
  }>;
  generated_at_utc?: string;
  source?: string;
  version?: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const manifestPath = path.join(
  repoRoot,
  "src",
  "dungeonbreak_narrative",
  "data",
  "game_traits_manifest.json"
);
const snapshotPath = path.join(
  repoRoot,
  "src",
  "dungeonbreak_narrative",
  "data",
  "narrative_snapshot.json"
);

function readJSON<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function upsertBySourceKey(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection:
    | "game-traits"
    | "narrative-dialogs"
    | "narrative-entities",
  sourceKey: string,
  data: Record<string, unknown>
) {
  const existing = (await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      sourceKey: {
        equals: sourceKey,
      },
    },
  })) as { docs: Array<{ id: number | string }> };

  if (existing.docs.length > 0) {
    await payload.update({
      collection,
      data,
      id: existing.docs[0].id,
      overrideAccess: true,
    });
    return "updated";
  }

  await payload.create({
    collection,
    data,
    draft: false,
    overrideAccess: true,
  } as never);
  return "created";
}

async function main() {
  const manifest = readJSON<GameTraitsManifest>(manifestPath, {});
  const snapshot = readJSON<NarrativeSnapshot>(snapshotPath, {});

  const payload = await getPayload({ config });
  const syncedAt = new Date().toISOString();

  const manifestVersion = Number.isFinite(manifest.version) ? Number(manifest.version) : 1;
  const snapshotVersion = Number.isFinite(snapshot.version) ? Number(snapshot.version) : 1;

  const traits = Array.isArray(manifest.traits)
    ? manifest.traits.map((trait) => String(trait)).filter((name) => name.trim().length > 0)
    : [];
  const entities = Array.isArray(snapshot.entities) ? snapshot.entities : [];
  const dialogs = Array.isArray(snapshot.dialogs) ? snapshot.dialogs : [];

  let traitCreated = 0;
  let traitUpdated = 0;
  let entityCreated = 0;
  let entityUpdated = 0;
  let dialogCreated = 0;
  let dialogUpdated = 0;

  for (const trait of traits) {
    const result = await upsertBySourceKey(payload, "game-traits", trait, {
      metadata: {
        manifestGeneratedAt: manifest.generated_at_utc || null,
        manifestSource: manifest.source || null,
      },
      name: trait,
      sourceKey: trait,
      sourceVersion: manifestVersion,
      syncedAt,
    });
    if (result === "created") {
      traitCreated += 1;
    } else {
      traitUpdated += 1;
    }
  }

  for (const entity of entities) {
    const name = typeof entity.name === "string" ? entity.name.trim() : "";
    if (name.length === 0) {
      continue;
    }

    const result = await upsertBySourceKey(payload, "narrative-entities", name, {
      metadata: {
        snapshotGeneratedAt: snapshot.generated_at_utc || null,
        snapshotSource: snapshot.source || null,
      },
      name,
      previousCoordinates:
        entity.previous_coordinates && typeof entity.previous_coordinates === "object"
          ? entity.previous_coordinates
          : {},
      sourceKey: name,
      sourceVersion: snapshotVersion,
      startingCoordinates:
        entity.starting_coordinates && typeof entity.starting_coordinates === "object"
          ? entity.starting_coordinates
          : {},
      syncedAt,
    });

    if (result === "created") {
      entityCreated += 1;
    } else {
      entityUpdated += 1;
    }
  }

  for (const dialog of dialogs) {
    const label = typeof dialog.label === "string" ? dialog.label.trim() : "";
    if (label.length === 0) {
      continue;
    }

    const scenes = Array.isArray(dialog.scenes)
      ? dialog.scenes
          .map((scene) => String(scene).trim())
          .filter((scene) => scene.length > 0)
          .map((scene) => ({ scene }))
      : [];

    const result = await upsertBySourceKey(payload, "narrative-dialogs", label, {
      force: dialog.force && typeof dialog.force === "object" ? dialog.force : {},
      label,
      location: dialog.location && typeof dialog.location === "object" ? dialog.location : {},
      metadata: {
        snapshotGeneratedAt: snapshot.generated_at_utc || null,
        snapshotSource: snapshot.source || null,
      },
      phrase: typeof dialog.phrase === "string" ? dialog.phrase : "",
      scenes,
      sourceKey: label,
      sourceVersion: snapshotVersion,
      syncedAt,
    });

    if (result === "created") {
      dialogCreated += 1;
    } else {
      dialogUpdated += 1;
    }
  }

  console.log("Game snapshot sync complete.");
  console.log(`Traits   -> created: ${traitCreated}, updated: ${traitUpdated}`);
  console.log(`Entities -> created: ${entityCreated}, updated: ${entityUpdated}`);
  console.log(`Dialogs  -> created: ${dialogCreated}, updated: ${dialogUpdated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
