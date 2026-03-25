"use client";

import JsonView from "@uiw/react-json-view";
import { vscodeTheme } from "@uiw/react-json-view/vscode";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Box,
  Brain,
  Clapperboard,
  Crosshair,
  Gauge,
  Gem,
  Layers,
  Link2,
  Loader2,
  MapIcon,
  Medal,
  MessageCircle,
  Package,
  Radar,
  Scale,
  ScrollText,
  Shapes,
  ShoppingBag,
  Sparkles,
  Swords,
  Target,
  UserCog,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContentPackStructuredView } from "@/components/ContentPackStructuredView";
import { ContentHubContext } from "@/components/content-hub-context";
import {
  GameStatsCharacterPreview,
  GameStatsCurrencyCallout,
} from "@/components/GameStatsReviewPanels";
import { InfoTip } from "@/components/InfoTip";
import {
  type ContentCollectionCategory,
  filterExplorerPackKeys,
  groupPackKeys,
  metaForPackKey,
} from "@/lib/content-collection-meta";
import { canBrowseAsStructuredList } from "@/lib/content-pack-list-helpers";

const CATEGORY_ICON: Record<ContentCollectionCategory, LucideIcon> = {
  schema: Shapes,
  stats: BarChart3,
  rules: Scale,
  actions: Swords,
  narrative: ScrollText,
  world: MapIcon,
  other: Box,
};

const CATEGORY_COLLECTION_HELP: Record<ContentCollectionCategory, string> = {
  schema:
    "Schemas, rarities, entity typing, and content provenance — how models are validated, not live dungeon state.",
  stats:
    "Catalogs of named axes: keys end up on entities (combatStats, skillStats, narrativeStats) or per-rune affinity (runeStats).",
  rules:
    "Global tuning: economy payouts, merchant curves, affinity gain/cap/decay, forge costs — not per-entity numbers.",
  actions:
    "Intent, policy, and formula wiring for what the engine can resolve on a turn.",
  narrative:
    "Authored story and gear: items (including currency rows), skills, spells, dialogue, quests, events.",
  world:
    "Layouts, room templates, and space payloads used for maps and tooling.",
  other: "Bundle slices without a dedicated hub category yet.",
};

