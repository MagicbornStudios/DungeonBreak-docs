import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildContentPackReleaseArtifacts,
  type ContentPackGeneratedOutput,
} from "@dungeonbreak/engine/content-pack-release-artifacts";
import {
  extractCanonicalInstancesPatch,
  extractLevelContentPatch,
  extractSpaceVectorSchemaPatch,
} from "@dungeonbreak/engine/content-schema";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SpaceVectorsPatch = Record<string, unknown>;

type BuildBundleBody = {
  patchName?: string;
  spaceVectorsPatch?: SpaceVectorsPatch;
  levelContentPatch?: Record<string, unknown>;
};

type BuildBundleResponse = {
  ok: boolean;
  bundle?: Record<string, unknown>;
  manifest?: Record<string, unknown>;
  generatedOutputs?: ContentPackGeneratedOutput[];
  error?: string;
};

const BUNDLE_PATH = path.resolve(
  process.cwd(),
  "public",
  "game",
  "content-pack.bundle.v1.json"
);

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(obj)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, stableNormalize(obj[key])])
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizePatch(
  patch: SpaceVectorsPatch | undefined
): SpaceVectorsPatch {
  if (!patch || !isRecord(patch)) return {};
  const schemaPatch = extractSpaceVectorSchemaPatch(patch);
  const contentBindings = extractCanonicalInstancesPatch(patch);
  return {
    ...schemaPatch,
    ...(contentBindings ? { contentBindings } : {}),
  };
}

function normalizeLevelContentPatch(
  patch: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!patch || !isRecord(patch)) return undefined;
  const levelContent = extractLevelContentPatch(patch);
  return levelContent ? (levelContent as Record<string, unknown>) : undefined;
}

export async function POST(request: Request) {
  try {
    const baseBundleRaw = readFileSync(BUNDLE_PATH, "utf8");
    const baseBundle = JSON.parse(baseBundleRaw) as {
      schemaVersion: string;
      enginePackage?: { name?: string; version?: string };
      packs: Record<string, unknown>;
      hashes?: Record<string, string>;
    };
    const body = (await request.json()) as BuildBundleBody;
    const patch = normalizePatch(body.spaceVectorsPatch);
    const levelContentPatch = normalizeLevelContentPatch(body.levelContentPatch);

    const packs: Record<string, unknown> = { ...(baseBundle.packs ?? {}) };
    const baseSpaceVectors = isRecord(packs.spaceVectors)
      ? (packs.spaceVectors as Record<string, unknown>)
      : {};
    packs.spaceVectors = {
      ...baseSpaceVectors,
      ...patch,
    };
    if (levelContentPatch) {
      packs.levelContent = {
        ...((isRecord(packs.levelContent)
          ? (packs.levelContent as Record<string, unknown>)
          : {}) as Record<string, unknown>),
        ...levelContentPatch,
      };
    }

    const hashes = Object.fromEntries(
      Object.entries(packs).map(([key, value]) => [
        key,
        sha256Hex(stableJson(value)),
      ])
    );
    const overall = sha256Hex(
      stableJson({
        schemaVersion: "content-pack.bundle.v1",
        enginePackage: baseBundle.enginePackage ?? {},
        hashes,
        packs,
      })
    );

    const generatedBundle = {
      schemaVersion: "content-pack.bundle.v1",
      generatedAt: new Date().toISOString(),
      patchName: body.patchName ?? "space-vectors.patch",
      enginePackage: baseBundle.enginePackage ?? {},
      hashes: {
        ...hashes,
        overall,
      },
      packs,
    };
    const artifacts = buildContentPackReleaseArtifacts(generatedBundle, {
      version: body.patchName ?? "browser-session",
    });

    return NextResponse.json<BuildBundleResponse>({
      ok: true,
      bundle: generatedBundle,
      manifest: artifacts.manifest,
      generatedOutputs: artifacts.generatedOutputs,
    });
  } catch (error) {
    return NextResponse.json<BuildBundleResponse>(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
