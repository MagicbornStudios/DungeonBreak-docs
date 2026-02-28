import { describe, expect, test } from "vitest";
import { dispatchFrameAction, parseFrameAction } from "@/lib/assistant-frame/frame-actions";

describe("assistant frame action parser", () => {
  test("parses known action type with payload", () => {
    const parsed = parseFrameAction("move", { direction: "north" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.action.actionType).toBe("move");
    expect(parsed.action.payload).toEqual({ direction: "north" });
  });

  test("rejects empty action type", () => {
    const parsed = parseFrameAction("", {});
    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.error).toBe("missing_action_type");
  });

  test("rejects unknown action type", () => {
    const parsed = parseFrameAction("teleport", {});
    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.error).toContain("unknown_action_type");
  });

  test("dispatch flow resolves through callback for valid action", async () => {
    const output = await dispatchFrameAction("rest", {}, async (action) => {
      expect(action.actionType).toBe("rest");
      return { ok: true, message: "dispatched" };
    });
    expect(output.ok).toBe(true);
  });
});
