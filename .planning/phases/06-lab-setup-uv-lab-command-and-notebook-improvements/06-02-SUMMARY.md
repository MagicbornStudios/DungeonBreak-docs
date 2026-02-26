# Phase 06: Lab setup and notebook improvements - Plan 02 Summary

## Tasks

- [x] .planning/REFERENCES.md with GDC/video links for agents
- [x] Notebook: Kaiza state, dialogue vectors, threshold, labels
- [x] PRD: threshold and options above threshold

## Outcomes

- **REFERENCES.md:** .planning/REFERENCES.md created. Lists Tanya X. Short (Writing Modular Characters) with YouTube link; Kate Compton, Matt Brown, Jesse Schell with search hints. Instructs agents to review these when implementing narrative/state-space/math-heavy features. Points to DECISIONS.md, narrative-engine-PRD, game-PRD, implementation-roadmap.
- **kaiza-state-dialogue.ipynb:** New notebook. Kaiza and NPCs as entities with position (state vector) and optional velocity; dialogue options (Vow, Laugh, Embrace, Pay, Loyalty plea) at locations; threshold (0.25); options_above_threshold(); random among available; 3D plot with labels for entities and dialogue (orange = in range for Kaiza).
- **narrative-engine-PRD:** §3.1 extended with Threshold bullet: distance threshold for "available" options; when multiple above threshold: show all, random among them, or best + variety. Reference to notebook added.
- **notebooks/README:** kaiza-state-dialogue.ipynb added to table.

## Phase 06 status

Lab setup (uv, lab command) and notebook improvements complete. Ready for verify-work 6.
