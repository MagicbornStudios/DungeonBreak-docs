# Phase 14 Context - Browser Combat Simulation Parity (No Grid)

## Desired Outcome

Deliver browser combat parity that feels playable and scalable without introducing a combat grid, while preserving emergent simulation, deterministic replay, and reusable cross-language data contracts.

## Constraints

- No combat grid UI/model in this phase.
- Player combat controls stay high-level (`fight`, `flee`).
- Detailed combat choice/prioritization is engine-owned.
- TypeScript runtime is canonical; Python compatibility is optional transition tooling.
- Keep `/play` button-first interaction model and cutscene queue behavior.
- Turn-processing UX target is `p95 <= 2s` under pressure profile.

## Non-Goals

- Real-time or tactical position micromanagement.
- Full content-scale completion across all skills/items/events.
- Replacing the existing docs information architecture.

## Risks

- Combat may feel opaque if simulation reasons are not surfaced clearly.
- Long-run entity pressure can degrade browser performance.
- Drift between schema contracts and runtime implementation.

## Mitigations

- Add combat outcome explainability in feed events.
- Add long-run deterministic simulation tests and performance checks.
- Keep parity matrix rows explicit for combat/flee behavior and 25-turn reference run.
- Add JSON schema validation and golden trace replay tests in CI.
