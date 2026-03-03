import { NextResponse } from "next/server";
import { startCodexDeviceAuth } from "@/lib/codex-cli";
import { getCodexAuthLogPath, logCodexAuth } from "@/lib/codex-auth-log";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await startCodexDeviceAuth();
    await logCodexAuth("route.device.start.ok", {
      sessionId: session.id,
      verificationUrl: session.verificationUrl,
      hasUserCode: Boolean(session.userCode),
    });
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      verificationUrl: session.verificationUrl,
      userCode: session.userCode,
    });
  } catch (error) {
    await logCodexAuth("route.device.start.error", {
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
