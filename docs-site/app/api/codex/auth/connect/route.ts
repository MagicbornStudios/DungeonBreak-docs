import { NextResponse } from "next/server";
import { getCodexLoginStatus } from "@/lib/codex-cli";
import { getCodexAuthLogPath, logCodexAuth } from "@/lib/codex-auth-log";

export const runtime = "nodejs";

export async function POST() {
  try {
    const status = await getCodexLoginStatus();
    await logCodexAuth("route.connect.check", { loggedIn: status.loggedIn });
    if (!status.loggedIn) {
      return NextResponse.json(
        {
          ok: false,
          error: "OpenAI login is not active yet for this workspace session.",
          detail: status.detail,
        },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      connected: true,
      detail: status.detail,
    });
    response.cookies.set("dungeonbreak-codex-auth", "connected", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    await logCodexAuth("route.connect.ok", { connected: true });
    return response;
  } catch (error) {
    await logCodexAuth("route.connect.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        logPath: getCodexAuthLogPath(),
      },
      { status: 500 },
    );
  }
}
