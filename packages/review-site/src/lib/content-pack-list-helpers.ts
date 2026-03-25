export function isPlainObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

const HTTP_URL = /^https?:\/\//i;
const ID_LIKE_KEY = /(Id|Key|Slug|Code)$/i;

/**
 * Top-level arrays of plain objects, plus object maps whose values are all
 * plain objects (e.g. `actions` in action catalog / contracts).
 */
export function discoverEntityArrayBranches(
  value: unknown
): { key: string; items: Record<string, unknown>[] }[] {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((x) => isPlainObject(x as unknown))) {
      return [{ key: "root", items: value as Record<string, unknown>[] }];
    }
    return [];
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const branches: { key: string; items: Record<string, unknown>[] }[] = [];
  for (const [k, v] of Object.entries(value)) {
    if (Array.isArray(v) && v.length > 0 && v.every(isPlainObject)) {
      branches.push({ key: k, items: v });
    }
  }

  for (const [k, v] of Object.entries(value)) {
    if (!isPlainObject(v) || Array.isArray(v)) {
      continue;
    }
    const mapEntries = Object.entries(v);
    if (mapEntries.length === 0) {
      continue;
    }
    if (!mapEntries.every(([, row]) => isPlainObject(row))) {
      continue;
    }
    branches.push({
      key: k,
      items: mapEntries.map(([entryKey, row]) => ({
        ...(row as Record<string, unknown>),
        _entryKey: entryKey,
      })),
    });
  }

  return branches.sort((a, b) => b.items.length - a.items.length);
}

/** Prefer human-facing strings, then stable ids (room templates use `feature`, etc.). */
const LABEL_KEYS = [
  "name",
  "label",
  "title",
  "displayName",
  "itemId",
  "skillId",
  "spellId",
  "runeId",
  "questId",
  "dungeonId",
  "archetypeId",
  "eventId",
  "cutsceneId",
  "templateId",
  "roomId",
  "actionId",
  "intentId",
  "dialogueId",
  "schemaId",
  "featureId",
  "feature",
  "entityId",
  "entityTypeId",
  "presetId",
  "statId",
  "slug",
  "presenterKey",
  "id",
  "key",
  "kind",
] as const;

function inferFallbackPrimaryString(
  obj: Record<string, unknown>
): string | null {
  const stringEntries = Object.entries(obj).filter(
    (e): e is [string, string] => {
      const v = e[1];
      const k = e[0];
      return (
        typeof v === "string" &&
        v.trim().length > 0 &&
        v.length <= 96 &&
        !HTTP_URL.test(v) &&
        k !== "description" &&
        !k.toLowerCase().endsWith("url")
      );
    }
  );
  if (stringEntries.length === 0) {
    return null;
  }
  const idLike = stringEntries.find(([k]) => ID_LIKE_KEY.test(k));
  if (idLike) {
    return idLike[1].trim();
  }
  stringEntries.sort((a, b) => a[1].length - b[1].length);
  return stringEntries[0]?.[1].trim() ?? null;
}

export function inferEntryLabel(obj: Record<string, unknown>): string {
  const mapKey = obj._entryKey;
  if (typeof mapKey === "string" && mapKey.trim()) {
    return mapKey.trim();
  }
  for (const k of LABEL_KEYS) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) {
      return v;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      return String(v);
    }
  }
  const fb = inferFallbackPrimaryString(obj);
  if (fb) {
    return fb;
  }
  return "Unnamed entry";
}

export function inferEntrySubtitle(
  obj: Record<string, unknown>
): string | null {
  const d = obj.description;
  if (typeof d === "string" && d.trim()) {
    return d.length > 140 ? `${d.slice(0, 137)}…` : d;
  }
  const tags = obj.tags;
  if (Array.isArray(tags) && tags.every((t) => typeof t === "string")) {
    return tags.join(", ");
  }
  const t = obj.type;
  if (typeof t === "string" && t.trim()) {
    return t;
  }
  const branch = obj.branch;
  if (typeof branch === "string" && branch.trim()) {
    return `Branch: ${branch}`;
  }
  const kind = obj.kind;
  if (typeof kind === "string" && kind.trim()) {
    return `Kind: ${kind}`;
  }
  const message = obj.message;
  if (typeof message === "string" && message.trim()) {
    return message.length > 120 ? `${message.slice(0, 117)}…` : message;
  }
  const line = obj.line;
  if (typeof line === "string" && line.trim()) {
    return line.length > 120 ? `${line.slice(0, 117)}…` : line;
  }
  const text = obj.text;
  if (typeof text === "string" && text.trim()) {
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }
  return null;
}

