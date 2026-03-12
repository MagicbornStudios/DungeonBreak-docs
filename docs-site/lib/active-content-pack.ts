import type { RuntimeContentPackOverrides } from "@dungeonbreak/engine";

export const ACTIVE_CONTENT_PACK_STORAGE_KEY = "db-active-content-pack-v1";
export const ACTIVE_CONTENT_PACK_UPDATED_EVENT = "db:active-content-pack-updated";

export type ActiveContentPackIdentity = {
  source: string;
  packId: string;
  packVersion: string;
  packHash: string;
  schemaVersion: string;
  engineVersion: string;
  reportId?: string;
};

export type ActiveContentPackSnapshot = {
  updatedAt: string;
  identity: ActiveContentPackIdentity;
  bundle?: Record<string, unknown>;
};

export type ActiveContentPackBundle = {
  schemaVersion?: string;
  generatedAt?: string;
  patchName?: string;
  enginePackage?: { name?: string; version?: string };
  hashes?: Record<string, string>;
  packs?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readActiveContentPackBundle(
  snapshot?: ActiveContentPackSnapshot | null,
): ActiveContentPackBundle | null {
  const resolved = snapshot ?? readActiveContentPackSnapshot();
  const bundle = asRecord(resolved?.bundle);
  if (!bundle) return null;
  const packs = asRecord(bundle.packs);
  if (!packs) return null;
  return bundle as ActiveContentPackBundle;
}

export function readActiveContentPacks(
  snapshot?: ActiveContentPackSnapshot | null,
): RuntimeContentPackOverrides | null {
  return (readActiveContentPackBundle(snapshot)?.packs ?? null) as RuntimeContentPackOverrides | null;
}

export function readActiveContentSignature(
  snapshot?: ActiveContentPackSnapshot | null,
): string | null {
  const resolved = snapshot ?? readActiveContentPackSnapshot();
  const overallHash = readActiveContentPackBundle(resolved)?.hashes?.overall;
  if (typeof overallHash === "string" && overallHash.length > 0) {
    return overallHash;
  }
  const identity = resolved?.identity;
  if (!identity) return null;
  return `${identity.packId}@${identity.packVersion}:${identity.packHash}`;
}

export function readActiveContentPackSnapshot(): ActiveContentPackSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_CONTENT_PACK_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveContentPackSnapshot;
  } catch {
    return null;
  }
}

export function writeActiveContentPackSnapshot(snapshot: ActiveContentPackSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_CONTENT_PACK_STORAGE_KEY, JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent(ACTIVE_CONTENT_PACK_UPDATED_EVENT, { detail: snapshot }));
  } catch {
    // ignore storage errors
  }
}
