import {
  ACTION_TYPE,
  type ActionItem,
  type PlayUiAction,
} from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import {
  formatActionButtonLabel,
  itemsByActionType,
  sortActionItems,
} from "./action-renderer";
import { buildEquippedEntries } from "./equipped-content";
import { buildJournalEntries } from "./journal-content";
import {
  logKaplayDebug,
  logKaplayDebugError,
  recordKaplayDebug,
  setKaplayDebugBoardSnapshot,
} from "./kaplay-debug";
import { PANEL_INSET } from "./layout-constants";
import {
  buildFloorRoomVisuals,
  type Direction,
  type FloorRoomVisual,
  floorRoomVisualCacheKey,
} from "./navigation-floor-model";
import {
  currentRoom,
  discoveredRoomIndices,
  exitRows,
  globalNavigationActionItems,
  preparedSpellSlots,
  pressureWarningLines,
  roomActionItems,
  roomDialogueActionItems,
  roomNarrativeLines,
  spellPoolRows,
} from "./navigation-helpers";
import {
  consumePendingNavigationOverlay,
  consumePendingSpellbookContext,
  createNavigationOverlayState,
  NAVIGATION_MENU_ENTRIES,
  type NavigationMenuEntry,
  type NavigationOverlayKind,
  renderNavigationOverlay,
} from "./navigation-overlay";
import { isRoomFocusFeature } from "./navigation-room-focus";
import {
  type NavigationCenterViewMode,
  renderCenterViewTabs,
  renderRoomFocusScene,
} from "./navigation-room-focus-scene";
import {
  rebuildBoardDecorationNodes as rebuildNavigationBoardDecorationNodes,
  updateBoardDecorations as updateNavigationBoardDecorations,
} from "./navigation-scene-board";
import {
  FLOOR_TILE_H,
  FLOOR_TILE_W,
  FRAME_H,
  FRAME_W,
  FRAME_Y,
  INFO_PANEL_GAP,
  INFO_PANEL_H,
  NAV_BOARD_BASE_TAG,
  NAV_BOARD_DECOR_TAG,
  NAV_CENTER_VIEW_TAG,
  NAV_COLUMN_GAP,
  NAV_HEADER_TAG,
  NAV_OVERLAY_INSET,
  NAV_OVERLAY_TAG,
  NAV_RIGHT_W,
  NAV_ROOMFIND_TAG,
  SHELL_INNER_PADDING,
  TOP_PANEL_Y,
  VISIBLE_GLOBAL_ACTION_LIMIT,
  VISIBLE_ROOM_ACTION_LIMIT,
} from "./navigation-scene-constants";
import {
  buildNavigationRoomInfoLines,
  buildRoomPresenceByRoomId,
  computeShellLayout,
  directionFallbackOrder,
  filterNavigationRoomActions,
  previewRoomTilePosition,
  roomStateLabel,
  roomTitleFromLook,
} from "./navigation-scene-helpers";
import {
  isTalkAction,
  renderActionsPanel,
  renderGameplayFeedPanel,
  renderRoomFindPanel,
} from "./navigation-scene-panels";
import { renderFloorMapBase } from "./navigation-scene-rendering";
import {
  destroySelectionOverlayNodes,
  ensureSelectionOverlayNodes,
  hideSelectionOverlay as moveSelectionOverlayOffscreen,
} from "./navigation-scene-selection";
import {
  renderNavigationHeaderLayer,
  renderNavigationStaticShell,
} from "./navigation-scene-shell";
import type {
  ActionPanelTextNodes,
  OverlayRenderContext,
  PersistentButtonSlot,
  PlayerDecorationNodes,
  PositionableNode,
  RoomDecorationNodes,
  RoomPresenceSummary,
  SelectionOverlayNodes,
} from "./navigation-scene-types";
import { resolveRoomTileIconId } from "./navigation-visual-language";
import { hasEncounter, inRuneForgeContext } from "./scene-blocks";
import type { SceneCallbacks } from "./scene-contracts";
import { clearUi, clearUiTag, PAD } from "./shared";
import { buildStatsEntries } from "./stats-content";
import { resolveRoomSceneTheme } from "./theme-tokens";

/** Matches engine copy from `performInventoryAction` when loot/crystals were taken — not "but finds nothing new". */

