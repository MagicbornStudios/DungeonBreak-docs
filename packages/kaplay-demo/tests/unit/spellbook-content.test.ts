import assert from "node:assert/strict";
import test from "node:test";
import { SPELL_PACK } from "@dungeonbreak/engine";
import {
  buildSpellbookEntries,
  type PreparedSpellSlotView,
  type RuntimeSpellPoolView,
} from "../../src/spellbook-content";

const authoredSpell = SPELL_PACK.spells[0];
const PREPARED_SLOT_PATTERN = /Prepared in slot 1/i;
const FORGE_COST_PATTERN = /Forge Cost:/i;

if (!authoredSpell) {
  throw new Error("Expected at least one authored spell in SPELL_PACK.");
}

const preparedSlots: PreparedSpellSlotView[] = [
  {
    available: true,
    blockedReasons: [],
    description: authoredSpell.description ?? "No description",
    name: authoredSpell.name,
    skillId: authoredSpell.spellId,
    slotIndex: 0,
  },
];

const poolRows: RuntimeSpellPoolView[] = [
  {
    available: true,
    blockedReasons: [],
    branch: authoredSpell.categoryId,
    description: authoredSpell.description ?? "No description",
    isEquipped: true,
    name: authoredSpell.name,
    skillId: authoredSpell.spellId,
    slotIndex: 0,
  },
];

const discovery = {
  discoveredEvolutionIds: new Set<string>(),
  discoveredSpellIds: new Set<string>([authoredSpell.spellId]),
};

test("pool spellbook entries carry equipped-slot context for prepared spells", () => {
  const entries = buildSpellbookEntries(
    "pool",
    preparedSlots,
    poolRows,
    discovery
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.spellId, authoredSpell.spellId);
  assert.equal(entries[0]?.slotIndex, 0);
  assert.equal(entries[0]?.knownInPool, true);
  assert.match(entries[0]?.detailLines[1] ?? "", PREPARED_SLOT_PATTERN);
});

test("codex spellbook entries include discovered authored spells", () => {
  const entries = buildSpellbookEntries(
    "codex",
    preparedSlots,
    poolRows,
    discovery,
    authoredSpell.categoryId
  );

  assert.ok(entries.length >= 1);
  assert.equal(entries[0]?.spellId, authoredSpell.spellId);
  assert.equal(entries[0]?.knownInPool, true);
  assert.match(entries[0]?.detailLines.join("\n") ?? "", FORGE_COST_PATTERN);
});
