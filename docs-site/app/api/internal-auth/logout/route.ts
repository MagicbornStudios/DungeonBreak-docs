import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PORTAL_ACCESS_COOKIE } from "@/lib/internal-portal-auth";

const PAYLOAD_COOKIE_PREFIX = process.env.PAYLOAD_COOKIE_PREFIX ?? "payload";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_ACCESS_COOKIE);

  for (const cookie of cookieStore.getAll()) {
    if (
      cookie.name.startsWith(PAYLOAD_COOKIE_PREFIX) &&
      cookie.name.includes("token")
    ) {
      cookieStore.delete(cookie.name);
    }
  }

  return NextResponse.redirect(new URL("/portal-access", request.url));
}
