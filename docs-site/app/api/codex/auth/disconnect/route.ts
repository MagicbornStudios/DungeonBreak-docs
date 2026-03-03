import { NextResponse } from "next/server";
import { logCodexAuth } from "@/lib/codex-auth-log";

export const runtime = "nodejs";

export async function POST() {
  await logCodexAuth("route.disconnect", { connected: false });
  const response = NextResponse.json({ ok: true, connected: false });
  response.cookies.set("dungeonbreak-codex-auth", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
