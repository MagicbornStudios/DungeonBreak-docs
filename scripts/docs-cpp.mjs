#!/usr/bin/env node
/**
 * Generate C++ API docs with Doxygen. Uses Doxygen from PATH or from ensure-doxygen (.tools).
 * Run from repo root: npm run docs:cpp
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const isWin = process.platform === 'win32';
const PATH_FILE = join(root, '.tools', 'doxygen-path.txt');

function getDoxygenPath() {
  if (existsSync(PATH_FILE)) {
    return readFileSync(PATH_FILE, 'utf8').trim();
  }
  const r = spawnSync('node', [join(root, 'scripts', 'ensure-doxygen.mjs')], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  if (r.status !== 0 || !r.stdout) return null;
  return r.stdout.trim().split(/[\r\n]+/).pop() || null;
}

const doxygenBin = getDoxygenPath();
if (!doxygenBin) {
  console.warn('C++ API docs skipped (Doxygen not available).');
  process.exit(0);
}

const result = spawnSync(doxygenBin, ['Doxyfile'], {
  cwd: root,
  stdio: 'inherit',
  shell: isWin,
});
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log('C++ API docs written to docs/api/cpp/');
