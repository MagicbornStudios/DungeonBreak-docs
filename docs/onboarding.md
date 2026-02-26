# Onboarding: finding code and examples

Short pointers to get from “I’m new” to “I know where to look.” See [README](../README.md) for quick start and [.planning/PROJECT.md](../.planning/PROJECT.md) for scope.

## 1. Narrative and dialog (state, options, saliency)

- **Python (demos, no Unreal):**  
  `src/dungeonbreak_narrative/` — narrative state space, Verlet, dialog-by-meaning. Used by the Jupyter notebooks. Run `npm run lab` and open `dungeonbreak-narrative.ipynb` and `dungeonbreak-text-adventure.ipynb` for live examples.
- **C++ / Unreal:**  
  - **Plugin:** `Plugins/NarrativeEngine/Source/` — `NarrativeSubsystem`, `NarrativeEntityComponent`, `NarrativeRuntimeData`, `NarrativeStaticData`.  
  - **Game integration:** `Source/Narrative/` — `NarrativeComponent`, `DialogComponent`, `DialogTypes`, `DialogInterface`.  
  Generate C++ API docs with `npm run docs:cpp` and open `docs/api/cpp/html/index.html`.

### Narrative Demo Alignment (lab notebooks)

- **Trait source of truth:** `Content/DungeonBreak/Narrative/ThematicBasisVectors/*.uasset`.
- **Manifest + snapshot consumed by Python demos:**  
  `src/dungeonbreak_narrative/data/game_traits_manifest.json` and `src/dungeonbreak_narrative/data/narrative_snapshot.json`.
- **Sync + validation commands:**  
  `npm run narrative:sync-traits` then `npm run narrative:validate-alignment` (warn-only).
- **Policy:** demos are additive to game content and do not introduce substitute default trait axes.

### Payload Game Data + AI Generation

- **Payload app location:** `docs-site/` (admin at `/admin` when running `npm run lab`). The docs site welcome page (Getting Started → Welcome) is CMS-managed; edit it in Admin if you need to change the intro or links after the initial seed.
- **Game-data collections:** `docs-site/collections/` (`game-traits`, `narrative-entities`, `narrative-dialogs`, `characters`, `dialogue-lines`, `weapons`, `items`, `audio-assets`, `image-assets`).
- **Sync canonical game snapshot into Payload:**
  `npm run payload:sync-game-data`
- **Trigger generation from admin UI:** use the `Generate Audio` / `Generate Image` controls on dialogue lines, weapons, items, and characters.
- **Provider env vars:** set in `docs-site/.env` (server-side only):
  `ELEVENLABS_API_KEY`, `ELEVENLABS_TTS_MODEL_ID`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`.

## 2. Combat, economy, HUD

- **Combat:** `Source/Combat/` — `CombatComponent`, GAS attributes, damage/effects, auto-attack.  
- **Economy / items:** `Source/Economy/` — items, equipment, action economy attributes.  
- **HUD / UI:** `Source/HUD/` — character menu, progression bars, dialog drawer/cards.

## 3. World and interactions

- **Quaterra (world, interactions):** `Source/Quaterra/` — `InteractorComponent`, `InteractableComponent`, `HostilityComponent`, progression, appearances.  
- **Game mode / player:** `Source/DungeonBreak/` — `DBGameMode`, `DBCharacter`, `DBPlayerController`, state-tree tasks.

## 4. Generated API docs

- **Python:** `npm run docs:python` → `docs/api/python/` (open `index.html`).  
- **C++:** Install [Doxygen](https://www.doxygen.nl/), then `npm run docs:cpp` → `docs/api/cpp/html/index.html`.

Use these plus the [image catalog](image-catalog.md) and `.planning/` to map design to code.
