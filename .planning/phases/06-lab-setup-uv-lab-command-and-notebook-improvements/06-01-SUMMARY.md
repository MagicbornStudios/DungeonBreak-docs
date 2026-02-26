# Phase 06: Lab setup and notebook improvements - Plan 01 Summary

## Tasks

- [x] Lab rename and uv-based setup
- [x] Phase 06 ROADMAP, REQ-08, TASK-REGISTRY

## Outcomes

- **Rename:** package.json scripts are `lab` and `lab:install` (replacing notebooks/notebooks:install). Single entry: `npm run lab` ensures env then launches Jupyter Lab.
- **uv-based setup:** scripts/lab-install.mjs checks for uv in PATH; if missing, installs via official script (PowerShell on Windows, curl|sh on Unix). Then uv python install 3.12, uv venv .venv --python 3.12, uv pip install jupyterlab numpy matplotlib. scripts/lab-run.mjs runs lab-install when .venv is missing, then launches jupyter lab --notebook-dir notebooks. pyproject.toml added for uv (deps: jupyterlab, numpy, matplotlib).
- **Docs:** notebooks/README.md and .planning/PROJECT.md updated to "npm run lab" and that Lab is the single place for all notebooks and analysis. Old scripts notebooks-install.mjs and notebooks-run.mjs removed.

## Ready for

Plan 02 (notebook content and references).
