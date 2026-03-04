"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, CircleHelpIcon, CopyIcon, Loader2Icon, LogOutIcon, SquareArrowOutUpRightIcon, XIcon } from "lucide-react";
import { SiOpenai } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthStatusResponse = {
  ok: boolean;
  loggedIn: boolean;
  connected: boolean;
  detail?: string;
  error?: string;
};

type DeviceStartResponse = {
  ok: boolean;
  sessionId?: string;
  verificationUrl?: string | null;
  userCode?: string | null;
  logPath?: string;
  error?: string;
};

type DevicePollResponse = {
  ok: boolean;
  status?: "pending" | "completed" | "failed";
  verificationUrl?: string | null;
  userCode?: string | null;
  detail?: string;
  loggedIn?: boolean;
  logPath?: string;
  error?: string;
};

export function CodexAuthControl() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deviceSessionId, setDeviceSessionId] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string>("https://auth.openai.com/codex");
  const [userCode, setUserCode] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);
  const autoConnectTriedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/codex/auth/status", { cache: "no-store" });
      const body = (await response.json()) as AuthStatusResponse;
      setLoggedIn(Boolean(body.loggedIn));
      setConnected(Boolean(body.connected));
      if (body.connected) {
        setDeviceSessionId(null);
        setUserCode(null);
        stopPolling();
      }
      setMessage(body.ok ? null : (body.error ?? body.detail ?? "Failed to read Codex login status."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setLoggedIn(false);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [stopPolling]);

  useEffect(() => {
    void refresh();
    return () => stopPolling();
  }, [refresh, stopPolling]);

  const connectIfReady = useCallback(async (silent = false) => {
    const response = await fetch("/api/codex/auth/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    if (!response.ok) return false;
    await refresh();
    if (!silent) {
      setShowPanel(false);
      setMessage("Connected to OpenAI for Codex chat.");
    }
    return true;
  }, [refresh]);

  useEffect(() => {
    if (loading || connected || !loggedIn || autoConnectTriedRef.current) return;
    autoConnectTriedRef.current = true;
    void connectIfReady(true).then((ok) => {
      if (!ok) autoConnectTriedRef.current = false;
    });
  }, [connectIfReady, connected, loading, loggedIn]);

  useEffect(() => {
    if (connected) autoConnectTriedRef.current = false;
  }, [connected]);

  const startBrowserLoginFlow = useCallback(async (loginPopup: Window | null) => {
    const response = await fetch("/api/codex/auth/device/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const body = (await response.json()) as DeviceStartResponse;
    if (!response.ok || !body.ok || !body.sessionId) {
      if (loginPopup && !loginPopup.closed) loginPopup.close();
      const suffix = body.logPath ? ` Log: ${body.logPath}` : "";
      throw new Error(`${body.error ?? "Failed to start OpenAI browser login flow."}${suffix}`);
    }

    const nextUrl = body.verificationUrl ?? "https://auth.openai.com/codex";
    setDeviceSessionId(body.sessionId);
    setVerificationUrl(nextUrl);
    setUserCode(body.userCode ?? null);
    setShowPanel(true);
    setMessage("Complete OpenAI sign-in in the new tab; this will auto-connect.");

    if (loginPopup && !loginPopup.closed) {
      loginPopup.location.href = nextUrl;
    }

    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const poll = await fetch(`/api/codex/auth/device/${body.sessionId}`, { cache: "no-store" });
        const pollBody = (await poll.json()) as DevicePollResponse;
        if (!poll.ok || !pollBody.ok) return;

        if (pollBody.verificationUrl) setVerificationUrl(pollBody.verificationUrl);
        if (pollBody.userCode) setUserCode(pollBody.userCode);

        if (pollBody.loggedIn || pollBody.status === "completed") {
          stopPolling();
          await connectIfReady();
        } else if (pollBody.status === "failed") {
          stopPolling();
          const suffix = pollBody.logPath ? ` Log: ${pollBody.logPath}` : "";
          setMessage(`${pollBody.detail ?? "OpenAI login failed. Try again."}${suffix}`);
        }
      } catch {
        // ignore transient poll errors
      }
    }, 1500);
  }, [connectIfReady, stopPolling]);

  const startLogin = useCallback(async () => {
    const loginPopup = window.open("https://auth.openai.com/codex", "_blank", "noopener,noreferrer");
    await startBrowserLoginFlow(loginPopup);
  }, [startBrowserLoginFlow]);

  useEffect(() => {
    if (!showPanel || connected || busy) return;
    const interval = window.setInterval(async () => {
      const connectedNow = await connectIfReady(true);
      if (connectedNow) {
        setShowPanel(false);
        setMessage("Connected to OpenAI for Codex chat.");
      }
    }, 2500);
    return () => window.clearInterval(interval);
  }, [busy, connectIfReady, connected, showPanel]);

  const onIconClick = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (connected) {
        setShowPanel((prev) => !prev);
        return;
      }

      setShowPanel(true);
      const connectedNow = await connectIfReady(true);
      if (connectedNow) {
        setShowPanel(false);
        setMessage("Connected to OpenAI for Codex chat.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setShowPanel(true);
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/codex/auth/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      stopPolling();
      setDeviceSessionId(null);
      setUserCode(null);
      setShowPanel(false);
      setShowHelp(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!userCode) return;
    await navigator.clipboard.writeText(userCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const pathname = usePathname();
  const statusLabel = connected ? "Connected" : loggedIn ? "Ready" : deviceSessionId ? "Verify" : "Login";
  const badgeVariant = connected ? "default" : "outline";
  const iconTitle = connected ? "Sign out" : "Login";
  const returnUrl = pathname ?? "/dungeonbreak-content-app";

  return (
    <div className="relative flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => void onIconClick()}
        disabled={loading || busy}
        className={connected ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-primary"}
        aria-label={iconTitle}
        title={iconTitle}
      >
        {loading || busy ? <Loader2Icon className="size-4 animate-spin" /> : <SiOpenai className="size-4" />}
      </Button>
      <Badge variant={badgeVariant} className="hidden sm:inline-flex">{statusLabel}</Badge>

      {showPanel ? (
        <div className="absolute right-0 top-10 z-50 w-[340px] rounded-lg border border-border bg-popover p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold">OpenAI Login</p>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Login help"
                title="Login help"
                onClick={() => setShowHelp((prev) => !prev)}
              >
                <CircleHelpIcon className="size-3.5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setShowPanel(false);
                setShowHelp(false);
              }}
              aria-label="Close auth panel"
            >
              <XIcon className="size-3" />
            </Button>
          </div>

          <p className="mb-2 text-[11px] text-muted-foreground">
            {connected
              ? "Logged in and connected. Codex chat is ready."
              : "Complete sign-in in browser; this window will auto-update when ready."}
          </p>
          {showHelp ? (
            <div className="mb-2 rounded border border-border/80 bg-muted/20 p-2 text-[11px] text-muted-foreground">
              1. Click login and finish Google/OpenAI auth in the new tab.
              <br />
              2. Return to this app tab.
              <br />
              3. Use "Back to Space Explorer" if needed.
            </div>
          ) : null}

          {!connected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input value={verificationUrl} readOnly className="h-8 text-[11px]" />
                <Button size="icon-sm" variant="outline" asChild>
                  <a href={verificationUrl} target="_blank" rel="noreferrer" aria-label="Open OpenAI login page">
                    <SquareArrowOutUpRightIcon className="size-3.5" />
                  </a>
                </Button>
              </div>
              {userCode ? (
                <div className="flex items-center gap-2">
                  <Input value={userCode} readOnly className="h-8 font-mono text-[11px]" />
                  <Button size="icon-sm" variant="outline" onClick={() => void copyCode()} aria-label="Copy login code">
                    {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-end gap-2">
            {!connected ? (
              <Button size="sm" variant="ghost" asChild>
                <a href={returnUrl}>Return to this page</a>
              </Button>
            ) : null}
            {!connected ? (
              <Button size="sm" variant="outline" onClick={() => void startLogin()} disabled={busy}>
                Restart Login
              </Button>
            ) : null}
            {connected ? (
              <Button size="sm" variant="outline" onClick={() => void onDisconnect()} disabled={busy}>
                <LogOutIcon className="size-3.5" />
                Disconnect
              </Button>
            ) : null}
          </div>

          {message ? <p className="mt-2 text-[11px] text-muted-foreground">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
