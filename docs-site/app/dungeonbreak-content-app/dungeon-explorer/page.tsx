"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FEATURE_COLOR_TOKENS } from "@/lib/theme-colors";
import {
  ACTION_POLICIES,
  DEFAULT_GAME_CONFIG,
  GameEngine,
  buildDungeonWorld,
} from "@dungeonbreak/engine";
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";

type PlaythroughStep = {
  roomId: string;
  depth: number;
  turn: number;
};

type RoomExit = {
  direction: string;
  depth: number;
  roomId: string;
};

type RoomData = {
  roomId: string;
  depth: number;
  row: number;
  column: number;
  feature: string;
  size: { x: number; y: number; z: number };
  transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  exits: RoomExit[];
  items: Array<{
    itemId: string;
    itemBlueprintId?: string;
    name: string;
    isPresent: boolean;
    rarity?: string;
    tags?: string[];
    transform?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      scale: { x: number; y: number; z: number };
    };
  }>;
};

type LevelData = {
  depth: number;
  rows: number;
  columns: number;
  size: { x: number; y: number; z: number };
  transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  rooms: RoomData[];
};

type DungeonData = {
  title: string;
  startDepth: number;
  startRoomId: string;
  escapeDepth: number;
  escapeRoomId: string;
  size: { x: number; y: number; z: number };
  transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  levels: LevelData[];
};

type PrecomputedDungeonPayload = {
  schemaVersion: string;
  generatedAt?: string;
  seed: number;
  dungeon: DungeonData;
  playthroughSteps: PlaythroughStep[];
};

type SpaceContentPoint = {
  id: string;
  name: string;
  type: string;
  branch: string;
};

type RuntimeRoomAction = {
  actionType: string;
  label: string;
  uiScreen?: string;
  available: boolean;
  blockedReasons: string[];
};

type ActionCategory =
  | "navigation"
  | "narrative"
  | "boasting"
  | "social"
  | "combat"
  | "commerce"
  | "character"
  | "inventory"
  | "unknown";

const EMPTY_LEVEL: LevelData = {
  depth: 0,
  rows: 0,
  columns: 0,
  size: { x: 0, y: 0, z: 0 },
  transform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  rooms: [],
};

const PLOTLY_WARMUP_DELAY_MS = 250;
const PRECOMPUTED_LAYOUT_PATH = "/reports/dungeon-layout.v1.json";
const PLAYTHROUGH_CACHE_KEY = `dungeon-explorer-playthrough-${DEFAULT_GAME_CONFIG.randomSeed}`;
const SPACE_DATA_PATH = "/space-data.json";

const ROOM_TYPE_TO_CONTENT_BRANCHES: Record<string, string[]> = {
  start: ["perception"],
  corridor: ["perception"],
  training: ["perception", "craft"],
  dialogue: ["dialogue"],
  rest: ["perception", "dialogue"],
  combat: ["combat"],
  treasure: ["craft", "combat"],
  rune_forge: ["craft", "archetype"],
  stairs_up: ["perception"],
  stairs_down: ["perception"],
  exit: ["perception", "archetype"],
  escape_gate: ["archetype", "dialogue"],
};

const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  navigation: "Navigation",
  narrative: "Narrative",
  boasting: "Boasting",
  social: "Social",
  combat: "Combat",
  commerce: "Commerce",
  character: "Character",
  inventory: "Inventory",
  unknown: "Unknown",
};

const ACTION_CATEGORY_ICONS: Record<ActionCategory, string> = {
  navigation: "[N]",
  narrative: "[T]",
  boasting: "[B]",
  social: "[S]",
  combat: "[C]",
  commerce: "[$]",
  character: "[R]",
  inventory: "[I]",
  unknown: "[?]",
};

const ACTION_CATEGORY_COLORS: Record<ActionCategory, string> = {
  navigation: "#0ea5e9",
  narrative: "#a855f7",
  boasting: "#f59e0b",
  social: "#14b8a6",
  combat: "#ef4444",
  commerce: "#84cc16",
  character: "#22c55e",
  inventory: "#6366f1",
  unknown: "#6b7280",
};

function categorizeAction(actionType: string): ActionCategory {
  if (actionType === "move" || actionType === "flee") return "navigation";
  if (actionType === "talk" || actionType === "speak" || actionType === "choose_dialogue") {
    return "narrative";
  }
  if (actionType === "live_stream") return "boasting";
  if (actionType === "recruit") return "social";
  if (actionType === "fight" || actionType === "murder") return "combat";
  if (actionType === "purchase" || actionType === "re_equip") return "commerce";
  if (actionType === "train" || actionType === "rest" || actionType === "evolve_skill") {
    return "character";
  }
  if (
    actionType === "search" ||
    actionType === "steal" ||
    actionType === "use_item" ||
    actionType === "equip_item" ||
    actionType === "drop_item"
  ) {
    return "inventory";
  }
  return "unknown";
}

