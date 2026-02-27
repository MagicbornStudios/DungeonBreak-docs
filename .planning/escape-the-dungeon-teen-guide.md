# Escape the Dungeon Engine Guide (Simple Version)

This guide explains the game engine in plain language.

## 1. What the game is

- You play as **Kael**.
- You start at level 12 (deepest point).
- You want to reach the final gate on level 1.
- Every action is one turn.

## 2. Main objects

Think of the game like a set of boxes:

1. **Dungeon**
- Holds all levels.
- Knows total level count (12).

2. **Level**
- Holds 50 rooms.
- Has one start room and one exit room.

3. **Room**
- Has a feature (training, treasure, rest, etc.).
- Has items.
- Has a vector (meaning state).

4. **Entity**
- Kael and NPCs are entities.
- Entities have:
  - traits (vector values)
  - attributes (might/agility/insight/willpower)
  - health, energy, inventory

5. **Act / Chapter / Page**
- Each level = one chapter.
- 4 chapters = one act.
- Pages store logs of what happened.

## 3. How turns work

One turn = one action:

1. Player takes one action (`move`, `train`, `rest`, `talk`, `search`, `speak`, `choose_dialogue`).
2. Room vector influences the actor.
3. Event is logged to pages.
4. NPCs each take one action.

## 4. What vectors do

Vectors are just number maps like:

```text
Empathy: 0.4
Survival: 0.2
Direction: -0.1
```

We use vectors for:

- entity traits
- room mood/state
- item influence
- dialogue option positions

## 5. Dialogue ranges

Dialogue options are only available when:

1. The current vector is close enough to the option vector.
2. The room/item conditions are true.

Example:

- `loot_treasure` needs a treasure item to exist.
- If treasure is gone, that option disappears.
- A different option can appear, like:
  - `wish_something_else_was_here`

## 6. How to add new features safely

### Add a new room feature

1. Add a constant in `world/map.py`.
2. Add base vector behavior in `_feature_base_vector`.
3. Add generation rule for which rooms get it.

### Add a new dialogue option

1. Open `narrative/dialogue.py`.
2. Add a `DialogueOption` in a cluster.
3. Set:
  - `anchor_vector`
  - `radius`
  - room/item requirements
4. Test with `game.available_dialogue_options()`.

### Add a new trait

1. Add it to trait manifest.
2. Add anchor text in projector defaults.
3. Update any room/dialogue vectors that should use it.

## 7. CLI commands

Use:

```bash
escape-the-dungeon
```

Useful commands:

- `look`
- `status`
- `options`
- `choose <option_id>`
- `go north|south|east|west|up|down`
- `train`
- `rest`
- `talk`
- `search`
- `say <text>`
- `pages`
