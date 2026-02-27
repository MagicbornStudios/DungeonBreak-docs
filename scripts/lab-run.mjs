#!/usr/bin/env node
/**
 * One-command lab: lab-install, docs:python, docs:generate, start docs site (background), then Jupyter Lab (notebooks only).
 * Run from repo root: npm run lab
 */
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const isWin = process.platform === 'win32';
const venvJupyter = join(root, '.venv', isWin ? 'Scripts\\jupyter.exe' : 'bin/jupyter');

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run('node', [join(root, 'scripts', 'lab-install.mjs')]);
run('node', [join(root, 'scripts', 'docs-python.mjs')]);
const docsGenerate = spawnSync('node', [join(root, 'scripts', 'docs-generate-mdx.mjs')], { stdio: 'inherit', cwd: root });
if (docsGenerate.status !== 0) {
  console.warn('docs:generate failed; continuing.');
}
// Regenerate .source so file-based API docs are in the sidebar
const docsSite = join(root, 'docs-site');
spawnSync(isWin ? 'pnpm.cmd' : 'pnpm', ['exec', 'fumadocs-mdx'], { cwd: docsSite, stdio: 'pipe' });

// Start docs site in background
spawn('node', [join(root, 'scripts', 'docs-serve.mjs')], { stdio: 'inherit', cwd: root, detached: true }).unref();

// Lab: notebooks only
const child = spawn(venvJupyter, ['lab', '--notebook-dir', join(root, 'notebooks')], {
  stdio: 'inherit',
  cwd: root,
  shell: isWin,
});
child.on('close', (code) => process.exit(code ?? 0));