const DEFAULT_PRIORITY =
  ACTION_POLICIES.policies.find((p) => p.policyId === "agent-play-default")?.priorityOrder ?? [
    "choose_dialogue",
    "evolve_skill",
    "fight",
    "flee",
    "steal",
    "recruit",
    "murder",
    "search",
    "talk",
    "train",
    "live_stream",
    "move",
    "rest",
    "speak",
  ];

type Updater<T> = T | ((prev: T) => T);

function resolveUpdater<T>(current: T, updater: Updater<T>): T {
  return typeof updater === "function" ? (updater as (prev: T) => T)(current) : updater;
}

type DungeonExplorerUiState = {
  payload: PrecomputedDungeonPayload | null;
  selectedDepth: number;
  selectedRoomId: string;
  roomTypeFilter: string[];
  visibleDepths: number[];
  showPathOverlay: boolean;
  vizMode: "2d" | "3d";
  hoverRoomId: string | null;
  playthroughSteps: PlaythroughStep[];
  spaceContent: SpaceContentPoint[];
  actionCategoryFilter: ActionCategory[];
  setPayload: (payload: PrecomputedDungeonPayload | null) => void;
  setSelectedDepth: (depth: number) => void;
  setSelectedRoomId: (roomId: string) => void;
  setRoomTypeFilter: (updater: Updater<string[]>) => void;
  setVisibleDepths: (updater: Updater<number[]>) => void;
  setShowPathOverlay: (updater: Updater<boolean>) => void;
  setVizMode: (mode: "2d" | "3d") => void;
  setHoverRoomId: (roomId: string | null) => void;
  setPlaythroughSteps: (steps: PlaythroughStep[]) => void;
  setSpaceContent: (content: SpaceContentPoint[]) => void;
  setActionCategoryFilter: (updater: Updater<ActionCategory[]>) => void;
};

const useDungeonExplorerStore = create<DungeonExplorerUiState>()(
  immer((set) => ({
    payload: null,
    selectedDepth: 0,
    selectedRoomId: "",
    roomTypeFilter: [],
    visibleDepths: [],
    showPathOverlay: true,
    vizMode: "2d",
    hoverRoomId: null,
    playthroughSteps: [],
    spaceContent: [],
    actionCategoryFilter: [],
    setPayload: (payload) =>
      set((state) => {
        state.payload = payload;
      }),
    setSelectedDepth: (depth) =>
      set((state) => {
        state.selectedDepth = depth;
      }),
    setSelectedRoomId: (roomId) =>
      set((state) => {
        state.selectedRoomId = roomId;
      }),
    setRoomTypeFilter: (updater) =>
      set((state) => {
        state.roomTypeFilter = resolveUpdater(state.roomTypeFilter, updater);
      }),
    setVisibleDepths: (updater) =>
      set((state) => {
        state.visibleDepths = resolveUpdater(state.visibleDepths, updater);
      }),
    setShowPathOverlay: (updater) =>
      set((state) => {
        state.showPathOverlay = resolveUpdater(state.showPathOverlay, updater);
      }),
    setVizMode: (mode) =>
      set((state) => {
        state.vizMode = mode;
      }),
    setHoverRoomId: (roomId) =>
      set((state) => {
        state.hoverRoomId = roomId;
      }),
    setPlaythroughSteps: (steps) =>
      set((state) => {
        state.playthroughSteps = steps;
      }),
    setSpaceContent: (content) =>
      set((state) => {
        state.spaceContent = content;
      }),
    setActionCategoryFilter: (updater) =>
      set((state) => {
        state.actionCategoryFilter = resolveUpdater(state.actionCategoryFilter, updater);
      }),
  })),
);

function toAction(row: {
  actionType: string;
  payload?: Record<string, unknown>;
  available: boolean;
}): { actionType: string; payload: Record<string, unknown> } {
  if (row.actionType === "choose_dialogue") {
    const options = (row.payload?.options as Array<{ optionId: string }> | undefined) ?? [];
    return {
      actionType: "choose_dialogue",
      payload: options[0]?.optionId ? { optionId: options[0].optionId } : {},
    };
  }
  if (row.actionType === "evolve_skill") {
    return {
      actionType: "evolve_skill",
      payload: { skillId: String(row.payload?.skillId ?? "") },
    };
  }
  if (row.actionType === "live_stream") {
    return { actionType: "live_stream", payload: { effort: 10 } };
  }
  if (row.actionType === "speak") {
    return { actionType: "speak", payload: { intentText: "Dungeon Explorer run." } };
  }
  return {
    actionType: row.actionType,
    payload: { ...(row.payload ?? {}) },
  };
}

function chooseAction(
  rows: Array<{ actionType: string; payload?: Record<string, unknown>; available: boolean }>,
): { actionType: string; payload: Record<string, unknown> } {
  const legal = rows.filter((row) => row.available);
  if (legal.length === 0) return { actionType: "rest", payload: {} };
  for (const actionType of DEFAULT_PRIORITY) {
    const found = legal.find((row) => row.actionType === actionType);
    if (found) return toAction(found);
  }
  return toAction(legal[0]!);
}

