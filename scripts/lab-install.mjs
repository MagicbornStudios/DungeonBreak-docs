#!/usr/bin/env node
/**
 * Ensure uv is available (install if missing), then create .venv and install lab deps.
 * Run from repo root: node scripts/lab-install.mjs
 * All notebook deps come from pyproject.toml; we run "uv sync" so adding a dep there is enough.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const isWin = process.platform === 'win32';
const venvPython = join(root, '.venv', isWin ? 'Scripts\\python.exe' : 'bin/python');

function uvEnv() {
  const pathSep = isWin ? ';' : ':';
  return { ...process.env, PATH: `${getUvPath()}${pathSep}${process.env.PATH || ''}` };
}

function hasUv() {
  const r = spawnSync('uv', ['--version'], { encoding: 'utf8', shell: isWin, env: uvEnv() });
  return r.status === 0;
}

function getUvPath() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  if (isWin) return join(home, '.local', 'bin');
  return join(home, '.local', 'bin');
}

function installUv() {
  console.log('Installing uv (Python package manager)...');
  if (isWin) {
    // Use shell: false so cmd.exe does not parse "| iex"; PowerShell receives the full command.
    const psCmd = "irm https://astral.sh/uv/install.ps1 | iex";
    const r = spawnSync(
      'powershell',
      ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command', psCmd],
      { stdio: 'inherit', cwd: root, shell: false }
    );
    if (r.status !== 0) throw new Error('uv install failed (Windows). Install manually: https://docs.astral.sh/uv/getting-started/installation/');
  } else {
    const r = spawnSync('sh', ['-c', 'curl -LsSf https://astral.sh/uv/install.sh | sh'], {
      stdio: 'inherit',
      cwd: root,
      env: { ...process.env, UV_NO_MODIFY_PATH: '1' },
    });
    if (r.status !== 0) throw new Error('uv install failed (Unix). Install manually: https://docs.astral.sh/uv/getting-started/installation/');
  }
}

function runUv(args, opts = {}) {
  const r = spawnSync('uv', args, { stdio: 'inherit', cwd: root, shell: isWin, env: uvEnv(), ...opts });
  if (r.status !== 0) throw new Error(`uv ${args.join(' ')} failed`);
}

function main() {
  if (!hasUv()) {
    installUv();
    if (!hasUv()) {
      const pathEnv = getUvPath();
      console.error('uv was installed but is not on PATH. Add to PATH and run again:');
      console.error('  ', pathEnv);
      console.error('Or run: npm run lab');
      process.exit(1);
    }
  }

  if (!existsSync(venvPython)) {
    console.log('Ensuring Python 3.12...');
    runUv(['python', 'install', '3.12']);
    console.log('Creating .venv...');
    runUv(['venv', '.venv', '--python', '3.12']);
  }

  console.log('Syncing dependencies from pyproject.toml...');
  runUv(['sync']);

  console.log('Ensuring Doxygen (for C++ API docs)...');
  const ensureDoxygen = spawnSync('node', [join(root, 'scripts', 'ensure-doxygen.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });
  if (ensureDoxygen.status !== 0) {
    console.warn('Doxygen not available; C++ API docs will be skipped. Install Doxygen or use a supported platform.');
  }

  const docsSite = join(root, 'docs-site');
  if (existsSync(join(docsSite, 'package.json'))) {
    console.log('Installing docs-site dependencies (Next.js, Fumadocs, etc.)...');
    const pnpm = isWin ? 'pnpm.cmd' : 'pnpm';
    const install = spawnSync(pnpm, ['install', '--no-frozen-lockfile'], {
      cwd: docsSite,
      stdio: 'inherit',
      shell: isWin,
    });
    if (install.status !== 0) {
      console.warn('docs-site install failed; docs:serve and npm run lab may fail. Run: cd docs-site && pnpm install');
    }
  }

  console.log('Done. Run: npm run lab');
}

main();
