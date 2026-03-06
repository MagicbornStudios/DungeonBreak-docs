export type RuntimeSpaceView =
  | "content-combined"
  | "content-skill"
  | "content-dialogue"
  | "content-archetype"
  | "action"
  | "event"
  | "effect";

export type DistanceAlgorithm = "game-default" | "euclidean" | "cosine";

export const CONTENT_SPACE_KEYS = [
  "content-combined",
  "content-dialogue",
  "content-skill",
  "content-archetype",
] as const;

export type ContentSpaceKey = (typeof CONTENT_SPACE_KEYS)[number];

export function isContentRuntimeView(runtimeSpaceView: RuntimeSpaceView): boolean {
  return (
    runtimeSpaceView === "content-combined" ||
    runtimeSpaceView === "content-skill" ||
    runtimeSpaceView === "content-dialogue" ||
    runtimeSpaceView === "content-archetype"
  );
}

export function resolveEffectiveAlgorithm(
  runtimeSpaceView: RuntimeSpaceView,
  selected: DistanceAlgorithm
): "euclidean" | "cosine" {
  if (selected === "game-default") {
    return isContentRuntimeView(runtimeSpaceView) ? "euclidean" : "cosine";
  }
  return selected;
}
