#!/usr/bin/env node
/**
 * Download RepoPlanner release assets from GitHub into .plannerbuilds/
 * Usage: node scripts/download-replanner-releases.mjs [--tag v0.2.0]
 */
import fs from "node:fs";
import path from "node:path";

const REPO = "MagicbornStudios/RepoPlanner";
const API_BASE = `https://api.github.com/repos/${REPO}/releases`;

function parseArgs() {
  const args = process.argv.slice(2);
  let tag = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tag" && args[i + 1]) {
      tag = args[i + 1];
      break;
    }
  }
  return { tag };
}

async function fetchRelease(tag) {
  const url = tag
    ? `${API_BASE}/tags/${encodeURIComponent(tag)}`
    : `${API_BASE}/latest`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "RepoPlanner-Download" },
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "No RepoPlanner release found; push a tag to vendor/repo-planner and create a release first."
      );
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function downloadAsset(url, destPath) {
  const res = await fetch(url, {
    headers: { Accept: "application/octet-stream", "User-Agent": "RepoPlanner-Download" },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

async function main() {
  const { tag } = parseArgs();
  const releasesDir = path.join(process.cwd(), ".releases");

  let release;
  try {
    release = await fetchRelease(tag);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const assets = release.assets || [];
  if (assets.length === 0) {
    console.warn("Release has no assets.");
    process.exit(0);
  }

  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }

  for (const asset of assets) {
    const destPath = path.join(releasesDir, asset.name);
    await downloadAsset(asset.browser_download_url, destPath);
    console.log("Downloaded .plannerbuilds/" + asset.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
