import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const docsSiteRoot = path.resolve(pkgRoot, "../../docs-site");
const staticReviewOut = path.resolve(docsSiteRoot, "static-review-site");

export default defineConfig({
  site: undefined,
  base: "./",
  outDir: staticReviewOut,
  trailingSlash: "always",
  integrations: [react()],
  build: {
    format: "directory",
  },
  vite: {
    base: "./",
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        { find: /^@docs\//, replacement: `${docsSiteRoot}/` },
        { find: /^@\//, replacement: `${path.join(pkgRoot, "src")}/` },
      ],
    },
    build: {
      emptyOutDir: false,
    },
  },
});
