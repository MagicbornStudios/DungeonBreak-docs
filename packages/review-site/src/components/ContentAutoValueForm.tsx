"use client";

import type { ReactNode } from "react";
import { ContentPackEntryThumb } from "@/components/content-pack-thumbnail";
import { StatMapChips } from "@/components/StatMapChips";
import {
  combatStatDisplay,
  skillStatDisplay,
} from "@/lib/combat-skill-stat-labels";
import {
  isPlainObject,
  pickImageUrlFromVisualBlock,
} from "@/lib/content-pack-list-helpers";
import { narrativeTraitDisplay } from "@/lib/narrative-trait-labels";

const CAMEL_WORD_BOUNDARY = /([A-Z])/g;
const FIRST_CHAR = /^./;
const HTTP_URL = /^https?:\/\//i;
const IMAGE_EXT_IN_URL = /\.(png|jpe?g|gif|webp)(\?|#|$)/i;

const MAX_DEPTH = 10;
const MAX_ARRAY_ITEMS = 64;

const ARRAY_ROW_ID_KEYS = [
  "id",
  "itemId",
  "skillId",
  "spellId",
  "runeId",
  "statId",
  "questId",
  "dialogueId",
  "cutsceneId",
  "eventId",
  "entityTypeId",
  "presetId",
  "feature",
  "_entryKey",
  "name",
  "title",
  "label",
] as const;

function arrayItemRowKey(item: unknown, depth: number, i: number): string {
  if (isPlainObject(item)) {
    for (const k of ARRAY_ROW_ID_KEYS) {
      const v = item[k];
      if (typeof v === "string" || typeof v === "number") {
        return `${depth}-${String(k)}-${v}-i${i}`;
      }
    }
  }
  return `${depth}-i-${i}`;
}

function formatFieldLabel(key: string): string {
  return key
    .replace(CAMEL_WORD_BOUNDARY, " $1")
    .replace(FIRST_CHAR, (c) => c.toUpperCase())
    .trim();
}

function isNumericRecord(
  obj: Record<string, unknown>
): obj is Record<string, number> {
  const vals = Object.values(obj);
  if (vals.length === 0) {
    return true;
  }
  return vals.every(
    (v) => typeof v === "number" && Number.isFinite(v as number)
  );
}

function narrativeProfileTitle(packKey: string | undefined): string {
  if (packKey === "skillPack") {
    return "Narrative aptitudes (skill)";
  }
  if (packKey === "archetypePack") {
    return "Narrative stats (archetype profile)";
  }
  return "Narrative stats (profile)";
}

const NARRATIVE_DELTA_FIELDS = new Set([
  "traitDelta",
  "featureDelta",
  "noTargetTraitDelta",
]);

function narrativeDeltaTitle(fieldKey: string): string {
  if (fieldKey === "traitDelta") {
    return "Narrative stat delta (traits)";
  }
  if (fieldKey === "featureDelta") {
    return "Narrative stat delta (features)";
  }
  return "Narrative stat delta (no target)";
}

function isLikelyImageUrl(s: string): boolean {
  return HTTP_URL.test(s) && IMAGE_EXT_IN_URL.test(s);
}

interface AutoProps {
  value: unknown;
  depth?: number;
  fieldKey?: string;
  /** Active top-level pack (e.g. `roomTemplates`) for pack-specific UI rules. */
  packKey?: string;
}

export function ContentAutoValueForm({
  value,
  depth = 0,
  fieldKey,
  packKey,
}: AutoProps): ReactNode {
  if (depth > MAX_DEPTH) {
    return (
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-border/50 bg-muted/20 p-2 font-mono text-[10px] text-muted-foreground">
        {typeof value === "string"
          ? value.slice(0, 2000)
          : (JSON.stringify(value, null, 2)?.slice(0, 2000) ?? "…")}
      </pre>
    );
  }

  if (value === null || value === undefined) {
    return (
      <span className="text-muted-foreground text-xs italic">
        {value === null ? "null" : "undefined"}
      </span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="inline-flex cursor-default items-center gap-2 text-sm">
        <input
          checked={value}
          className="size-4 rounded border-border accent-primary"
          readOnly
          type="checkbox"
        />
        <span className="text-foreground">{value ? "true" : "false"}</span>
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <input
        className="w-full max-w-xl rounded-md border border-input bg-background px-2 py-1.5 font-mono text-foreground text-sm shadow-sm"
        readOnly
        type="text"
        value={String(value)}
      />
    );
  }

  if (typeof value === "string") {
    if (isLikelyImageUrl(value)) {
      return (
        <div className="flex flex-col gap-2">
          <ContentPackEntryThumb
            height={72}
            sizeClass="size-[72px]"
            url={value}
            width={72}
          />
          <input
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-foreground text-xs shadow-sm"
            readOnly
            type="text"
            value={value}
          />
        </div>
      );
    }
    const multiline = value.includes("\n") || value.length > 96;
    if (multiline) {
      return (
        <textarea
          className="min-h-[4.5rem] w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 font-mono text-foreground text-xs leading-relaxed shadow-sm"
          readOnly
          rows={Math.min(12, 3 + Math.ceil(value.length / 80))}
          value={value}
        />
      );
    }
    return (
      <input
        className="w-full max-w-xl rounded-md border border-input bg-background px-2 py-1.5 text-foreground text-sm shadow-sm"
        readOnly
        type="text"
        value={value}
      />
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground text-xs">Empty list</span>;
    }
    const primitiveOnly = value.every(
      (x) => x === null || ["string", "number", "boolean"].includes(typeof x)
    );
    if (primitiveOnly) {
      return (
        <textarea
          className="min-h-[3rem] w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs shadow-sm"
          readOnly
          rows={Math.min(8, value.length + 1)}
          value={value.map((x) => String(x)).join("\n")}
        />
      );
    }
    const shown = value.slice(0, MAX_ARRAY_ITEMS);
    return (
      <div className="space-y-2 border-border/40 border-purple-500/35 border-l-2 pl-3">
        {shown.map((item, i) => (
          <fieldset
            className="rounded-lg border border-border/50 bg-card/30 p-3"
            key={arrayItemRowKey(item, depth, i)}
          >
            <legend className="px-1 font-medium text-muted-foreground text-xs">
              Item {i}
            </legend>
            <ContentAutoValueForm
              depth={depth + 1}
              packKey={packKey}
              value={item}
            />
          </fieldset>
        ))}
        {value.length > MAX_ARRAY_ITEMS ? (
          <p className="text-muted-foreground text-xs">
            … and {value.length - MAX_ARRAY_ITEMS} more (open JSON tree for full
            dump).
          </p>
        ) : null}
      </div>
    );
  }

  if (isPlainObject(value)) {
    if (
      packKey === "roomTemplates" &&
      fieldKey === "baseVector" &&
      isNumericRecord(value)
    ) {
      const dimCount = Object.keys(value).length;
      const nonZero = Object.values(value).filter(
        (n) => typeof n === "number" && Math.abs(n) > 1e-9
      ).length;
      return (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Omitted: per-room narrative embedding ({dimCount} dimensions,{" "}
          {nonZero} non-zero). Dungeon gameplay uses{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            feature
          </code>
          , exits, and encounter rules — not this vector in the Kaplay demo.
        </p>
      );
    }
    if (
      (fieldKey === "anchorVector" || fieldKey === "effectVector") &&
      isNumericRecord(value)
    ) {
      return (
        <StatMapChips
          resolve={(k) => narrativeTraitDisplay(k)}
          title={
            fieldKey === "anchorVector"
              ? "Narrative traits (dialogue anchor)"
              : "Narrative traits (dialogue effect)"
          }
          value={value}
          variant={
            fieldKey === "anchorVector"
              ? "narrative-anchor"
              : "narrative-effect"
          }
        />
      );
    }
    if (fieldKey === "narrativeProfile" && isNumericRecord(value)) {
      return (
        <StatMapChips
          resolve={(k) => narrativeTraitDisplay(k)}
          title={narrativeProfileTitle(packKey)}
          value={value}
          variant="narrative-neutral"
        />
      );
    }
    if (fieldKey === "narrativeStats" && isNumericRecord(value)) {
      return (
        <StatMapChips
          resolve={(k) => narrativeTraitDisplay(k)}
          title="Narrative stats (entity)"
          value={value}
          variant="narrative-neutral"
        />
      );
    }
    if (fieldKey === "combatStats" && isNumericRecord(value)) {
      return (
        <StatMapChips
          resolve={(k) => combatStatDisplay(k)}
          title="Combat stats"
          value={value}
          variant="combat"
        />
      );
    }
    if (fieldKey === "skillStats" && isNumericRecord(value)) {
      return (
        <StatMapChips
          resolve={(k) => skillStatDisplay(k)}
          title="Skill axes (proficiency)"
          value={value}
          variant="skill"
        />
      );
    }
    if (
      fieldKey &&
      NARRATIVE_DELTA_FIELDS.has(fieldKey) &&
      isNumericRecord(value)
    ) {
      return (
        <StatMapChips
          resolve={(k) => narrativeTraitDisplay(k)}
          title={narrativeDeltaTitle(fieldKey)}
          value={value}
          variant="narrative-neutral"
        />
      );
    }
    const visualThumb =
      fieldKey === "visual" || fieldKey === "visualRef"
        ? pickImageUrlFromVisualBlock(value)
        : null;
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    return (
      <div className="space-y-3">
        {visualThumb ? (
          <ContentPackEntryThumb
            height={80}
            sizeClass="size-20"
            url={visualThumb}
            width={80}
          />
        ) : null}
        <div className="grid gap-3">
          {keys.map((k) => (
            <div
              className="rounded-lg border border-border/45 bg-background/40 p-3 shadow-sm"
              key={k}
            >
              <div className="mb-1.5 font-semibold text-foreground text-xs tracking-tight">
                {formatFieldLabel(k)}
              </div>
              <ContentAutoValueForm
                depth={depth + 1}
                fieldKey={k}
                packKey={packKey}
                value={value[k]}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <span className="font-mono text-foreground text-xs">{String(value)}</span>
  );
}
