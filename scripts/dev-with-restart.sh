#!/usr/bin/env bash
# Restart the planning Next server if it exits (e.g. crash). Use for "always on" dev.
# Run from repo root: ./scripts/dev-with-restart.sh
# Or: bash scripts/dev-with-restart.sh

set -e
cd "$(dirname "$0")/.."

while true; do
  echo "[$(date -Iseconds)] Starting planning server..."
  pnpm planning:standalone || true
  echo "[$(date -Iseconds)] Server exited. Restarting in 2s..."
  sleep 2
done
