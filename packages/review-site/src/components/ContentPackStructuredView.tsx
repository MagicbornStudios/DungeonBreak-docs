"use client";

import { ChevronRight, ListTree, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ContentAutoValueForm } from "@/components/ContentAutoValueForm";
import { ContentPackEntryThumb } from "@/components/content-pack-thumbnail";
import {
  discoverEntityArrayBranches,
  filterEntityItems,
  flatObjectEntries,
  inferEntryLabel,
  inferEntrySubtitle,
  isPlainObject,
  pickPreviewImageUrl,
  stableEntryRowKey,
} from "@/lib/content-pack-list-helpers";
import { cn } from "@/lib/utils";

type PackMap = Record<string, unknown>;

interface StructuredProps {
  value: unknown;
  /** Active pack id (e.g. `spellPack`) for cross-pack hints. */
  packKey?: string | null;
  /** Full bundle `packs` for affinity copy next to spells, etc. */
  allPacks?: PackMap | null;
}

function SpellRuneAffinityHint({ affinity }: { affinity: unknown }) {
  if (!isPlainObject(affinity)) {
    return null;
  }
  const gain = isPlainObject(affinity.gain) ? affinity.gain : null;
  const crafting = isPlainObject(affinity.spellCrafting)
    ? affinity.spellCrafting
    : null;
  const cap =
    typeof gain?.cap === "number" || typeof gain?.cap === "string"
      ? String(gain.cap)
      : null;
  const perRune =
    typeof gain?.amountPerRunePerCast === "number"
      ? gain.amountPerRunePerCast
      : null;
  const perCast =
    typeof gain?.perCast === "string" && gain.perCast.trim()
      ? gain.perCast.trim()
      : null;
  const powerBonus =
    typeof crafting?.powerBonus === "string" && crafting.powerBonus.trim()
      ? crafting.powerBonus.trim()
      : null;

  if (!(perCast || perRune !== null || cap || powerBonus)) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-foreground text-xs leading-relaxed">
      <p className="font-semibold text-primary/90">Rune affinity (bundle)</p>
      {perCast ? <p className="mt-1 text-muted-foreground">{perCast}</p> : null}
      {perRune !== null && cap ? (
        <p className="mt-1 text-muted-foreground">
          +{perRune} affinity per rune per cast · cap {cap}
        </p>
      ) : null}
      {powerBonus ? (
        <p className="mt-1 text-muted-foreground">{powerBonus}</p>
      ) : null}
    </div>
  );
}

