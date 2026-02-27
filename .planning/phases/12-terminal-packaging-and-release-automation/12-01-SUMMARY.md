# Phase 12 / Plan 01 - Summary

## Outcome

Plan `12-01` is implemented for terminal packaging and release automation.

## What was shipped

1. Local binary build tooling was added:
   - `pyproject.toml` extra: `build-bin` (PyInstaller)
   - `package.json` scripts:
     - `build:terminal:bin`
     - `release:terminal:local`
2. Release pipeline workflow was added:
   - `.github/workflows/terminal-game-release.yml`
   - runs python tests first
   - builds binaries on `ubuntu`, `windows`, and `macos`
   - uploads artifacts per platform
   - publishes release assets on tags matching `v*`
3. Repo hygiene and docs were updated:
   - `.gitignore` entries for build outputs/spec files
   - `README.md` release/build instructions
   - `AGENTS.md` publishing guidance section
   - `.planning` roadmap/requirements/task traceability updates

## Local validation

1. Tests:
   - `uv run --extra test pytest -q`
   - result: `51 passed`
2. Binary build:
   - `uv run --extra build-bin pyinstaller --name escape-the-dungeon --onefile --paths src src/dungeonbreak_narrative/escape_the_dungeon/cli.py`
   - produced `dist/escape-the-dungeon.exe` on local Windows validation run

## Traceability

- REQ-33, REQ-34, REQ-35 -> Implemented.
- TASK-REGISTRY 12-1..12-6 -> marked Done.
