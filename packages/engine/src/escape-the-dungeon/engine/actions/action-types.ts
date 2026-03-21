import type { NumberMap } from "../../core/types";

export type ActionAvailabilityResult = {
  available: boolean;
  blockedReasons: string[];
};

export type ActionOutcome = {
  message: string;
  warnings: string[];
  narrativeStatDelta: NumberMap;
  metadata: Record<string, unknown>;
  foundItemTags: string[];
  turnCost?: number;
  chapterCompleted?: number;
  subjectEntityId?: string;
};