function FlatKeyValueTable({
  entries,
}: {
  entries: { key: string; value: string }[];
}) {
  return (
    <div className="overflow-auto rounded-lg border border-border/60">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-border border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-semibold text-foreground text-xs">
              Field
            </th>
            <th className="px-3 py-2 font-semibold text-foreground text-xs">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((row) => (
            <tr
              className="border-border/60 border-b last:border-0"
              key={row.key}
            >
              <td className="px-3 py-2 align-top font-mono text-muted-foreground text-xs">
                {row.key}
              </td>
              <td className="px-3 py-2 text-foreground text-xs">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContentPackStructuredView({
  value,
  packKey,
  allPacks,
}: StructuredProps) {
  const branches = useMemo(() => discoverEntityArrayBranches(value), [value]);
  const flatRows = useMemo(() => flatObjectEntries(value), [value]);

  const [branchKey, setBranchKey] = useState(() => branches[0]?.key ?? "");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const next = branches[0]?.key ?? "";
    setBranchKey(next);
    setQuery("");
    setSelectedIndex(0);
  }, [branches]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.key === branchKey) ?? branches[0],
    [branches, branchKey]
  );

  const filteredItems = useMemo(() => {
    if (!activeBranch) {
      return [];
    }
    return filterEntityItems(activeBranch.items, query);
  }, [activeBranch, query]);

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filteredItems.length - 1)));
  }, [filteredItems.length]);

  const selected = filteredItems[selectedIndex] ?? null;
  const selectedThumb = selected ? pickPreviewImageUrl(selected) : null;

  if (branches.length > 0 && activeBranch) {
    return (
      <div className="flex min-h-[min(70vh,48rem)] flex-col gap-3 md:flex-row">
        <div className="flex min-h-0 w-full shrink-0 flex-col gap-2 md:w-[min(100%,22rem)]">
          {branches.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {branches.map((b) => (
                <button
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-medium text-xs transition",
                    b.key === branchKey
                      ? "border-primary bg-primary/15 text-foreground shadow-sm"
                      : "border-border/60 bg-card/60 text-muted-foreground hover:border-border hover:bg-card"
                  )}
                  key={b.key}
                  onClick={() => {
                    setBranchKey(b.key);
                    setSelectedIndex(0);
                    setQuery("");
                  }}
                  type="button"
                >
                  {b.key}
                  <span className="ml-1 text-[10px] tabular-nums opacity-70">
                    ({b.items.length})
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              aria-label="Filter entries"
              className="w-full rounded-lg border border-border bg-background py-2 pr-3 pl-9 text-foreground text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus-visible:ring-2"
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Filter by id, name, tags…"
              type="search"
              value={query}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-auto rounded-lg border border-border/60 bg-background/40 p-1.5">
            {filteredItems.length === 0 ? (
              <p className="px-2 py-6 text-center text-muted-foreground text-sm">
                No entries match this filter.
              </p>
            ) : (
              filteredItems.map((item, idx) => {
                const label = inferEntryLabel(item);
                const sub = inferEntrySubtitle(item);
                const thumb = pickPreviewImageUrl(item);
                const active = idx === selectedIndex;
                return (
                  <button
                    className={cn(
                      "flex w-full flex-col rounded-lg border px-3 py-2 text-left transition",
                      active
                        ? "border-primary/60 bg-primary/10 shadow-sm"
                        : "border-transparent hover:border-border hover:bg-card/80"
                    )}
                    key={stableEntryRowKey(branchKey, item)}
                    onClick={() => setSelectedIndex(idx)}
                    type="button"
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground text-sm">
                      {thumb ? (
                        <ContentPackEntryThumb
                          height={36}
                          sizeClass="size-9"
                          url={thumb}
                          width={36}
                        />
                      ) : (
                        <ListTree
                          aria-hidden
                          className="size-3.5 shrink-0 text-primary/80"
                        />
                      )}
                      <span className="min-w-0 truncate">{label}</span>
                    </span>
                    {sub ? (
                      <span className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
                        {sub}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-border/60 bg-card/30">
          {selected ? (
            <div className="flex h-full max-h-[min(70vh,48rem)] flex-col">
              <div className="border-border/60 border-b bg-gradient-to-r from-purple-500/10 to-transparent px-4 py-3">
                <div className="flex items-start gap-3">
                  {selectedThumb ? (
                    <ContentPackEntryThumb
                      height={56}
                      sizeClass="size-14"
                      url={selectedThumb}
                      width={56}
                    />
                  ) : (
                    <ChevronRight
                      aria-hidden
                      className="mt-1 size-4 shrink-0 text-primary"
                    />
                  )}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-base text-foreground tracking-tight">
                      {inferEntryLabel(selected)}
                    </h4>
                    {inferEntrySubtitle(selected) ? (
                      <p className="mt-1 text-muted-foreground text-sm">
                        {inferEntrySubtitle(selected)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <p className="mb-3 text-muted-foreground text-xs">
                  Read-only auto layout (labels + inputs). Nested objects and
                  arrays expand below; image URLs render as thumbnails.
                </p>
                {packKey === "spellPack" && allPacks ? (
                  <SpellRuneAffinityHint affinity={allPacks.runeAffinity} />
                ) : null}
                <ContentAutoValueForm packKey={packKey ?? undefined} value={selected} />
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center px-4 text-center text-muted-foreground text-sm">
              {filteredItems.length === 0 && query.trim()
                ? "No entries match this filter."
                : "Select an entry from the list."}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (flatRows && flatRows.length > 0) {
    return <FlatKeyValueTable entries={flatRows} />;
  }

  return (
    <p className="text-muted-foreground text-sm">
      No list layout for this pack — switch to JSON view.
    </p>
  );
}
