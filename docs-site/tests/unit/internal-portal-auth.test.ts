import { describe, expect, test, vi } from "vitest";
import {
  allowedPortalEmails,
  hasPortalAccessCookieValue,
  isAllowedPortalEmail,
  matchesOnboardingPassword,
  nameForPortalEmail,
  normalizePortalEmail,
  roleForPortalEmail,
} from "@/lib/internal-portal-auth";

describe("internal portal auth helpers", () => {
  test("uses stable default allowlisted mailboxes", () => {
    expect(allowedPortalEmails()).toEqual([
      "bg@dungeonbreak.com",
      "cs@dungeonbreak.com",
    ]);
  });

  test("normalizes and validates allowlisted emails", () => {
    expect(normalizePortalEmail(" BG@DungeonBreak.com ")).toBe(
      "bg@dungeonbreak.com"
    );
    expect(isAllowedPortalEmail("BG@dungeonbreak.com")).toBe(true);
    expect(isAllowedPortalEmail("nope@example.com")).toBe(false);
    expect(hasPortalAccessCookieValue("cs@dungeonbreak.com")).toBe(true);
    expect(hasPortalAccessCookieValue("intruder@example.com")).toBe(false);
  });

  test("maps internal emails to portal roles and display names", () => {
    expect(roleForPortalEmail("bg@dungeonbreak.com")).toBe("owner");
    expect(roleForPortalEmail("cs@dungeonbreak.com")).toBe("admin");
    expect(nameForPortalEmail("bg@dungeonbreak.com")).toBe("BG");
    expect(nameForPortalEmail("ops-team@dungeonbreak.com")).toBe("Ops Team");
  });

  test("supports a temporary onboarding password override", () => {
    vi.stubEnv("INTERNAL_PORTAL_ONBOARDING_PASSWORD", "override-pass");
    expect(matchesOnboardingPassword("override-pass")).toBe(true);
    expect(matchesOnboardingPassword("stopthedungeonbreak")).toBe(false);
    vi.unstubAllEnvs();
  });
});
