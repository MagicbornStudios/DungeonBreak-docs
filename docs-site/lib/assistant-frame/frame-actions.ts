import { ACTION_CATALOG, type PlayerAction } from "@dungeonbreak/engine";

const ACTION_TYPE_SET = new Set(ACTION_CATALOG.actions.map((row) => row.actionType));

export type FrameActionParseResult =
  | { ok: true; action: PlayerAction }
  | { ok: false; error: string };

export type FrameActionDispatchResult<T> =
  | { ok: false; error: string }
  | ({ ok: true } & T);

export const isKnownActionType = (value: string): boolean => ACTION_TYPE_SET.has(value);

export const parseFrameAction = (
  actionType: string,
  payload?: Record<string, unknown>,
): FrameActionParseResult => {
  const normalized = String(actionType ?? "").trim();
  if (!normalized) {
    return { ok: false, error: "missing_action_type" };
  }
  if (!isKnownActionType(normalized)) {
    return { ok: false, error: `unknown_action_type:${normalized}` };
  }

  return {
    ok: true,
    action: {
      actionType: normalized as PlayerAction["actionType"],
      payload: payload ?? {},
    },
  };
};

export const dispatchFrameAction = async <T extends Record<string, unknown>>(
  actionType: string,
  payload: Record<string, unknown> | undefined,
  dispatch: (action: PlayerAction) => Promise<FrameActionDispatchResult<T>>,
): Promise<FrameActionDispatchResult<T>> => {
  const parsed = parseFrameAction(actionType, payload);
  if (!parsed.ok) {
    return parsed;
  }
  return dispatch(parsed.action);
};
