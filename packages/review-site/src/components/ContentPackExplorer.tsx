import JsonView from "@uiw/react-json-view";
import { vscodeTheme } from "@uiw/react-json-view/vscode";
import {
  BookOpen,
  Box,
  Layers,
  Loader2,
  MapIcon,
  Package,
  ScrollText,
  Shapes,
  Swords,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ContentCollectionCategory,
  groupPackKeys,
  metaForPackKey,
} from "@/lib/content-collection-meta";

const CATEGORY_ICON: Record<ContentCollectionCategory, typeof Package> = {
  schema: Shapes,
  actions: Swords,
  narrative: ScrollText,
  world: MapIcon,
  other: Box,
};

type PackMap = Record<string, unknown>;

interface Props {
  /** e.g. `../game/content-pack.bundle.v1.json` from `/data/index.html` */
  bundleUrl: string;
  initialPackKeys: string[];
  /** When set (e.g. from Astro at build time), skips `fetch` — required for `file://` and large bundles. */
  initialPacks?: PackMap | null;
}

function hasPacks(p: PackMap | null | undefined): p is PackMap {
  return Boolean(p && typeof p === "object" && Object.keys(p).length > 0);
}

export function ContentPackExplorer({
  bundleUrl,
  initialPackKeys,
  initialPacks,
}: Props) {
  const [loading, setLoading] = useState(() => !hasPacks(initialPacks ?? null));
  const [error, setError] = useState<string | null>(null);
  const [packs, setPacks] = useState<PackMap | null>(() =>
    hasPacks(initialPacks ?? null) ? (initialPacks as PackMap) : null
  );
  const [selected, setSelected] = useState<string | null>(() => {
    if (hasPacks(initialPacks ?? null)) {
      const keys = Object.keys(initialPacks as PackMap).sort((a, b) =>
        a.localeCompare(b)
      );
      const pick = initialPackKeys.find((k) => keys.includes(k)) ?? keys[0];
      return pick ?? null;
    }
    return initialPackKeys[0] ?? null;
  });

  useEffect(() => {
    if (hasPacks(initialPacks ?? null)) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(bundleUrl)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`${r.status} ${r.statusText}`);
        }
        return r.json() as Promise<{ packs?: PackMap }>;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }
        const p = data.packs;
        if (!p || typeof p !== "object") {
          throw new Error("Bundle has no `packs` object");
        }
        setPacks(p);
        const keys = Object.keys(p).sort((a, b) => a.localeCompare(b));
        setSelected((cur) =>
          cur && keys.includes(cur) ? cur : (keys[0] ?? null)
        );
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bundleUrl, initialPacks]);

  const keys = useMemo(
    () => (packs ? Object.keys(packs).sort((a, b) => a.localeCompare(b)) : []),
    [packs]
  );

  const grouped = useMemo(() => groupPackKeys(keys), [keys]);

  const selectedValue = useMemo(() => {
    if (!(packs && selected)) {
      return null;
    }
    return packs[selected];
  }, [packs, selected]);

  const selectKey = useCallback((key: string) => {
    setSelected(key);
  }, []);

  const meta = selected ? metaForPackKey(selected) : null;

  return (
    <div className="flex min-h-[28rem] flex-col gap-4 lg:flex-row">
      <aside
        aria-label="Content collections"
        className="w-full shrink-0 space-y-4 lg:w-72"
      >
        <div className="rounded-xl border border-border bg-card/60 p-3">
          <div className="mb-2 flex items-center gap-2 font-semibold text-foreground text-sm">
            <Layers aria-hidden className="size-4 text-primary" />
            Collections
          </div>
          <p className="text-muted-foreground text-xs leading-snug">
            Pick a slice of the bundle. Keys match ingest output — see{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
              CONTENT-BUNDLE-NOTES.md
            </code>{" "}
            in the repo.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-4 text-muted-foreground text-sm">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Loading bundle…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-3 text-destructive text-sm">
            {error}
          </div>
        ) : null}

        {!(loading || error) && packs
          ? grouped.map(({ category, label, items }) => {
              const CatIcon = CATEGORY_ICON[category];
              return (
                <div key={category}>
                  <div className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    <CatIcon aria-hidden className="size-3.5" />
                    {label}
                  </div>
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const active = item.id === selected;
                      return (
                        <li key={item.id}>
                          <button
                            className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left transition ${
                              active
                                ? "border-primary bg-primary/15 shadow-md"
                                : "border-transparent bg-card/40 hover:border-border hover:bg-card"
                            }`}
                            onClick={() => selectKey(item.id)}
                            type="button"
                          >
                            <span className="flex items-center gap-2 font-medium text-foreground text-sm">
                              <Package
                                aria-hidden
                                className="size-3.5 shrink-0 opacity-70"
                              />
                              {item.title}
                            </span>
                            <span className="mt-0.5 font-mono text-[10px] text-muted-foreground leading-tight">
                              {item.id}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          : null}
      </aside>

      <section className="min-w-0 flex-1 rounded-xl border border-border bg-card/40 p-4 shadow-inner">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-border border-b pb-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground text-lg">
              <BookOpen aria-hidden className="size-5 text-primary" />
              {meta?.title ?? "Select a collection"}
            </h3>
            {meta ? (
              <p className="mt-1 max-w-prose text-muted-foreground text-sm">
                {meta.description}
              </p>
            ) : null}
          </div>
          {selected ? (
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground text-xs">
              packs.{selected}
            </span>
          ) : null}
        </div>

        <div className="max-h-[min(70vh,48rem)] overflow-auto rounded-lg border border-border bg-background/50 p-3">
          {selectedValue !== null && selectedValue !== undefined ? (
            <JsonView
              className="text-sm"
              collapsed={2}
              displayDataTypes={false}
              enableClipboard
              indentWidth={14}
              objectSortKeys
              shortenTextAfterLength={48}
              style={vscodeTheme}
              value={
                selectedValue !== null && typeof selectedValue === "object"
                  ? (selectedValue as object)
                  : { value: selectedValue }
              }
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              {loading ? "Loading…" : "No data for this selection."}
            </p>
          )}
        </div>

        <p className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
          <Wand2 aria-hidden className="size-3.5" />
          Read-only tree (bundle snapshot). Editing happens in the content
          pipeline, not here.
        </p>
      </section>
    </div>
  );
}
