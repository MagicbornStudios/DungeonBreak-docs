import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "dist");
const bundlePath = join(outDir, "game.js");
const externalHtmlPath = join(outDir, "index.html");
const standaloneHtmlPath = join(outDir, "dungeonbreak-kaplay-standalone.html");
const contentPackBundleOutPath = join(outDir, "content-pack.bundle.v1.json");
const publicGameDir = join(root, "..", "..", "docs-site", "public", "game");
const engineRoot = join(root, "..", "engine");

const watch = process.argv.includes("--watch");

function copyToPublicGame() {
  const docsSiteRoot = join(root, "..", "..", "docs-site");
  if (!existsSync(outDir) || !existsSync(docsSiteRoot)) {
    return;
  }
  mkdirSync(publicGameDir, { recursive: true });
  cpSync(outDir, publicGameDir, { recursive: true, force: true });
  console.log("[kaplay] copied dist -> docs-site/public/game");
}

function shellHtml(scriptTag: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Escape the Dungeon (KAPLAY)</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: Consolas, "JetBrains Mono", Menlo, monospace;
    }
    canvas { display: block; }
  </style>
</head>
<body>
${scriptTag}
</body>
</html>`;
}

function writeExternalHtml() {
  writeFileSync(externalHtmlPath, shellHtml("  <script src=\"game.js\"></script>"), "utf8");
}

function writeStandaloneHtml() {
  if (!existsSync(bundlePath)) {
    return;
  }
  const bundle = readFileSync(bundlePath, "utf8")
    .replace(/\/\/\# sourceMappingURL=.*$/gm, "")
    .replace(/<\/script/gi, "<\\/script");
  const html = shellHtml(`  <script>${bundle}</script>`);
  writeFileSync(standaloneHtmlPath, html, "utf8");
}

function buildContentPackBundle() {
  const nodeCmd = process.platform === "win32" ? "node.exe" : "node";
  const result = spawnSync(
    nodeCmd,
    [join(engineRoot, "scripts", "build-content-pack-bundle.mjs"), contentPackBundleOutPath],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`content-pack bundle build failed with exit code ${String(result.status ?? 1)}`);
  }
}

const postBuildPlugin: esbuild.Plugin = {
  name: "kaplay-post-build",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        return;
      }
      buildContentPackBundle();
      writeExternalHtml();
      writeStandaloneHtml();
      copyToPublicGame();
    });
  },
};

async function build() {
  mkdirSync(outDir, { recursive: true });

  const opts: esbuild.BuildOptions = {
    entryPoints: [join(root, "src/main.ts")],
    bundle: true,
    format: "iife",
    target: ["es2020"],
    outfile: bundlePath,
    define: { "process.env.NODE_ENV": '"production"' },
    minify: !watch,
    sourcemap: watch,
    plugins: [postBuildPlugin],
  };

  if (watch) {
    const ctx = await esbuild.context(opts);
    await ctx.watch();
    console.log("[kaplay] watching - updates dist and docs-site/public/game");
    return;
  }

  await esbuild.build(opts);
  console.log("[kaplay] built dist/game.js, dist/index.html, dist/dungeonbreak-kaplay-standalone.html");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
