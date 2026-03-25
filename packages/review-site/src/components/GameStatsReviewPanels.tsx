"use client";

import { Coins, UserRound } from "lucide-react";
import NextImage from "next/image";
import { useEffect, useMemo, useState } from "react";

type PackMap = Record<string, unknown>;

interface ReviewCharacter {
  characterId: string;
  label: string;
  summary?: string;
  presetId?: string;
  archetypeId: string;
  entityTypeId?: string;
  partyRoleId?: string;
  visual?: {
    iconSpriteUrl?: string;
    frontSpriteUrl?: string;
    backSpriteUrl?: string;
    spriteCollection?: string;
  };
  overrideStarterSkillIds?: string[] | null;
  overrideStarterSpellIds?: string[] | null;
  startingInventory?: { itemId: string; count: number }[];
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function parseOptionalStringList(v: unknown): string[] | null | undefined {
  if (Array.isArray(v)) {
    return readStringArray(v);
  }
  if (v === null) {
    return null;
  }
  return undefined;
}

function parseReviewCharacters(gameStats: unknown): ReviewCharacter[] {
  const r = asRecord(gameStats);
  const raw = r?.reviewPlayableCharacters;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ReviewCharacter[] = [];
  for (const entry of raw) {
    const o = asRecord(entry);
    if (!o) {
      continue;
    }
    const characterId = String(o.characterId ?? "").trim();
    const archetypeId = String(o.archetypeId ?? "").trim();
    const label = String(o.label ?? characterId).trim();
    if (!(characterId && archetypeId)) {
      continue;
    }
    const vis = asRecord(o.visual) ?? undefined;
    out.push({
      characterId,
      label,
      summary: typeof o.summary === "string" ? o.summary : undefined,
      presetId: typeof o.presetId === "string" ? o.presetId : undefined,
      archetypeId,
      entityTypeId:
        typeof o.entityTypeId === "string" ? o.entityTypeId : undefined,
      partyRoleId:
        typeof o.partyRoleId === "string" ? o.partyRoleId : undefined,
      visual: vis
        ? {
            iconSpriteUrl:
              typeof vis.iconSpriteUrl === "string"
                ? vis.iconSpriteUrl
                : undefined,
            frontSpriteUrl:
              typeof vis.frontSpriteUrl === "string"
                ? vis.frontSpriteUrl
                : undefined,
            backSpriteUrl:
              typeof vis.backSpriteUrl === "string"
                ? vis.backSpriteUrl
                : undefined,
            spriteCollection:
              typeof vis.spriteCollection === "string"
                ? vis.spriteCollection
                : undefined,
          }
        : undefined,
      overrideStarterSkillIds: parseOptionalStringList(
        o.overrideStarterSkillIds
      ),
      overrideStarterSpellIds: parseOptionalStringList(
        o.overrideStarterSpellIds
      ),
      startingInventory: Array.isArray(o.startingInventory)
        ? o.startingInventory
            .map((row) => {
              const rowO = asRecord(row);
              if (!rowO) {
                return null;
              }
              const itemId = String(rowO.itemId ?? "").trim();
              const count = Math.max(1, Math.floor(Number(rowO.count ?? 1)));
              return itemId ? { itemId, count } : null;
            })
            .filter((x): x is { itemId: string; count: number } => x !== null)
        : undefined,
    });
  }
  return out;
}

function listById<T extends { [k: string]: unknown }>(
  arr: unknown,
  idKey: string,
  id: string
): T | undefined {
  if (!Array.isArray(arr)) {
    return undefined;
  }
  for (const row of arr) {
    const o = asRecord(row);
    if (o && String(o[idKey] ?? "") === id) {
      return o as T;
    }
  }
  return undefined;
}

export function GameStatsCharacterPreview({
  packs,
}: {
  packs: PackMap | null;
}) {
  const gameStats = packs ? packs.gameStats : null;
  const characters = useMemo(
    () => parseReviewCharacters(gameStats),
    [gameStats]
  );
  const currencyIds = useMemo(() => {
    const r = asRecord(gameStats);
    return new Set(readStringArray(r?.currencyItemIds));
  }, [gameStats]);

  const archetypePack = packs ? packs.archetypePack : null;
  const skillPack = packs ? packs.skillPack : null;
  const spellPack = packs ? packs.spellPack : null;
  const itemPack = packs ? packs.itemPack : null;

  const archetypes = asRecord(archetypePack)?.archetypes;
  const skills = asRecord(skillPack)?.skills;
  const spells = asRecord(spellPack)?.spells;
  const items = asRecord(itemPack)?.items;

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (characters.length === 0) {
      return;
    }
    if (!(activeId && characters.some((c) => c.characterId === activeId))) {
      setActiveId(characters[0].characterId);
    }
  }, [characters, activeId]);

  const active = useMemo(
    () => characters.find((c) => c.characterId === activeId) ?? characters[0],
    [characters, activeId]
  );

  if (characters.length === 0) {
    return null;
  }

  const skillIds =
    active?.overrideStarterSkillIds === null
      ? []
      : (active?.overrideStarterSkillIds ??
        readStringArray(asRecord(gameStats)?.playerStarterSkillIds));
  const spellIds =
    active?.overrideStarterSpellIds === null
      ? []
      : (active?.overrideStarterSpellIds ??
        readStringArray(asRecord(gameStats)?.playerAuthoredStarterSpellIds));

  const arche = active
    ? listById<{
        label?: string;
        description?: string;
        narrativeProfile?: Record<string, number>;
      }>(archetypes, "archetypeId", active.archetypeId)
    : undefined;

  let crystalStacks = 0;
  for (const row of active?.startingInventory ?? []) {
    if (currencyIds.has(row.itemId)) {
      crystalStacks += row.count;
    }
  }

  const portrait =
    active?.visual?.frontSpriteUrl ?? active?.visual?.iconSpriteUrl;

  return (
    <div className="mb-4 rounded-xl border border-primary/25 bg-gradient-to-br from-purple-500/5 to-indigo-600/10 p-4 shadow-md">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <UserRound aria-hidden className="size-5 text-primary" />
        <h4 className="font-semibold text-foreground text-sm tracking-tight">
          Playable character preview
        </h4>
        <span className="text-muted-foreground text-xs">
          (review data from{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            gameStats.reviewPlayableCharacters
          </code>
          )
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {characters.map((c) => (
          <button
            className={`rounded-lg border px-3 py-1.5 font-medium text-xs transition ${
              c.characterId === active?.characterId
                ? "border-primary bg-primary/20 text-foreground shadow-sm"
                : "border-border/60 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
            key={c.characterId}
            onClick={() => setActiveId(c.characterId)}
            type="button"
          >
            {c.label}
          </button>
        ))}
      </div>

      {active ? (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-2">
            {portrait ? (
              <div className="flex size-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/20 p-1 shadow-inner">
                <NextImage
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  height={112}
                  src={portrait}
                  unoptimized
                  width={112}
                />
              </div>
            ) : (
              <div className="flex size-28 items-center justify-center rounded-lg border border-border border-dashed text-muted-foreground text-xs">
                No sprite
              </div>
            )}
            <div className="text-center font-medium text-foreground text-xs">
              {active.label}
            </div>
            {active.summary ? (
              <p className="max-w-[14rem] text-center text-muted-foreground text-xs leading-snug">
                {active.summary}
              </p>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-3 text-sm">
            <dl className="grid gap-1 text-xs sm:grid-cols-2">
              {active.presetId ? (
                <>
                  <dt className="text-muted-foreground">Preset</dt>
                  <dd className="font-mono text-foreground">
                    {active.presetId}
                  </dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">Archetype</dt>
              <dd className="font-mono text-foreground">
                {active.archetypeId}
                {arche?.label ? (
                  <span className="ml-1 text-muted-foreground">
                    ({arche.label})
                  </span>
                ) : null}
              </dd>
              {active.entityTypeId ? (
                <>
                  <dt className="text-muted-foreground">Entity type</dt>
                  <dd className="font-mono text-foreground">
                    {active.entityTypeId}
                  </dd>
                </>
              ) : null}
              {active.partyRoleId ? (
                <>
                  <dt className="text-muted-foreground">Party role</dt>
                  <dd className="font-mono text-foreground">
                    {active.partyRoleId}
                  </dd>
                </>
              ) : null}
            </dl>

            {arche?.narrativeProfile &&
            Object.keys(arche.narrativeProfile).length > 0 ? (
              <div>
                <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Narrative profile (from archetype)
                </p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(arche.narrativeProfile)
                    .filter(([, v]) => typeof v === "number" && v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(([k, v]) => (
                      <span
                        className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 font-mono text-[10px] text-foreground"
                        key={k}
                      >
                        {k}{" "}
                        <span className="text-muted-foreground">
                          {(v as number).toFixed(2)}
                        </span>
                      </span>
                    ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Starter skills
              </p>
              <ul className="flex flex-wrap gap-1 font-mono text-[10px]">
                {skillIds.map((id) => {
                  const sk = listById<{ name?: string }>(skills, "skillId", id);
                  return (
                    <li
                      className="rounded border border-border/50 bg-muted/20 px-1.5 py-0.5"
                      key={id}
                    >
                      {id}
                      {sk?.name ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {sk.name}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Starter spells
              </p>
              <ul className="flex flex-wrap gap-1 font-mono text-[10px]">
                {spellIds.map((id) => {
                  const sp = listById<{ name?: string }>(spells, "spellId", id);
                  return (
                    <li
                      className="rounded border border-border/50 bg-muted/20 px-1.5 py-0.5"
                      key={id}
                    >
                      {id}
                      {sp?.name ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {sp.name}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                <Coins aria-hidden className="size-3" />
                Starting inventory
              </p>
              <ul className="space-y-1 text-[10px]">
                {(active.startingInventory ?? []).map((inv, invIdx) => {
                  const it = listById<{
                    name?: string;
                    tags?: string[];
                    visual?: { iconSpriteUrl?: string };
                  }>(items, "itemId", inv.itemId);
                  const isCur = currencyIds.has(inv.itemId);
                  return (
                    <li
                      className="flex items-center gap-2 rounded border border-border/40 bg-background/60 px-2 py-1"
                      key={`${inv.itemId}-${invIdx}`}
                    >
                      {it?.visual?.iconSpriteUrl ? (
                        <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/30 p-0.5">
                          <NextImage
                            alt=""
                            className="max-h-full max-w-full object-contain"
                            height={24}
                            src={it.visual.iconSpriteUrl}
                            unoptimized
                            width={24}
                          />
                        </span>
                      ) : (
                        <span className="size-6 shrink-0 rounded bg-muted/40" />
                      )}
                      <span className="font-mono text-foreground">
                        {inv.itemId}
                        <span className="text-muted-foreground">
                          {" "}
                          ×{inv.count}
                        </span>
                        {it?.name ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {it.name}
                          </span>
                        ) : null}
                        {isCur ? (
                          <span className="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] text-amber-700 dark:text-amber-300">
                            currency
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {crystalStacks > 0 ? (
                <p className="mt-2 text-muted-foreground text-xs">
                  Crystal stacks in inventory (currency items):{" "}
                  <strong className="text-foreground">{crystalStacks}</strong>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function GameStatsCurrencyCallout({ packs }: { packs: PackMap | null }) {
  const gameStats = packs ? packs.gameStats : null;
  const r = asRecord(gameStats);
  const currencyIds = readStringArray(r?.currencyItemIds);
  if (currencyIds.length === 0) {
    return null;
  }
  const itemPack = packs ? packs.itemPack : null;
  const items = asRecord(itemPack)?.items;
  return (
    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
      <p className="font-medium text-foreground">Economy currency (items)</p>
      <p className="mt-1 text-muted-foreground leading-snug">
        Mana crystals are inventory rows, not a stat map. Canonical ids:{" "}
        {currencyIds.map((id) => (
          <code
            className="mx-0.5 rounded bg-muted px-1 py-0.5 font-mono text-[10px]"
            key={id}
          >
            {id}
          </code>
        ))}
        — open <strong className="text-foreground">Items</strong> for names,
        sprites, and tags.
      </p>
      <ul className="mt-2 space-y-1">
        {currencyIds.map((id) => {
          const it = listById<{ name?: string; description?: string }>(
            items,
            "itemId",
            id
          );
          return (
            <li className="text-muted-foreground" key={id}>
              <span className="font-mono text-foreground">{id}</span>
              {it?.name ? (
                <span>
                  : {it.name}
                  {it.description ? ` — ${it.description}` : ""}
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">
                  {" "}
                  (missing from itemPack in this bundle)
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
