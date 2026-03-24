import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  build as esbuildBuild,
  type BuildOptions,
  context,
  type Plugin,
} from "esbuild";
import { POKESPRITE_SLOT_PLACEHOLDERS } from "../src/pokesprite-inventory";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "dist");
const bundlePath = join(outDir, "game.js");
const workerBundlePath = join(outDir, "engine-turn-worker.js");
const externalHtmlPath = join(outDir, "index.html");
const standaloneHtmlPath = join(outDir, "dungeonbreak-kaplay-standalone.html");
const contentPackBundleOutPath = join(outDir, "content-pack.bundle.v1.json");
const publicGameDir = join(root, "..", "..", "docs-site", "public", "game");
const engineRoot = join(root, "..", "engine");
const workspaceRoot = join(root, "..", "..");
const pokespriteVendorRoot = join(workspaceRoot, "vendor", "pokesprite");
const fontOutDir = join(outDir, "fonts");
const uiFontSourcePath = join(
  workspaceRoot,
  "node_modules",
  ".pnpm",
  "@fontsource+montserrat@5.2.8",
  "node_modules",
  "@fontsource",
  "montserrat",
  "files",
  "montserrat-latin-600-normal.woff2"
);
const uiFontOutPath = join(fontOutDir, "montserrat-semibold.woff2");

const watch = process.argv.includes("--watch");

function copyToPublicGame() {
  const docsSiteRoot = join(root, "..", "..", "docs-site");
  if (!(existsSync(outDir) && existsSync(docsSiteRoot))) {
    return;
  }
  rmSync(publicGameDir, { force: true, recursive: true });
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
    @font-face {
      font-family: "Montserrat";
      src: url("./fonts/montserrat-semibold.woff2") format("woff2");
      font-weight: 600;
      font-style: normal;
      font-display: swap;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      color: #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: "Montserrat", "Segoe UI", sans-serif;
    }
    canvas { display: block; }
  </style>
</head>
<body>
${scriptTag}
</body>
</html>`;
}

function copyUiFonts() {
  mkdirSync(fontOutDir, { recursive: true });
  cpSync(uiFontSourcePath, uiFontOutPath, { force: true });
}

function copyInventoryPlaceholders() {
  for (const placeholder of Object.values(POKESPRITE_SLOT_PLACEHOLDERS)) {
    const sourcePath = join(pokespriteVendorRoot, placeholder.vendorPath);
    const outputPath = join(outDir, placeholder.publicPath);
    mkdirSync(dirname(outputPath), { recursive: true });
    cpSync(sourcePath, outputPath, { force: true });
  }
}

function writeExternalHtml() {
  writeFileSync(
    externalHtmlPath,
    shellHtml('  <script src="game.js"></script>'),
    "utf8"
  );
}

function writeStandaloneHtml() {
  if (!existsSync(bundlePath)) {
    return;
  }
  const bundle = readFileSync(bundlePath, "utf8")
    .replace(/\/\/# sourceMappingURL=.*$/gm, "")
    .replace(/<\/script/gi, "<\\/script");
  const html = shellHtml(`  <script>${bundle}</script>`);
  writeFileSync(standaloneHtmlPath, html, "utf8");
}

function buildContentPackBundle() {
  const nodeCmd = process.platform === "win32" ? "node.exe" : "node";
  const result = spawnSync(
    nodeCmd,
    [
      join(engineRoot, "scripts", "build-content-pack-bundle.mjs"),
      contentPackBundleOutPath,
    ],
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    throw new Error(
      `content-pack bundle build failed with exit code ${String(result.status ?? 1)}`
    );
  }
}

const postBuildPlugin: Plugin = {
  name: "kaplay-post-build",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        return;
      }
      copyUiFonts();
      copyInventoryPlaceholders();
      buildContentPackBundle();
      writeExternalHtml();
      writeStandaloneHtml();
      copyToPublicGame();
    });
  },
};

async function buildStandalone() {
  rmSync(outDir, { force: true, recursive: true });
  mkdirSync(outDir, { recursive: true });

  const opts: BuildOptions = {
    entryNames: "[name]",
    entryPoints: {
      game: join(root, "src/main.ts"),
      "engine-turn-worker": join(root, "src/engine-turn-worker.ts"),
    },
    bundle: true,
    format: "iife",
    target: ["es2020"],
    outdir: outDir,
    define: { "process.env.NODE_ENV": '"production"' },
    minify: !watch,
    sourcemap: watch,
    plugins: [postBuildPlugin],
  };

  if (watch) {
    const ctx = await context(opts);
    await ctx.watch();
    console.log("[kaplay] watching - updates dist and docs-site/public/game");
    return;
  }

  await esbuildBuild(opts);
  console.log(
    `[kaplay] built ${bundlePath}, ${workerBundlePath}, ${externalHtmlPath}, ${standaloneHtmlPath}`
  );
}

buildStandalone().catch((error) => {
  console.error(error);
  process.exit(1);
});
