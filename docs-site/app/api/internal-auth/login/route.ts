import configPromise from "@payload-config";
import { cookies } from "next/headers";
import { getPayload } from "payload";
import { NextResponse } from "next/server";
import { setPayloadAuthCookieAndRedirect } from "@/lib/dev-auth-cookie";
import {
  PORTAL_ACCESS_COOKIE,
  isAllowedPortalEmail,
  matchesOnboardingPassword,
  nameForPortalEmail,
  normalizePortalEmail,
  roleForPortalEmail,
} from "@/lib/internal-portal-auth";

type PortalLoginBody = {
  email?: string;
  next?: string;
  password?: string;
};

function safeNextPath(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return "/dungeonbreak-content-app/asset-explorer";
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dungeonbreak-content-app/asset-explorer";
  }
  return value;
}

export async function POST(request: Request) {
  let body: PortalLoginBody;
  const contentType = request.headers.get("content-type") ?? "";
  const expectsJson = contentType.includes("application/json");
  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as PortalLoginBody;
    } else {
      const formData = await request.formData();
      body = {
        email: String(formData.get("email") ?? ""),
        next: String(formData.get("next") ?? ""),
        password: String(formData.get("password") ?? ""),
      };
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid login request." },
      { status: 400 }
    );
  }

  const email = normalizePortalEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const nextPath = safeNextPath(body.next);
  const redirectToAccess = (error: string, status: number) => {
    if (expectsJson) {
      return NextResponse.json({ error }, { status });
    }
    const redirectUrl = new URL("/portal-access", request.url);
    redirectUrl.searchParams.set("next", nextPath);
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  };

  if (!isAllowedPortalEmail(email)) {
    return redirectToAccess(
      "This portal is restricted to the internal allowlist.",
      403
    );
  }

  if (!matchesOnboardingPassword(password)) {
    return redirectToAccess("The onboarding password is incorrect.", 401);
  }

  try {
    const payload = await getPayload({ config: configPromise });
    const existingUsers = (await payload.find({
      collection: "users",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        email: {
          equals: email,
        },
      },
    })) as unknown as { docs?: Array<{ id?: number | string }> };

    const existingUser = existingUsers.docs?.[0];
    if (existingUser?.id) {
      await payload.update({
        collection: "users",
        id: existingUser.id,
        data: {
          name: nameForPortalEmail(email),
          password,
          role: roleForPortalEmail(email),
        },
        overrideAccess: true,
      } as never);
    } else {
      await payload.create({
        collection: "users",
        data: {
          email,
          name: nameForPortalEmail(email),
          password,
          role: roleForPortalEmail(email),
        },
        overrideAccess: true,
      } as never);
    }

    const result = await payload.login({
      collection: "users",
      data: { email, password },
    });

    if (!result.token) {
      return redirectToAccess("Portal login failed.", 401);
    }

    const cookieStore = await cookies();
    cookieStore.set(PORTAL_ACCESS_COOKIE, email, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return setPayloadAuthCookieAndRedirect(
      payload,
      result.token,
      request.url,
      nextPath
    );
  } catch (error) {
    return redirectToAccess(
      error instanceof Error
        ? error.message
        : "Failed to start portal session.",
      500
    );
  }
}
