"use client";

import {
  ChevronUpIcon,
  FlaskConicalIcon,
  Settings2Icon,
  WrenchIcon,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type DevToolbarCorner,
  useDevToolsStore,
} from "@/components/app-content/dev-tools-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const MARGIN = 16;
const FALLBACK_EXPANDED_WIDTH = 280;
const FALLBACK_EXPANDED_HEIGHT = 280;
const FALLBACK_COLLAPSED_WIDTH = 116;
const FALLBACK_COLLAPSED_HEIGHT = 36;

interface Point {
  x: number;
  y: number;
}

function getCornerPosition(
  corner: DevToolbarCorner,
  width: number,
  height: number
): Point {
  const rightX = Math.max(MARGIN, window.innerWidth - width - MARGIN);
  const bottomY = Math.max(MARGIN, window.innerHeight - height - MARGIN);
  switch (corner) {
    case "top-left":
      return { x: MARGIN, y: MARGIN };
    case "top-right":
      return { x: rightX, y: MARGIN };
    case "bottom-left":
      return { x: MARGIN, y: bottomY };
    case "bottom-right":
      return { x: rightX, y: bottomY };
    default:
      return { x: rightX, y: bottomY };
  }
}

function clampToViewport(
  x: number,
  y: number,
  width: number,
  height: number
): Point {
  return {
    x: Math.min(
      Math.max(MARGIN, x),
      Math.max(MARGIN, window.innerWidth - width - MARGIN)
    ),
    y: Math.min(
      Math.max(MARGIN, y),
      Math.max(MARGIN, window.innerHeight - height - MARGIN)
    ),
  };
}

function getNearestCorner(
  x: number,
  y: number,
  width: number,
  height: number
): DevToolbarCorner {
  const corners: DevToolbarCorner[] = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ];
  let bestCorner = corners[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const corner of corners) {
    const target = getCornerPosition(corner, width, height);
    const distance = Math.hypot(target.x - x, target.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCorner = corner;
    }
  }
  return bestCorner;
}

