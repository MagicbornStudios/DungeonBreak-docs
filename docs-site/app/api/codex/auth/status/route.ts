import { NextResponse } from "next/server";
import { getCodexLoginStatus } from "@/lib/codex-cli";
import { getCodexAuthLogPath, logCodexAuth } from "@/lib/codex-auth-log";

export const runtime = "nodejs";

function isConnectedCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").some((row) => row.trim() === "dungeonbreak-codex-auth=connected");
}

export async function GET(request: Request) {
  try {
    const { loggedIn, detail } = await getCodexLoginStatus();
    const connected = isConnectedCookie(request) && loggedIn;
    await logCodexAuth("route.status.ok", { loggedIn, connected });
    return NextResponse.json({
      ok: true,
      loggedIn,
      connected,
      detail,
    });
  } catch (error) {
    await logCodexAuth("route.status.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        loggedIn: false,
        connected: false,
        detail: error instanceof Error ? error.message : String(error),
        logPath: getCodexAuthLogPath(),
      },
      { status: 500 },
    );
  }
}
