# Phase 15 Context - TypeScript Cutover and `DungeonBreak/engine` Package

## Desired Outcome

Move the project to a TypeScript-only gameplay runtime and ship `DungeonBreak/engine` as an installable package with bundled content and out-of-box React play component.

## Constraints

- Remove Python gameplay runtime from active repo paths immediately.
- Remove notebook gameplay artifacts from active development scope.
- Keep `npm run lab` and install helpers as the default local setup flow.
- Preserve deterministic gameplay rules and existing `/play` route behavior.
- Package must work without external gameplay backend.

## Non-Goals

- Unreal runtime integration in this phase.
- New major gameplay feature expansion beyond parity/contracts already defined in Phase 14.
- Full asset-authoring backend pipeline.

## Risks

- Breaking local onboarding while removing Python/notebook paths.
- Packaging API instability if interfaces are not locked first.
- Drift between docs-site internal usage and published consumer usage.

## Mitigations

- Lock package contract first (`engine API`, `React component`, `default content pack`).
- Add consumer smoke tests that install and run package surfaces in example app.
- Keep a strict cutover checklist for deleting Python/notebook paths while retaining lab/install scripts.
