import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildContentPackReleaseArtifacts,
  type ContentPackGeneratedOutput,
} from "@dungeonbreak/engine/content-pack-release-artifacts";
import { NextResponse } from "next/server";
import { unsealJsonWithSecret, type SealedJsonV1 } from "@/lib/sealed-json";

export const runtime = "nodejs";

const SEALED_DEFAULT_BUNDLE_PATH = path.resolve(
  process.cwd(),
  "content-packs",
  "defaults",
  "default-content-pack.bundle.v1.sealed.json"
);

type BundlePayload = {
  schemaVersion?: string;
  patchName?: string;
  generatedAt?: string;
  hashes?: { overall?: string };
  enginePackage?: { version?: string };
  packs?: {
    spaceVectors?: unknown;
    levelContent?: unknown;
  };
};

type TestModeDefaultResponse = {
  ok: boolean;
  bundle?: BundlePayload;
  generatedOutputs?: ContentPackGeneratedOutput[];
  error?: string;
};

function getPayloadSecret(): string {
  const value = process.env.PAYLOAD_SECRET?.trim();
  if (!value)
    throw new Error(
      "Missing PAYLOAD_SECRET for test-mode default bundle decryption."
    );
  return value;
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json<TestModeDefaultResponse>(
      {
        ok: false,
        error: "Test-mode default bundle is only available in development.",
      },
      { status: 403 }
    );
  }

  try {
    const raw = await readFile(SEALED_DEFAULT_BUNDLE_PATH, "utf8");
    const sealed = JSON.parse(raw) as SealedJsonV1;
    const bundle = unsealJsonWithSecret<BundlePayload>(
      sealed,
      getPayloadSecret()
    );
    const artifacts = buildContentPackReleaseArtifacts(bundle, {
      version: bundle.patchName ?? "test-mode-default",
    });
    return NextResponse.json<TestModeDefaultResponse>({
      ok: true,
      bundle,
      generatedOutputs: artifacts.generatedOutputs,
    });
  } catch (error) {
    return NextResponse.json<TestModeDefaultResponse>(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