function normalizeRoomExits(
  exits: Partial<Record<string, { depth: number; roomId: string }>>,
): RoomExit[] {
  return Object.entries(exits)
    .filter(([, target]) => Boolean(target))
    .map(([direction, target]) => ({
      direction,
      depth: target!.depth,
      roomId: target!.roomId,
    }));
}

function buildRuntimeFallbackPayload(): PrecomputedDungeonPayload {
  const dungeon = buildDungeonWorld(DEFAULT_GAME_CONFIG);
  const levels = Object.values(dungeon.levels)
    .sort((a, b) => a.depth - b.depth)
    .map((level) => ({
      depth: level.depth,
      rows: level.rows,
      columns: level.columns,
      size: level.size,
      transform: level.transform,
      rooms: Object.values(level.rooms).map((room) => ({
        roomId: room.roomId,
        depth: room.depth,
        row: room.row,
        column: room.column,
        feature: room.feature,
        size: room.size,
        transform: room.transform,
        exits: normalizeRoomExits(room.exits),
        items: room.items.map((item) => ({
          itemId: item.itemId,
          itemBlueprintId: item.itemId,
          name: item.name,
          isPresent: item.isPresent,
          rarity: item.rarity,
          tags: item.tags,
          transform: item.transform ?? undefined,
        })),
      })),
    }));

  const engine = GameEngine.create(DEFAULT_GAME_CONFIG.randomSeed);
  const playthroughSteps: PlaythroughStep[] = [
    { roomId: engine.player.roomId, depth: engine.player.depth, turn: 0 },
  ];
  for (let turn = 0; turn < 75; turn += 1) {
    if (engine.state.escaped || engine.player.health <= 0) break;
    const rows = engine.availableActions(engine.player) as Array<{
      actionType: string;
      payload?: Record<string, unknown>;
      available: boolean;
    }>;
    const action = chooseAction(rows);
    engine.dispatch(action as never);
    playthroughSteps.push({
      roomId: engine.player.roomId,
      depth: engine.player.depth,
      turn: turn + 1,
    });
  }

  return {
    schemaVersion: "dungeon-layout.v1-fallback",
    seed: DEFAULT_GAME_CONFIG.randomSeed,
    dungeon: {
      title: dungeon.title,
      startDepth: dungeon.startDepth,
      startRoomId: dungeon.startRoomId,
      escapeDepth: dungeon.escapeDepth,
      escapeRoomId: dungeon.escapeRoomId,
      size: dungeon.size,
      transform: dungeon.transform,
      levels,
    },
    playthroughSteps,
  };
}

