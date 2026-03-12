import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { unsealJsonWithSecret, type SealedJsonV1 } from "@/lib/sealed-json";

export const runtime = "nodejs";

const SEALED_DEFAULT_BUNDLE_PATH = path.resolve(
  process.cwd(),
  "content-packs",
  "defaults",
  "default-content-pack.bundle.v1.sealed.json",
);

type BundlePayload = {
  schemaVersion?: string;
  patchName?: string;
  generatedAt?: string;
  hashes?: { overall?: string };
  enginePackage?: { version?: string };
  packs?: {
    spaceVectors?: unknown;
  };
};

function getPayloadSecret(): string {
  const value = process.env.PAYLOAD_SECRET?.trim();
  if (!value) throw new Error("Missing PAYLOAD_SECRET for test-mode default bundle decryption.");
  return value;
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        ok: false,
        error: "Test-mode default bundle is only available in development.",
      },
      { status: 403 },
    );
  }

  try {
    const raw = await readFile(SEALED_DEFAULT_BUNDLE_PATH, "utf8");
    const sealed = JSON.parse(raw) as SealedJsonV1;
    const bundle = unsealJsonWithSecret<BundlePayload>(sealed, getPayloadSecret());
    return NextResponse.json({
      ok: true,
      bundle,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

