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
