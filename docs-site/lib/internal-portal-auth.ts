const DEFAULT_ALLOWED_EMAILS = ["bg@dungeonbreak.com", "cs@dungeonbreak.com"];
const DEFAULT_ONBOARDING_PASSWORD = "stopthedungeonbreak";

export const PORTAL_ACCESS_COOKIE = "dungeonbreak-portal-access";

export function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function allowedPortalEmails(): string[] {
  const configured = process.env.INTERNAL_ALLOWED_EMAILS?.split(",")
    .map((entry) => normalizePortalEmail(entry))
    .filter((entry) => entry.length > 0);
  return configured && configured.length > 0
    ? [...new Set(configured)]
    : DEFAULT_ALLOWED_EMAILS;
}

export function isAllowedPortalEmail(email: string): boolean {
  return allowedPortalEmails().includes(normalizePortalEmail(email));
}

export function onboardingPassword(): string {
  return (
    process.env.INTERNAL_PORTAL_ONBOARDING_PASSWORD?.trim() ||
    DEFAULT_ONBOARDING_PASSWORD
  );
}

export function matchesOnboardingPassword(password: string): boolean {
  return password === onboardingPassword();
}

export function roleForPortalEmail(email: string): "admin" | "owner" {
  const normalized = normalizePortalEmail(email);
  const [primary] = allowedPortalEmails();
  return normalized === primary ? "owner" : "admin";
}

export function nameForPortalEmail(email: string): string {
  const normalized = normalizePortalEmail(email);
  if (normalized.startsWith("bg@")) {
    return "BG";
  }
  if (normalized.startsWith("cs@")) {
    return "CS";
  }
  const localPart = normalized.split("@")[0] ?? normalized;
  return localPart
    .split(/[._-]/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

export function hasPortalAccessCookieValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return isAllowedPortalEmail(value);
}
