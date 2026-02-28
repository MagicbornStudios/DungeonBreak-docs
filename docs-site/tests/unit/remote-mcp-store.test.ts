import { describe, expect, test } from "vitest";
import { getRemoteMcpStore } from "@/lib/mcp/remote-session-store";

describe("remote mcp session store", () => {
  test("isolates sessions per authenticated user", () => {
    const store = getRemoteMcpStore();
    const suffix = Date.now().toString();
    const userA = `user-a-${suffix}`;
    const userB = `user-b-${suffix}`;
    const sessionA = store.createSession(userA, 7);
    const sessionB = store.createSession(userB, 7);

    const sessionsA = store.listSessions(userA).map((row) => row.sessionId);
    const sessionsB = store.listSessions(userB).map((row) => row.sessionId);

    expect(sessionsA).toContain(sessionA.sessionId);
    expect(sessionsA).not.toContain(sessionB.sessionId);
    expect(sessionsB).toContain(sessionB.sessionId);
    expect(sessionsB).not.toContain(sessionA.sessionId);
  });

  test("enforces per-user request rate limit", () => {
    const store = getRemoteMcpStore();
    const userId = `rate-limit-${Date.now()}`;
    for (let index = 0; index < 120; index += 1) {
      store.assertRateLimit(userId);
    }

    expect(() => store.assertRateLimit(userId)).toThrow("rate_limit_exceeded");
  });
});
