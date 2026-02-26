#!/usr/bin/env node
/**
 * Generate Python API docs from src/dungeonbreak_narrative into docs/api/python.
 * Requires: uv, and optional dependency "docs" (pdoc) in pyproject.toml.
 * Run from repo root: npm run docs:python
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const outDir = join(root, 'docs', 'api', 'python');
const isWin = process.platform === 'win32';

// Ensure venv and docs extra (pdoc) are installed
const sync = spawnSync('uv', ['sync', '--extra', 'docs'], {
  cwd: root,
  stdio: 'inherit',
  shell: isWin,
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

const pdoc = spawnSync(
  'uv',
  ['run', '--extra', 'docs', 'pdoc', '-o', outDir, 'dungeonbreak_narrative'],
  { cwd: root, stdio: 'inherit', shell: isWin }
);
if (pdoc.status !== 0) process.exit(pdoc.status ?? 1);

console.log('Python API docs written to %s', outDir);
