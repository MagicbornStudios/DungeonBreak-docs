import { type DialogueProgressState, cloneState, type GameSnapshot, type GameState } from "../core/types";
import { normalizeEntityStats } from "../core/entity-stat-domains";
import {
  canonicalEntityTypeId,
  canonicalOccupationId,
  canonicalPartyRoleId,
  occupationLabel,
  partyRoleLabel,
} from "./game-runtime-helpers";

export const createEmptyDialogueProgress = (): DialogueProgressState => ({
  sequence: 0,
  lastOptionId: null,
  lastSceneId: null,
  visitedOptionIds: [],
  visitedSceneIds: [],
  history: [],
});

export const captureSnapshotState = (
  state: GameState,
  rngState: number,
  seenCutscenes: string[],
): GameSnapshot => {
  state.rngState = rngState;
  state.seenCutscenes = seenCutscenes;
  return cloneState(state);
};

export const restoreSnapshotState = (snapshot: GameSnapshot): GameState => {
  const state = cloneState(snapshot);
  if (!state.dialogueProgress) {
    state.dialogueProgress = createEmptyDialogueProgress();
  }
  if (typeof state.mountSummoned !== "boolean") {
    state.mountSummoned = false;
  }
  if (typeof state.streamActive !== "boolean") {
    state.streamActive = false;
  }
  if (!Array.isArray(state.summonFormSpellIds)) {
    state.summonFormSpellIds = [];
  }
  if (!state.initiativeMeters) {
    state.initiativeMeters = {};
  }
  if (!Array.isArray(state.lastInitiativeOrder)) {
    state.lastInitiativeOrder = [];
  }
  for (const entity of Object.values(state.entities)) {
    entity.entityTypeId = canonicalEntityTypeId(entity.entityTypeId, entity.entityKind);
    entity.occupationId = canonicalOccupationId(entity.occupationId, entity.entityKind);
    entity.occupationName = occupationLabel(entity.occupationId);
    entity.partyRoleId = canonicalPartyRoleId(entity.partyRoleId, entity.entityKind);
    entity.partyRoleName = partyRoleLabel(entity.partyRoleId);
    entity.summonedBySkillId =
      typeof entity.summonedBySkillId === "string"
        ? entity.summonedBySkillId
        : null;
    normalizeEntityStats(entity);
  }
  return state;
};