export function DevToolsToolbar() {
  const isDevelopment = process.env.NODE_ENV === "development";

  const testModeEnabled = useDevToolsStore((state) => state.testModeEnabled);
  const testModeBundleSource = useDevToolsStore(
    (state) => state.testModeBundleSource
  );
  const showUiIds = useDevToolsStore((state) => state.showUiIds);
  const codexAutoConnect = useDevToolsStore((state) => state.codexAutoConnect);
  const planningApiMockMode = useDevToolsStore(
    (state) => state.planningApiMockMode
  );
  const toolbarCollapsed = useDevToolsStore((state) => state.toolbarCollapsed);
  const toolbarCorner = useDevToolsStore((state) => state.toolbarCorner);
  const setTestModeEnabled = useDevToolsStore(
    (state) => state.setTestModeEnabled
  );
  const setTestModeBundleSource = useDevToolsStore(
    (state) => state.setTestModeBundleSource
  );
  const setShowUiIds = useDevToolsStore((state) => state.setShowUiIds);
  const setCodexAutoConnect = useDevToolsStore(
    (state) => state.setCodexAutoConnect
  );
  const setPlanningApiMockMode = useDevToolsStore(
    (state) => state.setPlanningApiMockMode
  );
  const setToolbarCollapsed = useDevToolsStore(
    (state) => state.setToolbarCollapsed
  );
  const setToolbarCorner = useDevToolsStore((state) => state.setToolbarCorner);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    origin: Point;
    pointerStart: Point;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);

  const getDimensions = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      return { width: rect.width, height: rect.height };
    }
    return {
      width: toolbarCollapsed
        ? FALLBACK_COLLAPSED_WIDTH
        : FALLBACK_EXPANDED_WIDTH,
      height: toolbarCollapsed
        ? FALLBACK_COLLAPSED_HEIGHT
        : FALLBACK_EXPANDED_HEIGHT,
    };
  }, [toolbarCollapsed]);

  const onDragStart = (event: ReactPointerEvent) => {
    event.preventDefault();
    const { width, height } = getDimensions();
    const base = position ?? getCornerPosition(toolbarCorner, width, height);
    dragRef.current = {
      pointerId: event.pointerId,
      origin: base,
      pointerStart: { x: event.clientX, y: event.clientY },
    };
    setPosition(base);
    setDragging(true);
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
        return;
      }
      const { width, height } = getDimensions();
      const dx = event.clientX - dragRef.current.pointerStart.x;
      const dy = event.clientY - dragRef.current.pointerStart.y;
      setPosition(
        clampToViewport(
          dragRef.current.origin.x + dx,
          dragRef.current.origin.y + dy,
          width,
          height
        )
      );
    };
    const onUp = (event: PointerEvent) => {
      if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
        return;
      }
      const { width, height } = getDimensions();
      const dx = event.clientX - dragRef.current.pointerStart.x;
      const dy = event.clientY - dragRef.current.pointerStart.y;
      const dropped = clampToViewport(
        dragRef.current.origin.x + dx,
        dragRef.current.origin.y + dy,
        width,
        height
      );
      const corner = getNearestCorner(dropped.x, dropped.y, width, height);
      setToolbarCorner(corner);
      setPosition(getCornerPosition(corner, width, height));
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [getDimensions, setToolbarCorner]);

  useEffect(() => {
    document.documentElement.dataset.devShowUiIds = showUiIds
      ? "true"
      : "false";
    return () => {
      delete document.documentElement.dataset.devShowUiIds;
    };
  }, [showUiIds]);

  useEffect(() => {
    if (dragging) {
      return;
    }
    const next = getCornerPosition(
      toolbarCorner,
      getDimensions().width,
      getDimensions().height
    );
    setPosition(next);
  }, [dragging, getDimensions, toolbarCorner]);

  useEffect(() => {
    const onResize = () => {
      if (dragging) {
        return;
      }
      const next = getCornerPosition(
        toolbarCorner,
        getDimensions().width,
        getDimensions().height
      );
      setPosition(next);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dragging, getDimensions, toolbarCorner]);

  const style = {
    left: `${(position ?? { x: MARGIN, y: MARGIN }).x}px`,
    top: `${(position ?? { x: MARGIN, y: MARGIN }).y}px`,
  };

  if (!isDevelopment) {
    return null;
  }

  if (toolbarCollapsed) {
    return (
      <div
        className={`fixed z-[120] touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"} ${dragging ? "" : "transition-[left,top] duration-200 ease-out"}`}
        onPointerDown={onDragStart}
        ref={rootRef}
        style={style}
      >
        <Button
          className="h-9 rounded-full border border-border/70 bg-black/95 px-3 text-xs shadow-xl backdrop-blur"
          onClick={() => setToolbarCollapsed(false)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <WrenchIcon className="mr-1 size-3.5" />
          Dev Tools
        </Button>
      </div>
    );
  }

  return (
    <Card
      className={`fixed z-[120] w-[280px] border-border/70 bg-black/95 shadow-xl backdrop-blur ${dragging ? "" : "transition-[left,top] duration-200 ease-out"}`}
      ref={rootRef}
      style={style}
    >
      <CardHeader className="pb-2">
        <div
          className={`flex touch-none items-center justify-between gap-2 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerDown={onDragStart}
        >
          <CardTitle className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Settings2Icon className="size-3.5" />
            Dev Toolbar
          </CardTitle>
          <Button
            aria-label="Collapse dev toolbar"
            onClick={() => setToolbarCollapsed(true)}
            size="icon-xs"
            title="Collapse"
            type="button"
            variant="ghost"
          >
            <ChevronUpIcon className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center justify-between rounded border border-emerald-400/30 bg-emerald-500/10 px-2 py-1.5">
          <span className="inline-flex items-center gap-1 text-emerald-100 text-xs">
            <FlaskConicalIcon className="size-3.5" />
            Test Mode
          </span>
          <Switch
            aria-label="Toggle test mode"
            checked={testModeEnabled}
            onCheckedChange={setTestModeEnabled}
            size="sm"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Test Bundle Source
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              className="h-7 text-[11px]"
              disabled={!testModeEnabled}
              onClick={() => setTestModeBundleSource("default")}
              size="sm"
              type="button"
              variant={
                testModeBundleSource === "default" ? "secondary" : "outline"
              }
            >
              Encrypted Default
            </Button>
            <Button
              className="h-7 text-[11px]"
              disabled={!testModeEnabled}
              onClick={() => setTestModeBundleSource("empty")}
              size="sm"
              type="button"
              variant={
                testModeBundleSource === "empty" ? "secondary" : "outline"
              }
            >
              Empty
            </Button>
          </div>
        </div>
        <div className="space-y-2 rounded border border-border/60 bg-background/60 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-foreground">UI ID overlays</span>
            <Switch
              aria-label="Toggle UI ID overlays"
              checked={showUiIds}
              onCheckedChange={setShowUiIds}
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-foreground">
              Codex auto-connect
            </span>
            <Switch
              aria-label="Toggle Codex auto-connect"
              checked={codexAutoConnect}
              onCheckedChange={setCodexAutoConnect}
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-foreground">
              Planning API mock mode
            </span>
            <Switch
              aria-label="Toggle planning API mock mode"
              checked={planningApiMockMode}
              onCheckedChange={setPlanningApiMockMode}
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
