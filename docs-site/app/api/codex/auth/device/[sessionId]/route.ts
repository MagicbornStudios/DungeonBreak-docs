import { NextResponse } from "next/server";
import { getCodexDeviceAuthSession, getCodexLoginStatus } from "@/lib/codex-cli";
import { getCodexAuthLogPath, logCodexAuth } from "@/lib/codex-auth-log";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const login = await getCodexLoginStatus().catch(() => ({ loggedIn: false, detail: "" }));
  const session = getCodexDeviceAuthSession(sessionId);
  await logCodexAuth("route.device.poll", {
    sessionId,
    loginLoggedIn: login.loggedIn,
    hasSession: Boolean(session),
    sessionStatus: session?.status ?? null,
  });
  if (!session) {
    if (login.loggedIn) {
      const response = NextResponse.json({
        ok: true,
        status: "completed",
        verificationUrl: null,
        userCode: null,
        detail: "Authenticated.",
        loggedIn: true,
      });
      response.cookies.set("dungeonbreak-codex-auth", "connected", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      return response;
    }
    return NextResponse.json({
      ok: true,
      status: "failed",
      verificationUrl: null,
      userCode: null,
      detail: "Auth session expired. Start login again.",
      loggedIn: false,
      logPath: getCodexAuthLogPath(),
    });
  }
  if (session.status === "completed" && login.loggedIn) {
    const response = NextResponse.json({
      ok: true,
      status: "completed",
      verificationUrl: session.verificationUrl,
      userCode: session.userCode,
      detail: session.detail,
      loggedIn: true,
    });
    response.cookies.set("dungeonbreak-codex-auth", "connected", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  }

  return NextResponse.json({
    ok: true,
    status: session.status,
    verificationUrl: session.verificationUrl,
    userCode: session.userCode,
    detail: session.detail,
    loggedIn: login.loggedIn,
  });
}
