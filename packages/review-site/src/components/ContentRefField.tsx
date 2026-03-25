"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useContentHub } from "@/components/content-hub-context";
import {
  type ContentReferenceIndex,
  getContentReferenceIndex,
  REF_CATEGORY_CLASS,
  type ResolvedRef,
} from "@/lib/content-reference-index";

export function isContentRefFieldKey(fieldKey: string | undefined): boolean {
  if (!fieldKey) {
    return false;
  }
  const fk = fieldKey;
  const exact = new Set([
    "runeId",
    "skillId",
    "spellId",
    "dialogueId",
    "cutsceneId",
    "questId",
    "eventId",
    "archetypeId",
    "itemId",
    "rarityId",
    "entityTypeId",
    "runeCombo",
    "onSelectEventIds",
    "onSelectCutsceneIds",
  ]);
  if (exact.has(fk)) {
    return true;
  }
  return (
    fk.endsWith("RuneId") ||
    fk.endsWith("SkillId") ||
    fk.endsWith("SpellId") ||
    fk.endsWith("DialogueId") ||
    fk.endsWith("CutsceneId") ||
    fk.endsWith("QuestId") ||
    fk.endsWith("EventId") ||
    fk.endsWith("ArchetypeId") ||
    fk.endsWith("ItemId") ||
    fk.endsWith("RarityId") ||
    fk.endsWith("EntityTypeId")
  );
}

function RefChrome({
  resolved,
  children,
  rawValue,
}: {
  resolved: ResolvedRef;
  children: ReactNode;
  rawValue: string;
}) {
  const styles = REF_CATEGORY_CLASS[resolved.category];
  return (
    <div
      className={`rounded-md border border-border/50 bg-card/40 ${styles.border}`}
    >
      <div className="flex flex-wrap items-center gap-2 px-2 pt-1.5">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide ${styles.badge}`}
        >
          {resolved.category}
        </span>
        {children}
      </div>
      <input
        aria-label={`${resolved.category} id`}
        className="w-full border-0 border-border/40 border-t bg-transparent px-2 py-1.5 font-mono text-foreground text-sm outline-none"
        readOnly
        type="text"
        value={rawValue}
      />
    </div>
  );
}

export function ContentReferencedString({
  fieldKey,
  value,
}: {
  fieldKey?: string;
  value: string;
}) {
  const hub = useContentHub();
  const index = useMemo(
    () => getContentReferenceIndex(hub?.allPacks ?? null),
    [hub?.allPacks]
  );
  const resolved = fieldKey ? index.resolve(fieldKey, value) : null;
  const suggestions =
    fieldKey && isContentRefFieldKey(fieldKey)
      ? index.suggestIdsForField(fieldKey, 20)
      : [];

  if (!resolved) {
    return (
      <div className="space-y-1">
        <input
          className="w-full max-w-xl rounded-md border border-input bg-background px-2 py-1.5 font-mono text-foreground text-sm shadow-sm"
          readOnly
          type="text"
          value={value}
        />
        {fieldKey && suggestions.length > 0 ? (
          <RefSuggestions
            fieldKey={fieldKey}
            index={index}
            suggestions={suggestions}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <RefChrome rawValue={value} resolved={resolved}>
        <div className="min-w-0 flex-1 text-foreground text-sm">
          {resolved.label !== resolved.id ? (
            <span className="font-medium">{resolved.label}</span>
          ) : (
            <span className="text-muted-foreground">No separate title</span>
          )}
          {resolved.subtitle ? (
            <span className="ml-2 text-muted-foreground text-xs">
              ({resolved.subtitle})
            </span>
          ) : null}
        </div>
        {hub ? (
          <button
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 font-medium text-primary text-xs hover:bg-primary/20"
            onClick={() => hub.openPack(resolved.targetPack, resolved.id)}
            type="button"
          >
            <ExternalLink aria-hidden className="size-3" />
            Open pack
          </button>
        ) : null}
      </RefChrome>
      {resolved.known ? null : (
        <p className="text-amber-600/90 text-xs dark:text-amber-400/90">
          Id not found in loaded bundle — check spelling or regenerate the
          bundle.
        </p>
      )}
      {fieldKey && suggestions.length > 0 ? (
        <RefSuggestions
          fieldKey={fieldKey}
          index={index}
          suggestions={suggestions}
        />
      ) : null}
    </div>
  );
}

function RefSuggestions({
  fieldKey,
  index,
  suggestions,
}: {
  fieldKey: string;
  index: ContentReferenceIndex;
  suggestions: string[];
}) {
  const hub = useContentHub();
  const sample = index.resolve(fieldKey, suggestions[0] ?? "");
  const packKey = sample?.targetPack;

  if (!(hub && packKey)) {
    return null;
  }

  return (
    <details className="rounded-md border border-border/40 bg-muted/10 px-2 py-1.5">
      <summary className="cursor-pointer font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
        Sample ids in bundle ({suggestions.length})
      </summary>
      <p className="mt-1 text-[10px] text-muted-foreground leading-snug">
        Jump to <code className="rounded bg-muted px-1 py-0.5">{packKey}</code>{" "}
        with list filter (review hub only).
      </p>
      <div className="mt-1.5 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
        {suggestions.map((id) => (
          <button
            className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-foreground hover:border-primary/50 hover:bg-primary/10"
            key={id}
            onClick={() => hub.openPack(packKey, id)}
            type="button"
          >
            {id}
          </button>
        ))}
      </div>
    </details>
  );
}

export function ContentReferencedStringList({
  fieldKey,
  values,
}: {
  fieldKey: string;
  values: string[];
}) {
  const hub = useContentHub();
  const index = useMemo(
    () => getContentReferenceIndex(hub?.allPacks ?? null),
    [hub?.allPacks]
  );

  if (values.length === 0) {
    return <span className="text-muted-foreground text-xs">Empty list</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
        {fieldKey.replace(/([A-Z])/g, " $1").trim()} ({values.length})
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {values.map((raw) => {
          let resolved: ResolvedRef | null = null;
          if (fieldKey === "runeCombo") {
            resolved = index.resolveRuneComboId(raw);
          } else {
            resolved = index.resolve(fieldKey, raw);
          }
          if (!resolved) {
            return (
              <li key={raw}>
                <code className="rounded border border-border/50 bg-muted/30 px-2 py-1 font-mono text-[10px]">
                  {raw}
                </code>
              </li>
            );
          }
          const styles = REF_CATEGORY_CLASS[resolved.category];
          return (
            <li key={raw}>
              <span
                className={`inline-flex max-w-full items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 font-mono text-[10px] ${styles.badge}`}
                title={`${resolved.label}${resolved.known ? "" : " (missing from bundle)"}`}
              >
                <span className="truncate">{raw}</span>
                {resolved.label !== raw ? (
                  <span className="truncate opacity-80">
                    · {resolved.label}
                  </span>
                ) : null}
                {hub ? (
                  <button
                    className="ml-0.5 shrink-0 rounded p-0.5 hover:bg-background/40"
                    onClick={() => hub.openPack(resolved.targetPack, raw)}
                    title="Open pack"
                    type="button"
                  >
                    <ExternalLink aria-hidden className="size-3" />
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
