"use client";

import { Terminal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/planning-ui/ui/collapsible";
import { cn } from "@/lib/utils";

const LOGS_URL = "/api/planning-debug/logs";
const STATUS_URL = "/api/planning-debug/status";
const MAX_LINES = 200;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const STATUS_POLL_MS = 10000;

type BackendStatus = {
  codex: { loggedIn: boolean; detail: string };
  lastChat: { route: string; replyLength: number; lastError?: string; timestamp: number } | null;
} | null;

export function PlanningServerLogPanel({ className }: { className?: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<BackendStatus>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setConnected(false);
    fetch(LOGS_URL, { signal: ac.signal })
      .then((res) => {
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        setConnected(true);
        backoffRef.current = INITIAL_BACKOFF_MS;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        let currentData = "";
        const processLine = (line: string) => {
          if (line.startsWith("event:")) {
            if (currentEvent === "line" && currentData) {
              try {
                const text = JSON.parse(currentData) as string;
                setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), text]);
              } catch {
                setLines((prev) => [...prev.slice(-(MAX_LINES - 1)), currentData]);
              }
            }
            currentEvent = line.replace(/^event:\s*/, "").trim();
            currentData = "";
            return;
          }
          if (line.startsWith("data:")) currentData = line.replace(/^data:\s*/, "").trim();
        };
        const read = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (done) {
              setConnected(false);
              return Promise.reject(new Error("Stream ended"));
            }
            buffer += dec.decode(value, { stream: true });
            const parts = buffer.split("\n");
            buffer = parts.pop() ?? "";
            for (const line of parts) processLine(line);
            return read();
          });
        return read();
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setConnected(false);
        const delay = backoffRef.current;
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        setTimeout(() => connect(), delay);
      });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      abortRef.current?.abort();
    };
  }, [connect]);

  useEffect(() => {
    const fetchStatus = () => {
      fetch(STATUS_URL)
        .then((r) => r.json())
        .then((data: BackendStatus) => setStatus(data))
        .catch(() => setStatus(null));
    };
    fetchStatus();
    const t = setInterval(fetchStatus, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !open) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [lines, open]);

  const statusText = status
    ? "Codex: " +
      (status.codex.loggedIn ? "ok" : "not logged in") +
      (status.lastChat
        ? " | Last: " + status.lastChat.route + ", " + status.lastChat.replyLength + " chars"
        : "")
    : "";

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("w-full", className)}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50"
        aria-label={open ? "Collapse server log" : "Expand server log"}
      >
        <Terminal className="size-4 shrink-0" aria-hidden />
        <span>Server / Codex log</span>
        <span
          className={cn(
            "ml-2 size-2 shrink-0 rounded-full",
            connected ? "bg-emerald-500" : "bg-amber-500",
          )}
          aria-hidden
        />
        {statusText ? <span className="ml-2 text-xs text-muted-foreground">{statusText}</span> : null}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          ref={containerRef}
          className="mt-1 max-h-48 overflow-y-auto overflow-x-auto rounded-md border border-border/50 bg-black/80 p-2 font-mono text-xs text-green-400/90"
          role="log"
          aria-live="polite"
        >
          {lines.length === 0 && !connected ? (
            <p className="text-muted-foreground">Connecting…</p>
          ) : (
            lines.map((line, i) => (
              <div key={i + "-" + line.slice(0, 20)} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
