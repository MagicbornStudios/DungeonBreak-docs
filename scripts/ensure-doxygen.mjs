#!/usr/bin/env node
/**
 * Ensure Doxygen is available: use PATH if present, else download a portable binary into .tools.
 * When run as main, prints the path to the doxygen binary to stdout (and writes .tools/doxygen-path.txt).
 * Run from repo root: node scripts/ensure-doxygen.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const isWin = process.platform === 'win32';
const VERSION = '1.16.1';
const RELEASE_TAG = 'Release_1_16_1';
const BASE_URL = `https://github.com/doxygen/doxygen/releases/download/${RELEASE_TAG}`;
const TOOLS_DIR = join(root, '.tools');
const DOXYGEN_DIR = join(TOOLS_DIR, `doxygen-${VERSION}`);
const PATH_FILE = join(TOOLS_DIR, 'doxygen-path.txt');

function getAsset() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === 'win32' && (arch === 'x64' || arch === 'ia32')) {
    return { url: `${BASE_URL}/doxygen-${VERSION}.windows.x64.bin.zip`, isZip: true };
  }
  if (platform === 'darwin') {
    return { url: `${BASE_URL}/doxygen-${VERSION}-mac-${arch === 'arm64' ? 'arm' : 'intel'}.zip`, isZip: true };
  }
  if (platform === 'linux' && arch === 'x64') {
    return { url: `${BASE_URL}/doxygen-${VERSION}.linux.bin.tar.gz`, isZip: false };
  }
  return null;
}

function findOnPath() {
  const cmd = isWin ? 'where' : 'which';
  const r = spawnSync(cmd, ['doxygen'], { encoding: 'utf8', shell: isWin });
  if (r.status !== 0 || !r.stdout) return null;
  const line = r.stdout.split(/[\r\n]+/)[0]?.trim();
  return line || null;
}

function checkDoxygenVersion(binPath) {
  const r = spawnSync(binPath, ['--version'], { encoding: 'utf8', shell: isWin });
  return r.status === 0;
}

function findBinaryInDir(dir) {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      const found = findBinaryInDir(full);
      if (found) return found;
    } else if (e.isFile() && (e.name === 'doxygen' || e.name === 'doxygen.exe')) {
      return full;
    }
  }
  return null;
}

async function download(url) {
  mkdirSync(TOOLS_DIR, { recursive: true });
  const archivePath = join(TOOLS_DIR, url.split('/').pop());
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = await res.arrayBuffer();
  writeFileSync(archivePath, Buffer.from(buf));
  return archivePath;
}

function unpack(archivePath, isZip) {
  const dest = join(TOOLS_DIR, `doxygen-${VERSION}`);
  if (existsSync(dest)) return dest;
  mkdirSync(dest, { recursive: true });

  if (isWin && isZip) {
    const ps = `Expand-Archive -Path '${archivePath.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`;
    const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { cwd: root, shell: false });
    if (r.status !== 0) throw new Error('Failed to unzip Doxygen (PowerShell Expand-Archive)');
  } else if (!isWin && isZip) {
    const r = spawnSync('unzip', ['-o', '-q', archivePath, '-d', dest], { cwd: root });
    if (r.status !== 0) throw new Error('Failed to unzip Doxygen (unzip)');
  } else {
    const r = spawnSync('tar', ['xzf', archivePath, '-C', dest], { cwd: root });
    if (r.status !== 0) throw new Error('Failed to extract Doxygen (tar)');
  }

  return dest;
}

async function main() {
  try {
    let path = findOnPath();
    if (path && checkDoxygenVersion(path)) {
      mkdirSync(TOOLS_DIR, { recursive: true });
      writeFileSync(PATH_FILE, path, 'utf8');
      console.log(path);
      return;
    }

    path = findBinaryInDir(DOXYGEN_DIR);
    if (path && checkDoxygenVersion(path)) {
      writeFileSync(PATH_FILE, path, 'utf8');
      console.log(path);
      return;
    }

    const asset = getAsset();
    if (!asset) {
      console.error('No portable Doxygen for this platform. Install Doxygen and add to PATH.');
      process.exit(1);
    }

    console.log('Installing Doxygen (portable)...');
    const archivePath = await download(asset.url);
    const extractDir = unpack(archivePath, asset.isZip);
    const bin = findBinaryInDir(extractDir);
    if (!bin || !checkDoxygenVersion(bin)) {
      console.error('Doxygen install failed: binary not found or invalid.');
      process.exit(1);
    }

    mkdirSync(TOOLS_DIR, { recursive: true });
    writeFileSync(PATH_FILE, bin, 'utf8');
    console.log(bin);
  } catch (err) {
    console.error('ensure-doxygen:', err.message);
    process.exit(1);
  }
}

const isMain = process.argv[1]?.includes('ensure-doxygen.mjs');
if (isMain) {
  main();
}
