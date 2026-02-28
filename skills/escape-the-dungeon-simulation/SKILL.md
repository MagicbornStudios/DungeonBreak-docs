---
name: escape-the-dungeon-simulation
description: Run Escape the Dungeon text adventure simulation in chat. Use when the user wants to play the game conceptually, run simulation, or discover content through gameplay. Reads scratch/game-state.md, follows .concept/SIMULATION-AGENT-GUIDE.md, uses .planning/GRD-escape-the-dungeon.md for behavior.
---

# Escape the Dungeon Simulation

Run the game as AI narrator + engine. One player message = one turn.

## Before simulating

1. Read `scratch/game-state.md` for current state
2. Read `.concept/SIMULATION-AGENT-GUIDE.md` for turn procedure
3. Reference `.planning/GRD-escape-the-dungeon.md` for action effects and cutscene triggers

## Turn procedure

Parse input → execute action → apply room influence → deed → skill check → cutscene check → update `scratch/game-state.md`.

## Discovery

When something feels missing or like prize content, append to Discovery Artifacts in game-state.md. Migrate to `.concept/DISCOVERY-LOG.md` when curated.
