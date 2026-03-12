import { NextResponse } from "next/server";
import { getCodexLoginStatus } from "@planning/lib/codex-cli";
import { getLastChatOutcome } from "@planning/lib/planning-debug-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { loggedIn, detail } = await getCodexLoginStatus();
    const lastChat = getLastChatOutcome();
    return NextResponse.json({
      codex: { loggedIn, detail },
      lastChat: lastChat
        ? {
            route: lastChat.route,
            replyLength: lastChat.replyLength,
            lastError: lastChat.lastError,
            timestamp: lastChat.timestamp,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { codex: { loggedIn: false, detail: message }, lastChat: null },
      { status: 500 },
    );
  }
}