export function registerNavigationScene(
  k: KAPLAYCtx,
  cb: SceneCallbacks
): void {
  let lastVisitedRoomId: string | null = null;
  let roomOverlayText: string | null = null;

  k.scene("gridNavigation", () => {
    let selectedExitIndex = 0;
    let hoveredRoomId: string | null = null;
    let centerViewMode: NavigationCenterViewMode = "map";
    let renderQueued = false;
    let overlayRenderQueued = false;
    const overlayState = createNavigationOverlayState();
    const pendingOverlay = consumePendingNavigationOverlay();
    if (pendingOverlay) {
      overlayState.activeOverlay = pendingOverlay;
    }
    const pendingSpellbook = consumePendingSpellbookContext();
    if (pendingSpellbook) {
      overlayState.spellbookAllowCodex = pendingSpellbook.allowCodex;
      if (pendingSpellbook.tab) {
        overlayState.spellbookTab = pendingSpellbook.tab;
      }
    }
    let lastFloorRooms: FloorRoomVisual[] = [];
    let lastFloorRoomCacheKey = "";
    let lastActiveRoomId = "";
    let lastBoardOrigin: { x: number; y: number } | null = null;
    let lastCenterViewport: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null = null;
    let lastHeaderFrame: { x: number; y: number; width: number } | null = null;
    let lastOverlayContext: OverlayRenderContext | null = null;
    let lastExitRows: ReturnType<typeof exitRows> = [];
    let lastGlobalActions: ActionItem[] = [];
    let lastRoomActions: ActionItem[] = [];
    let staticShellRendered = false;
    let lastBoardRenderKey = "";
    let lastBoardStructureKey = "";
    let lastActionRenderKey = "";
    let lastRoomInfoRenderKey = "";
    let lastRoomFindRenderKey: string | null = null;
    let lastShellThemeId = "";
    let selectionOverlayNodes: SelectionOverlayNodes | null = null;
    let roomDecorationNodes = new Map<string, RoomDecorationNodes>();
    let playerDecorationNodes: PlayerDecorationNodes | null = null;
    let actionPanelTextNodes: ActionPanelTextNodes | null = null;
    let globalActionSlots: PersistentButtonSlot[] = [];
    let lastRoomTheme = resolveRoomSceneTheme(null);
    const invalidateDynamicRenderCaches = () => {
      lastFloorRooms = [];
      lastFloorRoomCacheKey = "";
      lastActiveRoomId = "";
      lastBoardOrigin = null;
      lastCenterViewport = null;
      lastOverlayContext = null;
      lastExitRows = [];
      lastGlobalActions = [];
      lastRoomActions = [];
      lastBoardRenderKey = "";
      lastBoardStructureKey = "";
      lastActionRenderKey = "";
      lastRoomInfoRenderKey = "";
      lastRoomFindRenderKey = null;
      selectionOverlayNodes = null;
      roomDecorationNodes = new Map<string, RoomDecorationNodes>();
      playerDecorationNodes = null;
      actionPanelTextNodes = null;
      globalActionSlots = [];
    };
    const clearSelectionOverlay = () => {
      selectionOverlayNodes = destroySelectionOverlayNodes(
        selectionOverlayNodes
      );
    };
    const getSelectionOverlay = () => {
      selectionOverlayNodes = ensureSelectionOverlayNodes(
        k,
        selectionOverlayNodes
      );
      return selectionOverlayNodes;
    };
    const rebuildBoardDecorationNodes = (
      centerPanelX: number,
      centerPanelY: number,
      floorRooms: FloorRoomVisual[],
      roomPresenceByRoomId: ReadonlyMap<string, RoomPresenceSummary>
    ) => {
      clearUiTag(k, NAV_BOARD_DECOR_TAG);
      const nextState = rebuildNavigationBoardDecorationNodes(k, {
        centerPanelX,
        centerPanelY,
        floorRooms,
        hoveredRoomId,
        onHoverRoom: (roomId) => {
          hoveredRoomId = roomId;
          scheduleRender();
        },
        onSelectRoom: (roomId) => {
          const exitIndex = lastExitRows.findIndex(
            (exit) => exit.roomId === roomId
          );
          if (exitIndex >= 0 && exitIndex !== selectedExitIndex) {
            selectedExitIndex = exitIndex;
            renderDynamicSelection();
          }
        },
        roomPresenceByRoomId,
      });
      roomDecorationNodes = nextState.roomDecorationNodes;
      playerDecorationNodes = nextState.playerDecorationNodes;
    };
    const updateBoardDecorations = (
      centerPanelX: number,
      centerPanelY: number,
      floorRooms: FloorRoomVisual[],
      activeRoomId: string,
      roomPresenceByRoomId: ReadonlyMap<string, RoomPresenceSummary>
    ) => {
      updateNavigationBoardDecorations(k, {
        activeRoomId,
        centerPanelX,
        centerPanelY,
        decorationState: {
          playerDecorationNodes,
          roomDecorationNodes,
        },
        floorRooms,
        roomPresenceByRoomId,
      });
    };
    const hideSelectionOverlay = () => {
      const overlay = getSelectionOverlay();
      moveSelectionOverlayOffscreen(k, overlay);
    };
    const scheduleRender = () => {
      if (renderQueued) {
        return;
      }
      renderQueued = true;
      queueMicrotask(() => {
        renderQueued = false;
        render();
      });
    };
    const scheduleOverlayRefresh = (includeHeader = false) => {
      if (overlayRenderQueued) {
        return;
      }
      overlayRenderQueued = true;
      queueMicrotask(() => {
        overlayRenderQueued = false;
        if (includeHeader) {
          renderHeaderLayer();
        }
        renderOverlayLayer();
      });
    };

    const renderHeaderLayer = () => {
      if (!lastHeaderFrame) {
        return;
      }
      clearUiTag(k, NAV_HEADER_TAG);
      renderNavigationHeaderLayer(k, {
        activeMenu: overlayState.activeOverlay === "menu_hub",
        frame: lastHeaderFrame,
        onOpenMenu: () => openCommandMenu(),
        statusText: cb.getTurnState().pendingLabel,
        theme: lastRoomTheme,
      });
    };

    const turnPending = () => cb.getTurnState().pending;

    const renderStaticShell = () => {
      if (!lastHeaderFrame) {
        return;
      }
      renderNavigationStaticShell(k, {
        frame: lastHeaderFrame,
        theme: lastRoomTheme,
      });
    };

    const renderOverlayLayer = () => {
      clearUiTag(k, NAV_OVERLAY_TAG);
      if (!(overlayState.activeOverlay && lastOverlayContext)) {
        return;
      }
      const { sceneState, snapshot, viewport, preparedSlots, spellPool } =
        lastOverlayContext;
      try {
        renderNavigationOverlay({
          k,
          overlayState,
          sceneState,
          snapshot,
          x: viewport.x,
          y: viewport.y,
          width: viewport.width,
          height: viewport.height,
          preparedSlots,
          spellPool,
          onPrepareSpellSlot: (slotIndex, skillId) => {
            cb.prepareSpellSlot(slotIndex, skillId);
          },
          onRender: () => scheduleOverlayRefresh(false),
          onClose: () => closeOverlay(),
          onOpenNavigationMenuEntry: (entry) => {
            activateNavigationMenuEntry(entry);
          },
          onDoAction: (item) => {
            if (turnPending()) {
              return;
            }
            logKaplayDebug("nav", "overlay-action", {
              overlay: overlayState.activeOverlay,
              label: formatActionButtonLabel(item),
            });
            if (
              item.action.kind === "player" &&
              item.action.playerAction.actionType === ACTION_TYPE.TALK
            ) {
              openTalk(item);
              return;
            }
            cb.doAction(item.action);
            if (
              overlayState.activeOverlay === "dialogue" &&
              dialogueActionItems().length === 0
            ) {
              closeOverlay();
            }
            scheduleRender();
          },
          globalActions: lastGlobalActions,
          roomActions: lastRoomActions,
          tag: NAV_OVERLAY_TAG,
        });
      } catch (error) {
        logKaplayDebugError("nav", "overlay-render-failed", error, {
          overlay: overlayState.activeOverlay,
        });
        overlayState.activeOverlay = null;
        clearUiTag(k, NAV_OVERLAY_TAG);
      }
    };

    const renderBoardLayer = (
      centerPanelX: number,
      centerPanelY: number,
      centerPanelW: number,
      centerPanelH: number,
      floorRooms: FloorRoomVisual[],
      activeRoomId: string,
      roomPresenceByRoomId: ReadonlyMap<string, RoomPresenceSummary>,
      structureKey: string,
      boardKey: string
    ) => {
      if (structureKey !== lastBoardStructureKey) {
        clearSelectionOverlay();
        clearUiTag(k, NAV_BOARD_BASE_TAG);
        renderFloorMapBase(k, {
          x: centerPanelX,
          y: centerPanelY,
          width: centerPanelW,
          height: centerPanelH,
          rooms: floorRooms,
          tag: NAV_BOARD_BASE_TAG,
        });
        rebuildBoardDecorationNodes(
          centerPanelX,
          centerPanelY,
          floorRooms,
          roomPresenceByRoomId
        );
        lastBoardStructureKey = structureKey;
        lastBoardRenderKey = "";
      }
      if (boardKey === lastBoardRenderKey) {
        return;
      }
      updateBoardDecorations(
        centerPanelX,
        centerPanelY,
        floorRooms,
        activeRoomId,
        roomPresenceByRoomId
      );
      lastBoardRenderKey = boardKey;
    };

    const renderActionsLayer = (
      x: number,
      y: number,
      width: number,
      selectedExit: {
        direction: Direction;
        feature: string;
        roomId: string;
      } | null,
      globalActions: ActionItem[],
      actionKey: string,
      hasMoreGlobalActions: boolean
    ) => {
      const nextState = renderActionsPanel(
        k,
        {
          actionPanelTextNodes,
          globalActionSlots,
          lastActionRenderKey,
        },
        {
          actionKey,
          globalActions,
          hasMoreGlobalActions,
          onAction: (item) => {
            if (turnPending()) {
              return;
            }
            cb.doAction(item.action);
            scheduleRender();
          },
          onConfirmMove: confirmSelectedMove,
          onOpenMore: openGlobalActionsOverlay,
          selectedExit,
          width,
          x,
          y,
        }
      );
      actionPanelTextNodes = nextState.actionPanelTextNodes;
      globalActionSlots = nextState.globalActionSlots;
      lastActionRenderKey = nextState.lastActionRenderKey;
    };

    const renderRoomInfoLayer = (
      x: number,
      y: number,
      width: number,
      feedLines: string[],
      roomInfoKey: string
    ) => {
      if (roomInfoKey === lastRoomInfoRenderKey) {
        return;
      }
      lastRoomInfoRenderKey = renderGameplayFeedPanel(k, {
        feedLines,
        roomInfoKey,
        width,
        x,
        y,
      });
    };

    const renderRoomFindLayer = (
      centerPanelX: number,
      centerPanelY: number,
      centerPanelW: number,
      roomFindText: string | null
    ) => {
      clearUiTag(k, NAV_ROOMFIND_TAG);
      lastRoomFindRenderKey = renderRoomFindPanel(k, {
        centerPanelW,
        centerPanelX,
        centerPanelY,
        lastRoomFindRenderKey,
        roomFindText,
      });
    };

    const openOverlay = (kind: NavigationOverlayKind | null) => {
      logKaplayDebug("nav", "overlay-toggle", {
        from: overlayState.activeOverlay ?? "navigation",
        to: kind ?? "navigation",
      });
      overlayState.activeOverlay = kind;
      scheduleOverlayRefresh(true);
    };
    const closeOverlay = () => {
      if (!overlayState.activeOverlay) {
        return;
      }
      openOverlay(null);
    };
    const openSpellbookOverlay = () => {
      overlayState.spellbookAllowCodex = false;
      if (overlayState.spellbookTab === "codex") {
        overlayState.spellbookTab = "pool";
      }
      openOverlay("spellbook");
    };
    const openRuneForgeCodexOverlay = () => {
      if (!inRuneForgeContext(cb.getState())) {
        return;
      }
      overlayState.spellbookAllowCodex = true;
      overlayState.spellbookTab = "codex";
      overlayState.spellbookPageIndex = 0;
      overlayState.spellbookSelectedEntryId = null;
      openOverlay("spellbook");
    };
    const openCommandMenu = () => {
      if (!overlayState.menuHubSelectedEntryId) {
        overlayState.menuHubSelectedEntryId =
          NAVIGATION_MENU_ENTRIES[0]?.id ?? null;
      }
      openOverlay("menu_hub");
    };
    const activateNavigationMenuEntry = (entry: NavigationMenuEntry) => {
      if (entry.targetScene === "gridWorldMap") {
        k.go("gridWorldMap");
        return;
      }
      if (entry.targetOverlay === "spellbook") {
        openSpellbookOverlay();
        return;
      }
      openOverlay(entry.targetOverlay);
    };
    const moveNavigationMenuSelection = (step: -1 | 1) => {
      const entryCount = NAVIGATION_MENU_ENTRIES.length;
      if (entryCount === 0) {
        return;
      }
      const currentIndex = Math.max(
        0,
        NAVIGATION_MENU_ENTRIES.findIndex((entry) => {
          return entry.id === overlayState.menuHubSelectedEntryId;
        })
      );
      const nextIndex = Math.max(
        0,
        Math.min(entryCount - 1, currentIndex + step)
      );
      overlayState.menuHubSelectedEntryId =
        NAVIGATION_MENU_ENTRIES[nextIndex]?.id ?? null;
      scheduleOverlayRefresh(false);
    };
    const activateSelectedNavigationMenuEntry = () => {
      const selectedEntry =
        NAVIGATION_MENU_ENTRIES.find((entry) => {
          return entry.id === overlayState.menuHubSelectedEntryId;
        }) ??
        NAVIGATION_MENU_ENTRIES[0] ??
        null;
      if (!selectedEntry) {
        return;
      }
      activateNavigationMenuEntry(selectedEntry);
    };
    const openGlobalActionsOverlay = () => {
      openOverlay("global_actions");
    };
    const openRoomActionsOverlay = () => {
      openOverlay("room_actions");
    };
    const setCenterView = (mode: NavigationCenterViewMode) => {
      if (centerViewMode === mode) {
        return;
      }
      centerViewMode = mode;
      scheduleRender();
    };
    const triggerRoomAction = (item: ActionItem) => {
      if (turnPending()) {
        return;
      }
      if (isTalkAction(item)) {
        openTalk(item);
        return;
      }
      cb.doAction(item.action);
      scheduleRender();
    };
    const activateVisibleRoomAction = (index: number) => {
      const item = lastRoomActions[index] ?? null;
      if (!item) {
        if (index === 4) {
          openRoomActionsOverlay();
        }
        return;
      }
      triggerRoomAction(item);
    };
    const dialogueActionItems = () => {
      return itemsByActionType(cb.getState(), "choose_dialogue");
    };
    const movePagedSelection = (
      entries: { id: string }[],
      _pageIndex: number,
      selectedEntryId: string | null,
      pageSize: number,
      delta: number
    ): { pageIndex: number; selectedEntryId: string | null } => {
      if (entries.length === 0) {
        return { pageIndex: 0, selectedEntryId: null };
      }
      const currentIndex = Math.max(
        0,
        entries.findIndex((entry) => entry.id === selectedEntryId)
      );
      const nextIndex = Math.max(
        0,
        Math.min(entries.length - 1, currentIndex + delta)
      );
      return {
        pageIndex: Math.floor(nextIndex / pageSize),
        selectedEntryId: entries[nextIndex]?.id ?? null,
      };
    };
    const shiftPagedSelectionPage = (
      entries: { id: string }[],
      pageIndex: number,
      selectedEntryId: string | null,
      pageSize: number,
      deltaPage: number
    ): { pageIndex: number; selectedEntryId: string | null } => {
      if (entries.length === 0) {
        return { pageIndex: 0, selectedEntryId: null };
      }
      const currentIndex = Math.max(
        0,
        entries.findIndex((entry) => entry.id === selectedEntryId)
      );
      const currentOffset = currentIndex % pageSize;
      const maxPageIndex = Math.max(
        0,
        Math.ceil(entries.length / pageSize) - 1
      );
      const nextPageIndex = Math.max(
        0,
        Math.min(maxPageIndex, pageIndex + deltaPage)
      );
      const nextIndex = Math.min(
        entries.length - 1,
        nextPageIndex * pageSize + currentOffset
      );
      return {
        pageIndex: nextPageIndex,
        selectedEntryId: entries[nextIndex]?.id ?? null,
      };
    };
    const moveOverlaySelection = (delta: number) => {
      switch (overlayState.activeOverlay) {
        case "menu_hub":
          moveNavigationMenuSelection(delta < 0 ? -1 : 1);
          return;
        case "journal": {
          const currentState = cb.getState();
          const entries = buildJournalEntries(
            overlayState.journalTab,
            currentState.snapshot
          );
          const next = movePagedSelection(
            entries,
            overlayState.journalPageIndex,
            overlayState.journalSelectedEntryId,
            5,
            delta
          );
          overlayState.journalPageIndex = next.pageIndex;
          overlayState.journalSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "stats": {
          const currentState = cb.getState();
          const entries = buildStatsEntries(
            currentState.snapshot,
            currentState.status as Record<string, unknown>
          );
          const next = movePagedSelection(
            entries,
            overlayState.statsPageIndex,
            overlayState.statsSelectedEntryId,
            5,
            delta
          );
          overlayState.statsPageIndex = next.pageIndex;
          overlayState.statsSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "equipped": {
          const currentState = cb.getState();
          const entries = buildEquippedEntries(
            currentState.snapshot,
            currentState.status as Record<string, unknown>
          );
          const next = movePagedSelection(
            entries,
            overlayState.equippedPageIndex,
            overlayState.equippedSelectedEntryId,
            5,
            delta
          );
          overlayState.equippedPageIndex = next.pageIndex;
          overlayState.equippedSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "global_actions": {
          const entries = lastGlobalActions.map((item, index) => ({
            id: `${item.label}-${String(index)}`,
          }));
          const next = movePagedSelection(
            entries,
            overlayState.globalActionsPageIndex,
            overlayState.globalActionsSelectedEntryId,
            5,
            delta
          );
          overlayState.globalActionsPageIndex = next.pageIndex;
          overlayState.globalActionsSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "room_actions": {
          const entries = lastRoomActions.map((item, index) => ({
            id: `${item.label}-${String(index)}`,
          }));
          const next = movePagedSelection(
            entries,
            overlayState.roomActionsPageIndex,
            overlayState.roomActionsSelectedEntryId,
            5,
            delta
          );
          overlayState.roomActionsPageIndex = next.pageIndex;
          overlayState.roomActionsSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "dialogue": {
          const entries = dialogueActionItems().map((item, index) => ({
            id: `${item.label}-${String(index)}`,
          }));
          const next = movePagedSelection(
            entries,
            overlayState.dialoguePageIndex,
            overlayState.dialogueSelectedEntryId,
            5,
            delta
          );
          overlayState.dialoguePageIndex = next.pageIndex;
          overlayState.dialogueSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        default:
          return;
      }
    };
    const pageOverlaySelection = (deltaPage: number) => {
      switch (overlayState.activeOverlay) {
        case "journal": {
          const currentState = cb.getState();
          const entries = buildJournalEntries(
            overlayState.journalTab,
            currentState.snapshot
          );
          const next = shiftPagedSelectionPage(
            entries,
            overlayState.journalPageIndex,
            overlayState.journalSelectedEntryId,
            5,
            deltaPage
          );
          overlayState.journalPageIndex = next.pageIndex;
          overlayState.journalSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "stats": {
          const currentState = cb.getState();
          const entries = buildStatsEntries(
            currentState.snapshot,
            currentState.status as Record<string, unknown>
          );
          const next = shiftPagedSelectionPage(
            entries,
            overlayState.statsPageIndex,
            overlayState.statsSelectedEntryId,
            5,
            deltaPage
          );
          overlayState.statsPageIndex = next.pageIndex;
          overlayState.statsSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "equipped": {
          const currentState = cb.getState();
          const entries = buildEquippedEntries(
            currentState.snapshot,
            currentState.status as Record<string, unknown>
          );
          const next = shiftPagedSelectionPage(
            entries,
            overlayState.equippedPageIndex,
            overlayState.equippedSelectedEntryId,
            5,
            deltaPage
          );
          overlayState.equippedPageIndex = next.pageIndex;
          overlayState.equippedSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "global_actions": {
          const entries = lastGlobalActions.map((item, index) => ({
            id: `${item.label}-${String(index)}`,
          }));
          const next = shiftPagedSelectionPage(
            entries,
            overlayState.globalActionsPageIndex,
            overlayState.globalActionsSelectedEntryId,
            5,
            deltaPage
          );
          overlayState.globalActionsPageIndex = next.pageIndex;
          overlayState.globalActionsSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "room_actions": {
          const entries = lastRoomActions.map((item, index) => ({
            id: `${item.label}-${String(index)}`,
          }));
          const next = shiftPagedSelectionPage(
            entries,
            overlayState.roomActionsPageIndex,
            overlayState.roomActionsSelectedEntryId,
            5,
            deltaPage
          );
          overlayState.roomActionsPageIndex = next.pageIndex;
          overlayState.roomActionsSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        case "dialogue": {
          const entries = dialogueActionItems().map((item, index) => ({
            id: `${item.label}-${String(index)}`,
          }));
          const next = shiftPagedSelectionPage(
            entries,
            overlayState.dialoguePageIndex,
            overlayState.dialogueSelectedEntryId,
            5,
            deltaPage
          );
          overlayState.dialoguePageIndex = next.pageIndex;
          overlayState.dialogueSelectedEntryId = next.selectedEntryId;
          scheduleOverlayRefresh(false);
          return;
        }
        default:
          return;
      }
    };
    const activateOverlaySelection = () => {
      switch (overlayState.activeOverlay) {
        case "menu_hub":
          activateSelectedNavigationMenuEntry();
          return;
        case "global_actions": {
          const selectedItem =
            lastGlobalActions.find((item, index) => {
              return (
                `${item.label}-${String(index)}` ===
                overlayState.globalActionsSelectedEntryId
              );
            }) ??
            lastGlobalActions[0] ??
            null;
          if (!selectedItem) {
            return;
          }
          cb.doAction(selectedItem.action);
          scheduleRender();
          return;
        }
        case "room_actions": {
          const selectedItem =
            lastRoomActions.find((item, index) => {
              return (
                `${item.label}-${String(index)}` ===
                overlayState.roomActionsSelectedEntryId
              );
            }) ??
            lastRoomActions[0] ??
            null;
          if (!selectedItem) {
            return;
          }
          if (
            selectedItem.action.kind === "player" &&
            selectedItem.action.playerAction.actionType === ACTION_TYPE.TALK
          ) {
            openTalk(selectedItem);
            return;
          }
          cb.doAction(selectedItem.action);
          scheduleRender();
          return;
        }
        case "dialogue": {
          const selectedItem =
            dialogueActionItems().find((item, index) => {
              return (
                `${item.label}-${String(index)}` ===
                overlayState.dialogueSelectedEntryId
              );
            }) ??
            dialogueActionItems()[0] ??
            null;
          if (!selectedItem) {
            return;
          }
          if (turnPending()) {
            return;
          }
          cb.doAction(selectedItem.action);
          if (dialogueActionItems().length === 0) {
            closeOverlay();
          }
          scheduleRender();
          return;
        }
        default:
          return;
      }
    };

    const renderDynamicSelection = () => {
      const startedAt = performance.now();
      if (lastFloorRooms.length === 0) {
        return;
      }
      const selectedExit =
        lastExitRows[selectedExitIndex] ?? lastExitRows[0] ?? null;
      const previewRoomId = hoveredRoomId ?? selectedExit?.roomId ?? null;
      const position = previewRoomTilePosition(
        lastFloorRooms,
        previewRoomId,
        lastActiveRoomId,
        lastBoardOrigin?.x ?? 0,
        lastBoardOrigin?.y ?? 0
      );
      if (position) {
        const overlay = getSelectionOverlay();
        (overlay.halo as PositionableNode).pos = k.vec2(
          position.x - 3,
          position.y - 3
        );
        (overlay.fill as PositionableNode).pos = k.vec2(position.x, position.y);
        (overlay.stripe as PositionableNode).pos = k.vec2(
          position.x + 6,
          position.y + 5
        );
        (overlay.border as PositionableNode).pos = k.vec2(
          position.x - 2,
          position.y - 2
        );
        overlay.label.text = hoveredRoomId ? "VIEW" : "MOVE";
        overlay.label.pos = k.vec2(
          position.x + FLOOR_TILE_W / 2,
          position.y + FLOOR_TILE_H / 2
        );
      } else {
        hideSelectionOverlay();
      }
      const durationMs =
        Math.round((performance.now() - startedAt) * 100) / 100;
      if (durationMs >= 8) {
        recordKaplayDebug("nav", "selection-redraw", {
          durationMs,
          selectedRoomId: previewRoomId,
        });
      }
    };

    const movePlayer = (direction: Direction) => {
      if (turnPending()) {
        return;
      }
      const action: PlayUiAction = {
        kind: "player",
        playerAction: { actionType: "move", payload: { direction } },
      };
      cb.doAction(action);
      const nextState = cb.getState();
      if (hasEncounter(nextState)) {
        k.go("gridCombat");
        return;
      }
      roomOverlayText = null;
    };

    const selectExitDirection = (direction: Direction) => {
      hoveredRoomId = null;
      const priorities = directionFallbackOrder(direction);
      const fallbackIndex = priorities
        .map((candidate) => {
          return lastExitRows.findIndex((exit) => exit.direction === candidate);
        })
        .find((candidateIndex) => candidateIndex >= 0);
      if (fallbackIndex === undefined || fallbackIndex < 0) {
        return;
      }
      if (fallbackIndex === selectedExitIndex) {
        return;
      }
      selectedExitIndex = fallbackIndex;
      renderDynamicSelection();
    };

    const confirmSelectedMove = () => {
      if (turnPending()) {
        return;
      }
      const selectedExit =
        lastExitRows[selectedExitIndex] ?? lastExitRows[0] ?? null;
      if (!selectedExit) {
        return;
      }
      logKaplayDebug("nav", "move-confirm", {
        direction: selectedExit.direction,
        roomId: selectedExit.roomId,
        feature: selectedExit.feature,
      });
      movePlayer(selectedExit.direction);
    };

    const openTalk = (item: ActionItem) => {
      if (turnPending()) {
        return;
      }
      cb.doAction(item.action);
      overlayState.dialoguePageIndex = 0;
      overlayState.dialogueSelectedEntryId = null;
      openOverlay("dialogue");
    };

    const render = () => {
      const startedAt = performance.now();
      const state = cb.getState();
      const depth = Number(state.status.depth ?? 0);
      const snapshot = state.snapshot;
      const worldSnapshot = snapshot;
      const level = worldSnapshot.dungeon.levels[depth];
      const room = currentRoom(state);
      const exits = exitRows(state);
      lastExitRows = exits;
      const bossRoomIds = new Set<string>();
      if (level?.exitRoomId) {
        bossRoomIds.add(level.exitRoomId);
      }
      const globalActions = globalNavigationActionItems(state).filter(
        (item) => {
          return item.available;
        }
      );
      const discovered = discoveredRoomIndices(state);
      const roomPresenceByRoomId = buildRoomPresenceByRoomId(
        worldSnapshot.entities,
        depth
      );
      const hostileCountsByRoomId = new Map<string, number>();
      const dungeoneerCountsByRoomId = new Map<string, number>();
      const hostileRoomIds = new Set<string>();
      const dungeoneerRoomIds = new Set<string>();
      for (const [roomId, presence] of roomPresenceByRoomId) {
        if (presence.hostileCount > 0) {
          hostileRoomIds.add(roomId);
          hostileCountsByRoomId.set(roomId, presence.hostileCount);
        }
        if (presence.dungeoneerCount > 0) {
          dungeoneerRoomIds.add(roomId);
          dungeoneerCountsByRoomId.set(roomId, presence.dungeoneerCount);
        }
      }
      const roomActions = roomActionItems(state);
      const dialogueRoomActions = roomDialogueActionItems(state);
      const roomFeature = String(state.status.roomFeature ?? room.feature);
      const activeRoomId = String(state.status.roomId ?? room.roomId);
      const roomTheme = resolveRoomSceneTheme(roomFeature);
      lastRoomTheme = roomTheme;
      const canShowRoomView = isRoomFocusFeature(roomFeature);
      const activeRoomActions = sortActionItems([
        ...filterNavigationRoomActions(roomFeature, roomActions),
        ...(canShowRoomView ? dialogueRoomActions : []),
      ]).filter((item, index, items) => {
        return (
          items.findIndex((candidate) => {
            return (
              candidate.label === item.label &&
              JSON.stringify(candidate.action) === JSON.stringify(item.action)
            );
          }) === index
        );
      });
      lastGlobalActions = globalActions;
      lastRoomActions = activeRoomActions;
      const visibleGlobalActions = globalActions.slice(
        0,
        VISIBLE_GLOBAL_ACTION_LIMIT
      );
      const hasMoreGlobalActions =
        globalActions.length > VISIBLE_GLOBAL_ACTION_LIMIT;
      const visibleRoomActionsSlice = activeRoomActions.slice(
        0,
        VISIBLE_ROOM_ACTION_LIMIT
      );
      const hasMoreRoomActions =
        activeRoomActions.length > VISIBLE_ROOM_ACTION_LIMIT;
      const roomTitle = roomTitleFromLook(
        state.look,
        String(state.status.roomId ?? room.roomId)
      );
      const roomChanged = activeRoomId !== lastVisitedRoomId;
      if (roomChanged) {
        hoveredRoomId = null;
        roomOverlayText = null;
        selectedExitIndex = 0;
        centerViewMode = canShowRoomView ? "room" : "map";
      }
      const roomFocusActive = canShowRoomView && centerViewMode === "room";
      if (selectedExitIndex >= exits.length) {
        selectedExitIndex = 0;
      }
      const selectedExit = exits[selectedExitIndex] ?? exits[0] ?? null;
      const frameX = PAD;
      const frameY = FRAME_Y;
      const frameW = FRAME_W;
      const frameH = FRAME_H;
      lastHeaderFrame = { x: frameX, y: frameY, width: frameW };
      if (!staticShellRendered || lastShellThemeId !== roomTheme.id) {
        clearUi(k);
        invalidateDynamicRenderCaches();
        k.setBackground(
          roomTheme.background[0],
          roomTheme.background[1],
          roomTheme.background[2]
        );
        renderStaticShell();
        renderHeaderLayer();
        staticShellRendered = true;
        lastShellThemeId = roomTheme.id;
      }

      const shellHeight = frameH - (TOP_PANEL_Y - frameY) - 10;

      const shell = computeShellLayout(
        frameX + 10,
        TOP_PANEL_Y,
        frameW - 20,
        0,
        NAV_RIGHT_W,
        PANEL_INSET,
        NAV_COLUMN_GAP
      );

      const centerPanelX = shell.centerX;
      const centerPanelY = shell.innerY + SHELL_INNER_PADDING;
      const centerPanelW = shell.centerWidth;
      const shellInnerHeight = shellHeight - PANEL_INSET * 2;
      const integratedPanelW = shell.centerWidth + NAV_COLUMN_GAP + NAV_RIGHT_W;
      const centerPanelH =
        shellInnerHeight -
        INFO_PANEL_H -
        INFO_PANEL_GAP -
        SHELL_INNER_PADDING * 2;
      const roomInfoPanelW = integratedPanelW - NAV_RIGHT_W - NAV_COLUMN_GAP;
      const infoPanelY = centerPanelY + centerPanelH + INFO_PANEL_GAP;
      const actionPanelX = shell.centerX + roomInfoPanelW + NAV_COLUMN_GAP;
      lastOverlayContext = {
        sceneState: state,
        snapshot,
        viewport: {
          x: frameX + NAV_OVERLAY_INSET,
          y: frameY + NAV_OVERLAY_INSET,
          width: frameW - NAV_OVERLAY_INSET * 2,
          height: frameH - NAV_OVERLAY_INSET * 2,
        },
        preparedSlots: preparedSpellSlots(state),
        spellPool: spellPoolRows(state),
      };
      if (overlayState.activeOverlay) {
        hideSelectionOverlay();
        renderOverlayLayer();
        lastVisitedRoomId = activeRoomId;
        const durationMs =
          Math.round((performance.now() - startedAt) * 100) / 100;
        if (durationMs >= 16) {
          recordKaplayDebug("nav", "render", {
            durationMs,
            overlay: overlayState.activeOverlay,
            roomId: activeRoomId,
          });
        }
        return;
      }
      const exitRoomIds = new Set(
        exits.map((exit) => {
          return exit.roomId;
        })
      );
      const nextFloorRoomCacheKey = level
        ? floorRoomVisualCacheKey({
            rooms: Object.values(level.rooms),
            activeRoomId,
            selectedRoomId: selectedExit?.roomId ?? null,
            exitRoomIds,
            bossRoomIds,
            discoveredIndices: discovered,
            hostileRoomIds,
            hostileCountsByRoomId,
            dungeoneerRoomIds,
            dungeoneerCountsByRoomId,
          })
        : "";
      const nextFloorRoomStructureKey = level
        ? JSON.stringify(
            Object.values(level.rooms)
              .map((levelRoom) => {
                return {
                  roomId: levelRoom.roomId,
                  row: levelRoom.row,
                  column: levelRoom.column,
                  feature: levelRoom.feature,
                  isBossRoom: bossRoomIds.has(levelRoom.roomId),
                };
              })
              .sort((left, right) => {
                if (left.row !== right.row) {
                  return left.row - right.row;
                }
                if (left.column !== right.column) {
                  return left.column - right.column;
                }
                return left.roomId.localeCompare(right.roomId);
              })
          )
        : "";
      let floorRooms: FloorRoomVisual[] = [];
      if (level) {
        if (nextFloorRoomCacheKey === lastFloorRoomCacheKey) {
          floorRooms = lastFloorRooms;
        } else {
          floorRooms = buildFloorRoomVisuals({
            rooms: Object.values(level.rooms),
            activeRoomId,
            selectedRoomId: selectedExit?.roomId ?? null,
            exitRoomIds,
            bossRoomIds,
            discoveredIndices: discovered,
            hostileRoomIds,
            hostileCountsByRoomId,
            dungeoneerRoomIds,
            dungeoneerCountsByRoomId,
          });
        }
      }
      const previewRoomId = roomFocusActive
        ? activeRoomId
        : (hoveredRoomId ?? selectedExit?.roomId ?? activeRoomId);
      const previewRoom = level?.rooms[previewRoomId] ?? room;
      const previewFloorRoom =
        floorRooms.find((floorRoom) => {
          return floorRoom.roomId === previewRoomId;
        }) ??
        floorRooms.find((floorRoom) => {
          return floorRoom.roomId === activeRoomId;
        }) ??
        null;
      const previewPresence = roomPresenceByRoomId.get(previewRoomId);
      const previewRoomFeature =
        previewFloorRoom?.feature ?? String(previewRoom.feature);
      const previewRoomTitle =
        previewRoomId === activeRoomId
          ? roomTitle
          : roomTitleFromLook(previewRoom.description, previewRoom.roomId);
      let previewRoomStateText = "preview";
      if (previewFloorRoom) {
        previewRoomStateText = roomStateLabel(previewFloorRoom);
      } else if (previewRoomId === activeRoomId) {
        previewRoomStateText = "current";
      }
      const previewRoomInfoLines = buildNavigationRoomInfoLines({
        roomDescription: previewRoom.description,
        roomTitle: previewRoomTitle,
        roomFeature: previewRoomFeature,
        narrativeLines:
          previewRoomId === activeRoomId ? roomNarrativeLines(state) : [],
        pressureLines:
          previewRoomId === activeRoomId ? pressureWarningLines(state) : [],
        roomId: previewRoom.roomId,
        depth,
        roomStateLabel: previewRoomStateText,
        hostileCount: previewPresence?.hostileCount ?? 0,
        hostileName: previewPresence?.hostileName ?? null,
        bossCount: previewPresence?.bossCount ?? 0,
        bossName: previewPresence?.bossName ?? null,
        dungeoneerCount: previewPresence?.dungeoneerCount ?? 0,
        dungeoneerName: previewPresence?.dungeoneerName ?? null,
      });
      const previewVisibleRoomActions =
        previewRoomId === activeRoomId ? visibleRoomActionsSlice : [];
      lastFloorRoomCacheKey = nextFloorRoomCacheKey;
      lastFloorRooms = floorRooms;
      lastActiveRoomId = activeRoomId;
      lastBoardOrigin = { x: centerPanelX, y: centerPanelY };
      lastCenterViewport = {
        x: centerPanelX,
        y: centerPanelY,
        width: centerPanelW,
        height: centerPanelH,
      };

      setKaplayDebugBoardSnapshot({
        activeRoomFeature: roomFeature,
        activeRoomId,
        pendingTurn: cb.getTurnState().pending,
        themeId: roomTheme.id,
        rooms: floorRooms.map((floorRoom) => {
          const presence = roomPresenceByRoomId.get(floorRoom.roomId);
          const presenceVisible =
            floorRoom.isCurrent ||
            floorRoom.isDiscovered ||
            floorRoom.isBossRoom;
          const tileIconVisible =
            floorRoom.isCurrent ||
            floorRoom.isDiscovered ||
            floorRoom.isBossRoom ||
            floorRoom.isExitTarget;
          return {
            roomId: floorRoom.roomId,
            feature: floorRoom.feature,
            tileIconId: resolveRoomTileIconId({
              feature: floorRoom.feature,
              isBossRoom: floorRoom.isBossRoom,
              isExitTarget: floorRoom.isExitTarget,
            }),
            tileIconVisible,
            isBossRoom: floorRoom.isBossRoom,
            isCurrent: floorRoom.isCurrent,
            isDiscovered: floorRoom.isDiscovered,
            isSelected: floorRoom.isSelected,
            hasHostile: floorRoom.hasHostile,
            hostileCount: floorRoom.hostileCount,
            bossCount: presence?.bossCount ?? 0,
            hasDungeoneer: floorRoom.hasDungeoneer,
            dungeoneerCount: floorRoom.dungeoneerCount,
            presenceVisible,
          };
        }),
      });

      const boardKey = `${nextFloorRoomCacheKey}|${activeRoomId}`;
      clearUiTag(k, NAV_CENTER_VIEW_TAG);
      renderCenterViewTabs(k, {
        canShowRoomView,
        onSelectView: (view) => setCenterView(view),
        viewMode: centerViewMode,
        x: centerPanelX,
        y: centerPanelY,
      });
      if (roomFocusActive) {
        clearUiTag(k, NAV_BOARD_BASE_TAG);
        clearUiTag(k, NAV_BOARD_DECOR_TAG);
        hideSelectionOverlay();
        renderRoomFocusScene(k, {
          feature: roomFeature,
          hasMoreRoomActions,
          height: centerPanelH,
          onAction: (item) => triggerRoomAction(item),
          onOpenMore: () => openRoomActionsOverlay(),
          roomActions: activeRoomActions,
          roomInfoLines: previewRoomInfoLines,
          roomPresence: previewPresence ?? null,
          roomTitle,
          width: centerPanelW,
          x: centerPanelX,
          y: centerPanelY,
        });
      } else {
        renderBoardLayer(
          centerPanelX,
          centerPanelY,
          centerPanelW,
          centerPanelH,
          floorRooms,
          activeRoomId,
          roomPresenceByRoomId,
          nextFloorRoomStructureKey,
          boardKey
        );
        renderDynamicSelection();
      }

      const actionKey = `${JSON.stringify(
        visibleGlobalActions.map((item) => ({
          label: formatActionButtonLabel(item),
          available: item.available,
        }))
      )}|move:${selectedExit?.direction ?? "none"}|more:${String(hasMoreGlobalActions)}`;
      renderActionsLayer(
        actionPanelX,
        infoPanelY,
        NAV_RIGHT_W,
        selectedExit,
        visibleGlobalActions,
        actionKey,
        hasMoreGlobalActions
      );
      const roomInfoKey = `${JSON.stringify(
        cb.feedLines.slice(-10)
      )}|focus:${String(roomFocusActive)}|preview:${previewRoomId}`;
      renderRoomInfoLayer(
        shell.centerX,
        infoPanelY,
        roomInfoPanelW,
        cb.feedLines,
        roomInfoKey
      );
      renderRoomFindLayer(
        centerPanelX,
        centerPanelY,
        centerPanelW,
        overlayState.activeOverlay ? null : roomOverlayText
      );
      renderOverlayLayer();
      lastVisitedRoomId = activeRoomId;
      const durationMs =
        Math.round((performance.now() - startedAt) * 100) / 100;
      if (durationMs >= 16) {
        recordKaplayDebug("nav", "render", {
          durationMs,
          overlay: overlayState.activeOverlay ?? "navigation",
          roomId: activeRoomId,
        });
      }
    };

    const moveKeys: Record<string, Direction> = {
      w: "north",
      a: "west",
      s: "south",
      d: "east",
      up: "north",
      left: "west",
      down: "south",
      right: "east",
    };

    for (const [key, direction] of Object.entries(moveKeys)) {
      k.onKeyPress(key as "w", () => {
        if (overlayState.activeOverlay === "menu_hub") {
          moveNavigationMenuSelection(
            direction === "north" || direction === "west" ? -1 : 1
          );
          return;
        }
        if (overlayState.activeOverlay) {
          if (direction === "north") {
            moveOverlaySelection(-1);
            return;
          }
          if (direction === "south") {
            moveOverlaySelection(1);
            return;
          }
          if (direction === "west") {
            pageOverlaySelection(-1);
            return;
          }
          if (direction === "east") {
            pageOverlaySelection(1);
            return;
          }
          return;
        }
        selectExitDirection(direction);
      });
    }
    const roomActionKeys = {
      "1": 0,
      "2": 1,
      "3": 2,
      "4": 3,
      "0": 4,
    } as const;
    for (const [key, actionIndex] of Object.entries(roomActionKeys)) {
      k.onKeyPress(key as "1", () => {
        if (overlayState.activeOverlay) {
          return;
        }
        const state = cb.getState();
        const feature = String(
          state.status.roomFeature ?? currentRoom(state).feature
        );
        if (!(isRoomFocusFeature(feature) && centerViewMode === "room")) {
          return;
        }
        activateVisibleRoomAction(actionIndex);
      });
    }
    k.onKeyPress("enter", () => {
      if (overlayState.activeOverlay) {
        activateOverlaySelection();
        return;
      }
      confirmSelectedMove();
    });
    k.onKeyPress("space", () => {
      if (overlayState.activeOverlay) {
        activateOverlaySelection();
        return;
      }
      confirmSelectedMove();
    });
    k.onKeyPress("tab", () => {
      openCommandMenu();
    });
    k.onButtonPress("start", () => {
      openCommandMenu();
    });
    k.onGamepadButtonPress(["dpad-up", "dpad-left"], (button) => {
      if (overlayState.activeOverlay) {
        if (button === "dpad-up") {
          moveOverlaySelection(-1);
        } else {
          pageOverlaySelection(-1);
        }
        return;
      }
      selectExitDirection(button === "dpad-up" ? "north" : "west");
    });
    k.onGamepadButtonPress(["dpad-down", "dpad-right"], (button) => {
      if (overlayState.activeOverlay) {
        if (button === "dpad-down") {
          moveOverlaySelection(1);
        } else {
          pageOverlaySelection(1);
        }
        return;
      }
      selectExitDirection(button === "dpad-down" ? "south" : "east");
    });
    k.onGamepadButtonPress("south", () => {
      if (overlayState.activeOverlay) {
        activateOverlaySelection();
        return;
      }
      confirmSelectedMove();
    });
    k.onGamepadButtonPress("east", () => {
      if (overlayState.activeOverlay) {
        closeOverlay();
      }
    });

    k.onKeyPress("v", () => {
      if (overlayState.activeOverlay) {
        return;
      }
      const whistleAction = lastGlobalActions.find((item) => {
        return (
          item.action.kind === "player" &&
          item.available &&
          item.action.playerAction.actionType === "whistle"
        );
      });
      if (whistleAction) {
        cb.doAction(whistleAction.action);
        scheduleRender();
      }
    });
    k.onKeyPress("escape", () => {
      if (overlayState.activeOverlay) {
        closeOverlay();
      }
    });
    k.onKeyPress("m", () => {
      if (overlayState.activeOverlay) {
        openOverlay(null);
        return;
      }
      const state = cb.getState();
      const feature = String(
        state.status.roomFeature ?? currentRoom(state).feature
      );
      if (isRoomFocusFeature(feature)) {
        setCenterView("map");
        return;
      }
      openOverlay(null);
    });
    k.onKeyPress("o", () => k.go("gridWorldMap"));
    k.onKeyPress("b", () => openOverlay("bag"));
    k.onKeyPress("j", () => openOverlay("journal"));
    k.onKeyPress("p", () => openSpellbookOverlay());
    k.onKeyPress("q", () => openOverlay("equipped"));
    k.onKeyPress("f", () => {
      if (hasEncounter(cb.getState())) {
        k.go("gridCombat");
      }
    });
    k.onKeyPress("t", () => {
      const state = cb.getState();
      const talkAction = roomActionItems(state).find((item) => {
        return (
          item.action.kind === "player" &&
          item.available &&
          item.action.playerAction.actionType === ACTION_TYPE.TALK
        );
      });
      if (dialogueActionItems().length > 0) {
        overlayState.dialoguePageIndex = 0;
        overlayState.dialogueSelectedEntryId = null;
        openOverlay("dialogue");
        return;
      }
      if (talkAction) {
        openTalk(talkAction);
      }
    });
    k.onKeyPress("r", () => {
      if (overlayState.activeOverlay) {
        return;
      }
      const state = cb.getState();
      const feature = String(
        state.status.roomFeature ?? currentRoom(state).feature
      );
      if (isRoomFocusFeature(feature)) {
        setCenterView("room");
      }
    });
    k.onKeyPress("x", () => {
      if (overlayState.activeOverlay) {
        return;
      }
      const streamAction = lastGlobalActions.find((item) => {
        return (
          item.action.kind === "player" &&
          item.available &&
          item.action.playerAction.actionType === "live_stream"
        );
      });
      if (streamAction) {
        cb.doAction(streamAction.action);
        scheduleRender();
      }
    });

    cb.setRefresh(render);
    render();
  });
}
