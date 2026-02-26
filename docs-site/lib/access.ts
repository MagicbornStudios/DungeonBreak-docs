export type AdminRole = "admin" | "owner";

export type UserLike = {
  id?: number | string;
  role?: string | null;
} | null | undefined;

/** Accepts Payload req.user (User | PayloadMcpApiKey union); only User has role. */
export function isOwnerOrAdminUser(user: UserLike | unknown): boolean {
  const u = user as UserLike;
  return u?.role === "owner" || u?.role === "admin";
}

/** Accepts Payload req.user; only User has role. */
export function isOwnerUser(user: UserLike | unknown): boolean {
  const u = user as UserLike;
  return u?.role === "owner";
}