const VISUAL_IMAGE_KEYS = [
  "iconSpriteUrl",
  "frontSpriteUrl",
  "backSpriteUrl",
  "spriteUrl",
  "imageUrl",
  "thumbnailUrl",
] as const;

export function pickImageUrlFromVisualBlock(visual: unknown): string | null {
  if (!isPlainObject(visual)) {
    return null;
  }
  for (const k of VISUAL_IMAGE_KEYS) {
    const u = visual[k];
    if (typeof u === "string" && HTTP_URL.test(u)) {
      return u;
    }
  }
  return null;
}

/** First http(s) image URL on the entry (typical for items, skills, archetypes). */
export function pickPreviewImageUrl(
  obj: Record<string, unknown>
): string | null {
  const fromVisual = pickImageUrlFromVisualBlock(obj.visual);
  if (fromVisual) {
    return fromVisual;
  }
  const fromVisualRef = pickImageUrlFromVisualBlock(obj.visualRef);
  if (fromVisualRef) {
    return fromVisualRef;
  }
  for (const k of VISUAL_IMAGE_KEYS) {
    const u = obj[k];
    if (typeof u === "string" && HTTP_URL.test(u)) {
      return u;
    }
  }
  return null;
}

/** Use when rendering a `visual` field value in the detail panel. */
export function pickPreviewImageUrlFromValue(value: unknown): string | null {
  return pickImageUrlFromVisualBlock(value);
}

/** React list key from discriminating fields (entries often have no single `id`). */
export function stableEntryRowKey(
  branchKey: string,
  item: Record<string, unknown>
): string {
  const bits: string[] = [branchKey];
  const ek = item._entryKey;
  if (typeof ek === "string") {
    bits.push(`_entryKey:${ek}`);
  }
  for (const k of LABEL_KEYS) {
    const v = item[k];
    if (typeof v === "string" || typeof v === "number") {
      bits.push(`${k}:${v}`);
    }
  }
  if (bits.length === 1) {
    bits.push(`label:${inferEntryLabel(item)}`);
  }
  return bits.join("|");
}

function entrySearchBlob(obj: Record<string, unknown>): string {
  const parts = [inferEntryLabel(obj), inferEntrySubtitle(obj) ?? ""];
  for (const k of LABEL_KEYS) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) {
      parts.push(v);
    }
  }
  const feature = obj.feature;
  if (typeof feature === "string") {
    parts.push(feature);
  }
  const ek = obj._entryKey;
  if (typeof ek === "string") {
    parts.push(ek);
  }
  const line = obj.line;
  if (typeof line === "string") {
    parts.push(line);
  }
  const text = obj.text;
  if (typeof text === "string") {
    parts.push(text);
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Shallow object whose values are all null/string/number/boolean — show as a table.
 */
export function flatObjectEntries(
  value: unknown
): { key: string; value: string }[] | null {
  if (!isPlainObject(value)) {
    return null;
  }
  const out: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(value)) {
    if (v === null) {
      out.push({ key: k, value: "null" });
    } else if (typeof v === "string" || typeof v === "number") {
      out.push({ key: k, value: String(v) });
    } else if (typeof v === "boolean") {
      out.push({ key: k, value: v ? "true" : "false" });
    } else {
      return null;
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

export function canBrowseAsStructuredList(value: unknown): boolean {
  return (
    discoverEntityArrayBranches(value).length > 0 ||
    flatObjectEntries(value) !== null
  );
}

export function filterEntityItems(
  items: Record<string, unknown>[],
  query: string
): Record<string, unknown>[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter((obj) => entrySearchBlob(obj).includes(q));
}