export default function DungeonExplorerPage() {
  const {
    payload,
    selectedDepth,
    selectedRoomId,
    roomTypeFilter,
    visibleDepths,
    showPathOverlay,
    vizMode,
    hoverRoomId,
    playthroughSteps,
    spaceContent,
    actionCategoryFilter,
    setPayload,
    setSelectedDepth,
    setSelectedRoomId,
    setRoomTypeFilter,
    setVisibleDepths,
    setShowPathOverlay,
    setVizMode,
    setHoverRoomId,
    setPlaythroughSteps,
    setSpaceContent,
    setActionCategoryFilter,
  } = useDungeonExplorerStore(
    useShallow((state: DungeonExplorerUiState) => ({
      payload: state.payload,
      selectedDepth: state.selectedDepth,
      selectedRoomId: state.selectedRoomId,
      roomTypeFilter: state.roomTypeFilter,
      visibleDepths: state.visibleDepths,
      showPathOverlay: state.showPathOverlay,
      vizMode: state.vizMode,
      hoverRoomId: state.hoverRoomId,
      playthroughSteps: state.playthroughSteps,
      spaceContent: state.spaceContent,
      actionCategoryFilter: state.actionCategoryFilter,
      setPayload: state.setPayload,
      setSelectedDepth: state.setSelectedDepth,
      setSelectedRoomId: state.setSelectedRoomId,
      setRoomTypeFilter: state.setRoomTypeFilter,
      setVisibleDepths: state.setVisibleDepths,
      setShowPathOverlay: state.setShowPathOverlay,
      setVizMode: state.setVizMode,
      setHoverRoomId: state.setHoverRoomId,
      setPlaythroughSteps: state.setPlaythroughSteps,
      setSpaceContent: state.setSpaceContent,
      setActionCategoryFilter: state.setActionCategoryFilter,
    })),
  );
  const levels = useMemo(
    () => [...(payload?.dungeon.levels ?? [])].sort((a, b) => a.depth - b.depth),
    [payload?.dungeon.levels],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch(PRECOMPUTED_LAYOUT_PATH, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = (await response.json()) as PrecomputedDungeonPayload;
        if (!next?.dungeon?.levels?.length) throw new Error("Invalid precomputed payload");
        if (!mounted) return;
        setPayload(next);
        setPlaythroughSteps(next.playthroughSteps ?? []);
        setSelectedDepth(next.dungeon.startDepth);
        setSelectedRoomId(next.dungeon.startRoomId);
        try {
          sessionStorage.setItem(
            PLAYTHROUGH_CACHE_KEY,
            JSON.stringify(next.playthroughSteps ?? []),
          );
        } catch {
          // ignore cache write errors
        }
      } catch {
        if (!mounted) return;
        const fallback = buildRuntimeFallbackPayload();
        setPayload(fallback);
        setPlaythroughSteps(fallback.playthroughSteps);
        setSelectedDepth(fallback.dungeon.startDepth);
        setSelectedRoomId(fallback.dungeon.startRoomId);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSpaceContent = async () => {
      try {
        const response = await fetch(SPACE_DATA_PATH, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { content?: SpaceContentPoint[] };
        if (!mounted) return;
        setSpaceContent(Array.isArray(body?.content) ? body.content : []);
      } catch {
        if (!mounted) return;
        setSpaceContent([]);
      }
    };
    void loadSpaceContent();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (playthroughSteps.length > 0) return;
    try {
      const cached = sessionStorage.getItem(PLAYTHROUGH_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as PlaythroughStep[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlaythroughSteps(parsed);
          return;
        }
      }
    } catch {
      // ignore cache read errors
    }
  }, [playthroughSteps.length]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void import("react-plotly.js");
    }, PLOTLY_WARMUP_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!payload) return;
    const level = levels.find((entry) => entry.depth === selectedDepth);
    if (!level) return;
    const fallback = level.rooms[0]?.roomId ?? null;
    setSelectedRoomId(fallback ?? payload.dungeon.startRoomId);
  }, [levels, payload, selectedDepth]);
  useEffect(() => {
    setVisibleDepths(levels.map((entry) => entry.depth));
  }, [levels]);

  const level = levels.find((entry) => entry.depth === selectedDepth) ?? levels[0] ?? EMPTY_LEVEL;
  const allRooms = useMemo(() => levels.flatMap((entry) => entry.rooms), [levels]);
  const allRoomsById = useMemo(() => {
    const map = new Map<string, RoomData>();
    levels.forEach((lvl) => {
      Object.values(lvl.rooms).forEach((room) => {
        map.set(room.roomId, room);
      });
    });
    return map;
  }, [levels]);
  const playthroughStepsByRoomDepth = useMemo(() => {
    const map = new Map<string, { index: number; turn: number }>();
    playthroughSteps.forEach((step, idx) => {
      const key = `${step.roomId}|${step.depth}`;
      if (!map.has(key)) {
        map.set(key, { index: idx, turn: step.turn });
      }
    });
    return map;
  }, [playthroughSteps]);
  const pathPositions = useMemo(() => {
    return playthroughSteps
      .map((step) => allRoomsById.get(step.roomId))
      .filter((room): room is RoomData => Boolean(room))
      .map((room) => room.transform.position);
  }, [playthroughSteps, allRoomsById]);
  const levelRooms = useMemo(() => Object.values(level.rooms), [level.rooms]);
  const allRoomTypes = useMemo(() => {
    const set = new Set(allRooms.map((room) => room.feature));
    return [...set].sort();
  }, [allRooms]);
  const roomTypeColors = useMemo(() => {
    const palette = FEATURE_COLOR_TOKENS;
    const map = new Map<string, string>();
    allRoomTypes.forEach((roomType, idx) => {
      map.set(roomType, palette[idx % palette.length]!);
    });
    return map;
  }, [allRoomTypes]);
  const activeRoomTypes = useMemo(
    () => (roomTypeFilter.length === 0 ? new Set(allRoomTypes) : new Set(roomTypeFilter)),
    [allRoomTypes, roomTypeFilter],
  );

  useEffect(() => {
    setRoomTypeFilter(allRoomTypes);
  }, [allRoomTypes]);
  const roomByCell = useMemo(() => {
    const map = new Map<string, RoomData>();
    for (const room of levelRooms) {
      map.set(`${room.row}:${room.column}`, room);
    }
    return map;
  }, [levelRooms]);
  const selectedRoom =
    allRoomsById.get(selectedRoomId) ?? levelRooms[0] ?? null;
  const hoverRoom = (hoverRoomId ? allRoomsById.get(hoverRoomId) : null) ?? null;
  const selectedRoomActions = useMemo((): RuntimeRoomAction[] => {
    if (!selectedRoom) return [];
    try {
      const engine = GameEngine.create(payload?.seed ?? DEFAULT_GAME_CONFIG.randomSeed);
      const player = engine.player;
      player.depth = selectedRoom.depth;
      player.roomId = selectedRoom.roomId;
      player.transform.position = { ...selectedRoom.transform.position };

      return engine.availableActions(player).map((row) => ({
        actionType: row.actionType,
        label: row.label,
        uiScreen: row.uiScreen,
        available: row.available,
        blockedReasons: row.blockedReasons ?? [],
      }));
    } catch {
      return [];
    }
  }, [payload?.seed, selectedRoom]);

  const gridCells = Array.from({ length: level.rows * level.columns }, (_, idx) => {
    const row = Math.floor(idx / level.columns);
    const column = idx % level.columns;
    return { row, column, room: roomByCell.get(`${row}:${column}`) ?? null };
  });

  const roomTypeLabel = (roomType: string) => roomType.replaceAll("_", " ");
  const getRoomTypeColor = (roomType: string) =>
    roomTypeColors.get(roomType) ?? "var(--muted-foreground)";
  const selectedRoomAvailableActions = selectedRoomActions.filter((action) => action.available);
  const actionCategories = useMemo<ActionCategory[]>(
    () =>
      [...new Set(selectedRoomActions.map((action) => categorizeAction(action.actionType)))].sort(
        (a, b) => ACTION_CATEGORY_LABELS[a].localeCompare(ACTION_CATEGORY_LABELS[b]),
      ),
    [selectedRoomActions],
  );
  const activeActionCategories = useMemo(
    () =>
      actionCategoryFilter.length === 0 ? new Set(actionCategories) : new Set(actionCategoryFilter),
    [actionCategories, actionCategoryFilter],
  );
  const filteredSelectedRoomActions = useMemo(
    () =>
      selectedRoomAvailableActions.filter((action) =>
        activeActionCategories.has(categorizeAction(action.actionType)),
      ),
    [selectedRoomAvailableActions, activeActionCategories],
  );
  useEffect(() => {
    setActionCategoryFilter(actionCategories);
  }, [actionCategories]);
  const selectedRoomContent = selectedRoom
    ? spaceContent
        .filter((point) =>
          (ROOM_TYPE_TO_CONTENT_BRANCHES[selectedRoom.feature] ?? []).includes(point.branch),
        )
        .slice(0, 10)
    : [];
  const getXrayBackground = (color: string) =>
    `color-mix(in oklab, ${color} 18%, transparent)`;
  const getOutlineShadow = (color: string) =>
    `inset 0 0 0 1px color-mix(in oklab, ${color} 72%, var(--background))`;
  const getOutlineColor = (color: string) =>
    `color-mix(in oklab, ${color} 75%, var(--background) 25%)`;
  const activeVisibleDepths = useMemo(
    () => new Set(visibleDepths),
    [visibleDepths],
  );
  const roomsFor3d = useMemo(
    () =>
      allRooms.filter(
        (room) => activeRoomTypes.has(room.feature) && activeVisibleDepths.has(room.depth),
      ),
    [allRooms, activeRoomTypes, activeVisibleDepths],
  );
  const getExitDirections = (room: RoomData): string[] =>
    Object.entries(room.exits)
      .filter(([, target]) => Boolean(target))
      .map(([direction]) => direction);
  const formatVec3 = (value: { x: number; y: number; z: number }) =>
    `${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)}`;
  const categoryStyle = (category: ActionCategory) => ({
    borderColor: `color-mix(in oklab, ${ACTION_CATEGORY_COLORS[category]} 68%, var(--border))`,
    color: `color-mix(in oklab, ${ACTION_CATEGORY_COLORS[category]} 88%, white 12%)`,
    backgroundColor: `color-mix(in oklab, ${ACTION_CATEGORY_COLORS[category]} 14%, transparent)`,
  });

  const PlotlyComponent = useMemo(
    () =>
      dynamic(
        () =>
          import("react-plotly.js").then((mod) => {
            const Plot = mod.default;
            return function Plotly3D({
              rooms,
              colors,
              selectedId,
              onSelect,
              pathPoints,
              showPathOverlay,
            }: {
              rooms: RoomData[];
              colors: Map<string, string>;
              selectedId: string | null;
              onSelect: (room: RoomData) => void;
              pathPoints: { x: number; y: number; z: number }[];
              showPathOverlay: boolean;
            }) {
              const fillColors = rooms.map(
                (room) => colors.get(room.feature) ?? "var(--muted-foreground)",
              );
              const outlineColors = fillColors.map((color) => getOutlineColor(color));
              const traceRooms = {
                x: rooms.map((room) => room.transform.position.x),
                y: rooms.map((room) => room.transform.position.y),
                z: rooms.map((room) => room.transform.position.z),
                text: rooms.map(
                  (room) =>
                    `<b>${roomTypeLabel(room.feature)}</b><br>${room.roomId}<br>(${room.row}, ${room.column})`,
                ),
                mode: "markers" as const,
                type: "scatter3d" as const,
                marker: {
                  size: rooms.map((room) => (room.roomId === selectedId ? 12 : 8)),
                  color: fillColors,
                  opacity: rooms.map((room) => (room.roomId === selectedId ? 1 : 0.65)),
                  line: {
                    width: rooms.map((room) => (room.roomId === selectedId ? 3 : 1.2)),
                    color: outlineColors,
                  },
                },
                hovertemplate: "%{text}<extra></extra>",
                hoverinfo: "text" as const,
              };
              const traceOutlines = {
                x: rooms.map((room) => room.transform.position.x),
                y: rooms.map((room) => room.transform.position.y),
                z: rooms.map((room) => room.transform.position.z),
                mode: "markers" as const,
                type: "scatter3d" as const,
                marker: {
                  size: rooms.map(() => 20),
                  color: "transparent",
                  opacity: 1,
                  line: {
                    width: 1,
                    color: outlineColors,
                  },
                },
                hoverinfo: "skip" as const,
              };
              const tracePath = {
                x: pathPoints.map((point) => point.x),
                y: pathPoints.map((point) => point.y),
                z: pathPoints.map((point) => point.z),
                mode: "lines+markers" as const,
                type: "scatter3d" as const,
                line: { color: "var(--primary)", width: 2 },
                marker: {
                  size: 4,
                  color: "var(--primary)",
                  opacity: 0.9,
                },
                hoverinfo: "skip" as const,
              };
              const data =
                showPathOverlay && pathPoints.length > 1 && pathPoints.every((p) => p)
                  ? [tracePath, traceOutlines, traceRooms]
                  : [traceOutlines, traceRooms];
              return (
                <Plot
                  data={data}
                  layout={{
                    margin: { l: 0, r: 0, t: 24, b: 0 },
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "rgba(0,0,0,0.1)",
                    scene: {
                      xaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      yaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      zaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                      dragmode: "orbit",
                      hovermode: "closest",
                    },
                    showlegend: false,
                  }}
                  config={{
                    responsive: true,
                    scrollZoom: true,
                    displayModeBar: true,
                    modeBarButtonsToAdd: ["hoverclosest", "hovercompare"],
                  }}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler
                  onClick={(event: { points?: Array<{ pointIndex?: number; curveNumber?: number }> }) => {
                    const point = event.points?.[0];
                    if (!point || point.curveNumber === 0) return;
                    const idx = point.pointIndex;
                    if (typeof idx === "number" && rooms[idx]) {
                      onSelect(rooms[idx]);
                    }
                  }}
                  onHover={(event: { points?: Array<{ pointIndex?: number; curveNumber?: number }> }) => {
                    const point = event.points?.[0];
                    if (!point || point.curveNumber === 0) return;
                    const idx = point.pointIndex;
                    if (typeof idx === "number" && rooms[idx]) {
                      setHoverRoomId(rooms[idx].roomId);
                    }
                  }}
                  onUnhover={() => setHoverRoomId(null)}
                />
              );
            };
          }),
        {
          ssr: false,
          loading: () => (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Loading 3D view...
            </div>
          ),
        },
      ),
    [],
  );

  if (!payload) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded border border-border bg-card/60">
        <p className="text-sm text-muted-foreground">Loading precomputed dungeon layout...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Dungeon Explorer</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Spatial layout is now attached to rooms, levels, and entities. This view renders a single
          level grid using room transforms.
        </CardContent>
      </Card>
      <Card className="bg-card/60">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Level Layout</CardTitle>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVizMode("2d")}
                className={`rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  vizMode === "2d"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/30"
                }`}
              >
                2D
              </button>
              <button
                type="button"
                onClick={() => setVizMode("3d")}
                className={`rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  vizMode === "3d"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/30"
                }`}
              >
                3D
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div>
              {level.rows}x{level.columns} rooms, origin ({level.transform.position.x},{" "}
              {level.transform.position.y}, {level.transform.position.z})
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Level</span>
              <select
                value={selectedDepth}
                onChange={(event) => setSelectedDepth(Number(event.target.value))}
                className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"
              >
                {levels.map((entry) => (
                  <option key={entry.depth} value={entry.depth}>
                    Depth {entry.depth}
                  </option>
                ))}
              </select>
              {vizMode === "3d" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]">
                      Visible Depths ({visibleDepths.length}/{levels.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>3D Level Visibility</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {levels
                      .slice()
                      .sort((a, b) => b.depth - a.depth)
                      .map((entry) => (
                        <DropdownMenuCheckboxItem
                          key={entry.depth}
                          checked={activeVisibleDepths.has(entry.depth)}
                          onCheckedChange={(checked) => {
                            setVisibleDepths((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(entry.depth);
                              else next.delete(entry.depth);
                              return levels
                                .map((levelEntry) => levelEntry.depth)
                                .filter((depth) => next.has(depth));
                            });
                          }}
                        >
                          Depth {entry.depth}
                        </DropdownMenuCheckboxItem>
                      ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={visibleDepths.length === levels.length}
                      onCheckedChange={() => setVisibleDepths(levels.map((entry) => entry.depth))}
                    >
                      Select All
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleDepths.length === 0}
                      onCheckedChange={() => setVisibleDepths([])}
                    >
                      Clear All
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
          <div className="rounded border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              Room Type Filters
              <button
                type="button"
                onClick={() => setRoomTypeFilter(allRoomTypes)}
                className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setRoomTypeFilter([])}
                className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowPathOverlay((prev) => !prev)}
                className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {showPathOverlay ? "Hide Path" : "Show Path"}
              </button>
            </div>
            <div className="mt-2 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
              {allRoomTypes.map((roomType) => {
                const isActive = activeRoomTypes.has(roomType);
                const color = roomTypeColors.get(roomType) ?? "var(--muted-foreground)";
                return (
                  <label key={roomType} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setRoomTypeFilter((prev) => {
                          const next = new Set(prev.length === 0 ? allRoomTypes : prev);
                          if (checked) {
                            next.add(roomType);
                          } else {
                            next.delete(roomType);
                          }
                          return [...next];
                        });
                      }}
                      className="accent-primary"
                    />
                    <span
                      className="inline-flex size-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span>{roomTypeLabel(roomType)}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {vizMode === "2d" ? (
              <div className="space-y-2">
                <div className="rounded border border-border bg-background/40 px-2 py-1 text-[11px] text-muted-foreground">
                  Hover preview:{" "}
                  {hoverRoom ? (
                    <span className="text-foreground">
                      {roomTypeLabel(hoverRoom.feature)} - {hoverRoom.roomId} - exits{" "}
                      {getExitDirections(hoverRoom).length} - items {hoverRoom.items.length}
                    </span>
                  ) : (
                    "none"
                  )}
                </div>
                <div
                  className="grid gap-1 rounded border border-border bg-background/40 p-2"
                  style={{ gridTemplateColumns: `repeat(${level.columns}, minmax(0, 1fr))` }}
                >
                  {gridCells.map((cell) => {
                    if (!cell.room) {
                      return (
                        <div
                          key={`${cell.row}-${cell.column}`}
                          className="h-14 rounded border border-border/40 bg-background/30"
                        />
                      );
                    }
                    const isSelected = cell.room.roomId === selectedRoom?.roomId;
                    const isActive = activeRoomTypes.has(cell.room.feature);
                    const color = getRoomTypeColor(cell.room.feature);
                    const metaKey = `${cell.room.roomId}|${level.depth}`;
                    const pathMeta = playthroughStepsByRoomDepth.get(metaKey);
                    const isOnPath = showPathOverlay && Boolean(pathMeta);
                    return (
                      <button
                        key={cell.room.roomId}
                        type="button"
                        onClick={() => setSelectedRoomId(cell.room!.roomId)}
                        onMouseEnter={() => setHoverRoomId(cell.room!.roomId)}
                        onMouseLeave={() => setHoverRoomId(null)}
                        className={`flex h-14 items-center justify-center rounded border px-1 text-[10px] transition ${
                          isSelected
                            ? "border-primary text-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        } ${isActive ? "" : "opacity-25"} ${isOnPath ? "ring-1 ring-primary/40" : ""}`}
                        title={`${cell.room.roomId} (${roomTypeLabel(cell.room.feature)}) @ ${cell.room.transform.position.x},${cell.room.transform.position.y},${cell.room.transform.position.z}`}
                        style={{
                          backgroundColor: isActive ? getXrayBackground(color) : "transparent",
                          boxShadow: isOnPath ? getOutlineShadow("var(--primary)") : undefined,
                        }}
                      >
                        <span className="relative">
                          {roomTypeLabel(cell.room.feature)}
                          {isOnPath ? (
                            <span className="absolute -right-4 -top-2 rounded-full bg-primary/20 px-1 py-0.5 text-[8px] text-primary">
                              {pathMeta?.turn}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded border border-border bg-background/40 px-2 py-1 text-[11px] text-muted-foreground">
                  Hover preview:{" "}
                  {hoverRoom ? (
                    <span className="text-foreground">
                      {roomTypeLabel(hoverRoom.feature)} - {hoverRoom.roomId} - exits{" "}
                      {getExitDirections(hoverRoom).length} - items {hoverRoom.items.length}
                    </span>
                  ) : (
                    "none"
                  )}
                </div>
                <div className="h-[420px] rounded border border-border bg-background/40 p-2">
                  {roomsFor3d.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No visible rooms. Select one or more depths.
                    </div>
                  ) : (
                    <PlotlyComponent
                      rooms={roomsFor3d}
                      colors={roomTypeColors}
                      selectedId={selectedRoom?.roomId ?? null}
                      onSelect={(room) => {
                        setSelectedDepth(room.depth);
                        setSelectedRoomId(room.roomId);
                      }}
                      pathPoints={showPathOverlay ? pathPositions : []}
                      showPathOverlay={showPathOverlay}
                    />
                  )}
                </div>
              </div>
            )}
            <div className="space-y-3 rounded border border-border bg-muted/20 p-3 text-xs">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Selected Room
              </div>
              {selectedRoom ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{selectedRoom.roomId}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Type: {roomTypeLabel(selectedRoom.feature)}
                      </div>
                    </div>
                    <span
                      className="rounded border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground"
                      style={{ borderColor: getRoomTypeColor(selectedRoom.feature) }}
                    >
                      {roomTypeLabel(selectedRoom.feature)}
                    </span>
                  </div>
                  <div className="space-y-2 rounded border border-border bg-background/40 p-2 text-[10px] text-muted-foreground">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Transform
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Pos</div>
                      <div className="grid grid-cols-3 gap-1">
                        <Input disabled value={selectedRoom.transform.position.x.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.transform.position.y.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.transform.position.z.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rot</div>
                      <div className="grid grid-cols-3 gap-1">
                        <Input disabled value={selectedRoom.transform.rotation.x.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.transform.rotation.y.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.transform.rotation.z.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Scale</div>
                      <div className="grid grid-cols-3 gap-1">
                        <Input disabled value={selectedRoom.transform.scale.x.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.transform.scale.y.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.transform.scale.z.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Size</div>
                      <div className="grid grid-cols-3 gap-1">
                        <Input disabled value={selectedRoom.size.x.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.size.y.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.size.z.toFixed(2)} className="h-6 text-[10px] disabled:opacity-100" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Grid</div>
                      <div className="grid grid-cols-3 gap-1">
                        <Input disabled value={selectedRoom.column.toString()} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.row.toString()} className="h-6 text-[10px] disabled:opacity-100" />
                        <Input disabled value={selectedRoom.depth.toString()} className="h-6 text-[10px] disabled:opacity-100" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Available Actions
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]">
                            Filter Types ({activeActionCategories.size}/{actionCategories.length})
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel>Action Categories</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {actionCategories.map((category) => {
                            const checked = activeActionCategories.has(category);
                            return (
                              <DropdownMenuCheckboxItem
                                key={category}
                                checked={checked}
                                onCheckedChange={(value) => {
                                  setActionCategoryFilter((prev) => {
                                    const next = new Set(prev.length === 0 ? actionCategories : prev);
                                    if (value) next.add(category);
                                    else next.delete(category);
                                    return [...next];
                                  });
                                }}
                              >
                                <span className="mr-2 font-mono text-[10px]">{ACTION_CATEGORY_ICONS[category]}</span>
                                {ACTION_CATEGORY_LABELS[category]}
                              </DropdownMenuCheckboxItem>
                            );
                          })}
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem
                            checked={activeActionCategories.size === actionCategories.length}
                            onCheckedChange={() => setActionCategoryFilter(actionCategories)}
                          >
                            Select All
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={activeActionCategories.size === 0}
                            onCheckedChange={() => setActionCategoryFilter([])}
                          >
                            Clear All
                          </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="flex flex-wrap gap-1">
                        {actionCategories.map((category) =>
                          activeActionCategories.has(category) ? (
                            <Badge
                              key={category}
                              variant="outline"
                              className="gap-1 border px-1.5 py-0 text-[10px] font-normal"
                              style={categoryStyle(category)}
                            >
                              <span className="font-mono">{ACTION_CATEGORY_ICONS[category]}</span>
                              {ACTION_CATEGORY_LABELS[category]}
                            </Badge>
                          ) : null,
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {filteredSelectedRoomActions.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">
                          No available actions for selected categories.
                        </span>
                      ) : (
                        filteredSelectedRoomActions.map((action) => {
                          const category = categorizeAction(action.actionType);
                          return (
                          <span
                            key={`${action.actionType}:${action.label}`}
                            className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px]"
                            title={
                              action.uiScreen
                                ? `${ACTION_CATEGORY_LABELS[category]} - Screen: ${action.uiScreen}`
                                : ACTION_CATEGORY_LABELS[category]
                            }
                            style={categoryStyle(category)}
                          >
                            <span className="font-mono">{ACTION_CATEGORY_ICONS[category]}</span>
                            {action.label}
                          </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Room Content (Space-Aligned)
                    </div>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      {selectedRoomContent.length === 0
                        ? "No linked space content for this room type."
                        : selectedRoomContent.map((entry) => (
                            <div key={entry.id} className="rounded border border-border/60 bg-background/40 px-2 py-1">
                              <span className="text-foreground">{entry.name}</span>{" "}
                              <span className="text-muted-foreground">({entry.type})</span>{" "}
                              <span className="text-[10px] uppercase text-muted-foreground">[{entry.branch}]</span>
                            </div>
                          ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Placed Items
                    </div>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      {selectedRoom.items.length === 0
                        ? "No items"
                        : selectedRoom.items.map((item) => (
                            <div key={item.itemId} className="rounded border border-border/60 bg-background/40 px-2 py-1">
                              <span className="text-foreground">{item.name}</span>{" "}
                              {item.rarity ? (
                                <span className="text-[10px] uppercase text-muted-foreground">({item.rarity})</span>
                              ) : null}
                              {item.transform?.position ? (
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  pos: [{formatVec3(item.transform.position)}]
                                </div>
                              ) : null}
                            </div>
                          ))}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Exits: {getExitDirections(selectedRoom).join(", ") || "none"}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-muted-foreground">No room selected.</div>
              )}
            </div>
          </div>
          <div className="rounded border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            Rooms have size {level.size.x}x{level.size.y}x{level.size.z}. Position is stored
            per-room, plus per-item and per-entity transforms.
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/60">
        <CardHeader>
          <CardTitle className="text-base">Editor roadmap</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>1. Level selector and room lattice editor view</p>
          <p>2. 3D x-ray + surface visualization with room selection</p>
          <p>3. Room type filter and action/content inspection</p>
          <p>4. Configuration compare: baseline vs candidate dungeon</p>
          <p>5. Constraint checks: redundancy, dead-ends, pressure balance</p>
        </CardContent>
      </Card>
    </div>
  );
}