/** Per-pack row icon (actionable / browse affordance); not game sprites — spells lack icon URLs in JSON today. */
const PACK_ROW_ICON: Record<string, LucideIcon> = {
  questPack: Target,
  itemPack: ShoppingBag,
  skillPack: Sparkles,
  spellPack: Wand2,
  runePack: Gem,
  runeAffinity: Link2,
  gameStats: Gauge,
  combatStatPack: Activity,
  narrativeStats: Brain,
  skillStats: Crosshair,
  rarities: Medal,
  dialoguePack: MessageCircle,
  cutscenePack: Clapperboard,
  eventPack: Zap,
  actionCatalog: Swords,
  actionIntents: Radar,
  actionPolicies: ScrollText,
  actionContracts: Layers,
  archetypePack: Users,
  entityTypes: Users,
  runtimeEntityIdentity: UserCog,
  dungeonLayouts: MapIcon,
  roomTemplates: Layers,
  contentSchema: Shapes,
  contentSource: BookOpen,
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
    const fromInitial = filterExplorerPackKeys(initialPackKeys);
    if (hasPacks(initialPacks ?? null)) {
      const keys = filterExplorerPackKeys(
        Object.keys(initialPacks as PackMap).sort((a, b) => a.localeCompare(b))
      );
      const pick = fromInitial.find((k) => keys.includes(k)) ?? keys[0];
      return pick ?? null;
    }
    return fromInitial[0] ?? null;
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
        const keys = filterExplorerPackKeys(
          Object.keys(p).sort((a, b) => a.localeCompare(b))
        );
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
    () =>
      packs
        ? filterExplorerPackKeys(
            Object.keys(packs).sort((a, b) => a.localeCompare(b))
          )
        : [],
    [packs]
  );

  const grouped = useMemo(() => groupPackKeys(keys), [keys]);

  const selectedValue = useMemo(() => {
    if (!(packs && selected)) {
      return null;
    }
    return packs[selected];
  }, [packs, selected]);

  const [listFilterPreset, setListFilterPreset] = useState<string | null>(null);

  const clearListFilterPreset = useCallback(() => {
    setListFilterPreset(null);
  }, []);

  const openPack = useCallback((packKey: string, listFilter?: string) => {
    setSelected(packKey);
    setListFilterPreset(listFilter ?? null);
  }, []);

  const selectKey = useCallback((key: string) => {
    setSelected(key);
    setListFilterPreset(null);
  }, []);

  const hubApi = useMemo(
    () => ({
      allPacks: packs,
      openPack,
    }),
    [packs, openPack]
  );

  const meta = selected ? metaForPackKey(selected) : null;

  const structuredOk = useMemo(
    () => canBrowseAsStructuredList(selectedValue),
    [selectedValue]
  );

  const [detailPanel, setDetailPanel] = useState<"structured" | "json">(
    "structured"
  );

  useEffect(() => {
    setDetailPanel(structuredOk ? "structured" : "json");
  }, [structuredOk]);

  /** v2 alpha: numeric `collapsed` clears `shouldExpandNodeInitially` in the provider and breaks expand/collapse (#79). Use `collapsed={false}` + callback instead. */
  const shouldExpandNodeInitially = useCallback(
    (_isExpanded: boolean, { level }: { level: number }) => level >= 2,
    []
  );

  let detailContent: ReactNode;
  if (selectedValue === null || selectedValue === undefined) {
    detailContent = (
      <p className="text-muted-foreground text-sm">
        {loading ? "Loading…" : "No data for this selection."}
      </p>
    );
  } else if (detailPanel === "structured" && structuredOk && selected) {
    detailContent = (
      <>
        {selected === "gameStats" && packs ? (
          <>
            <GameStatsCurrencyCallout packs={packs} />
            <GameStatsCharacterPreview packs={packs} />
          </>
        ) : null}
        <ContentPackStructuredView
          allPacks={packs ?? undefined}
          key={selected}
          packKey={selected}
          value={selectedValue}
        />
      </>
    );
  } else {
    detailContent = (
      <JsonView
        className="text-sm"
        collapsed={false}
        displayDataTypes={false}
        enableClipboard
        indentWidth={14}
        key={`${selected}-json`}
        objectSortKeys
        shortenTextAfterLength={48}
        shouldExpandNodeInitially={shouldExpandNodeInitially}
        style={vscodeTheme as CSSProperties}
        value={
          selectedValue !== null && typeof selectedValue === "object"
            ? (selectedValue as object)
            : { value: selectedValue }
        }
      />
    );
  }

  return (
    <ContentHubContext.Provider value={hubApi}>
      <div className="flex min-h-[28rem] flex-col gap-4 lg:flex-row">
        <aside
          aria-label="Content collections"
          className="relative z-10 w-full shrink-0 space-y-4 lg:w-72"
        >
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="mb-1 flex items-center gap-1 font-semibold text-foreground text-sm">
              <Layers aria-hidden className="size-4 text-primary" />
              Collections
              <InfoTip
                contentClassName="max-w-xs text-xs leading-snug"
                side="right"
              >
                Pick a slice of the bundle. Keys match pipeline output — see
                CONTENT-BUNDLE-NOTES.md in the repo.
              </InfoTip>
            </div>
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
                    <div className="mb-2 flex items-center gap-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      <CatIcon aria-hidden className="size-3.5" />
                      {label}
                      <InfoTip
                        contentClassName="max-w-xs text-xs leading-snug normal-case font-normal"
                        side="right"
                      >
                        {CATEGORY_COLLECTION_HELP[category]}
                      </InfoTip>
                    </div>
                    <ul className="space-y-1">
                      {items.map((item) => {
                        const active = item.id === selected;
                        const RowIcon = PACK_ROW_ICON[item.id] ?? Package;
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
                                <RowIcon
                                  aria-hidden
                                  className="size-3.5 shrink-0 text-primary/90 opacity-90"
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
              <h3 className="flex flex-wrap items-center gap-2 font-semibold text-foreground text-lg">
                <BookOpen aria-hidden className="size-5 text-primary" />
                {meta?.title ?? "Select a collection"}
                {meta?.description ? (
                  <InfoTip
                    contentClassName="max-w-md text-sm leading-snug"
                    side="right"
                  >
                    {meta.description}
                  </InfoTip>
                ) : null}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {structuredOk ? (
                <fieldset className="m-0 min-w-0 border-0 p-0">
                  <legend className="sr-only">Detail view mode</legend>
                  <div className="flex rounded-lg border border-border/80 bg-muted/30 p-0.5">
                    <button
                      className={`rounded-md px-3 py-1.5 font-medium text-xs transition ${
                        detailPanel === "structured"
                          ? "bg-gradient-to-r from-purple-500/90 to-indigo-600/90 text-white shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setDetailPanel("structured")}
                      type="button"
                    >
                      List &amp; cards
                    </button>
                    <button
                      className={`rounded-md px-3 py-1.5 font-medium text-xs transition ${
                        detailPanel === "json"
                          ? "bg-gradient-to-r from-purple-500/90 to-indigo-600/90 text-white shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setDetailPanel("json")}
                      type="button"
                    >
                      JSON tree
                    </button>
                  </div>
                </fieldset>
              ) : null}
              {selected ? (
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground text-xs">
                  packs.{selected}
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative z-0 max-h-[min(70vh,48rem)] overflow-auto rounded-lg border border-border bg-background/50 p-3">
            {detailContent}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
            <Wand2 aria-hidden className="size-3.5 shrink-0" />
            <span>Read-only snapshot.</span>
            <InfoTip contentClassName="max-w-sm text-xs leading-snug">
              List &amp; cards browse rows and fields; JSON tree shows the raw
              slice. Reference fields can open another pack with a list filter
              (hub only).
            </InfoTip>
          </div>
        </section>
      </div>
    </ContentHubContext.Provider>
  );
}
