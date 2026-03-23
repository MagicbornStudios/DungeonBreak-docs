import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./test-reports/unit-coverage",
      /**
       * Limit the HTML/JSON report to code we mean to cover with *unit* tests.
       * Without this, Vitest lists every file pulled into the graph (e.g. app
       * shells, AI UI) as 0% and the headline % looks worse than “library logic”
       * coverage. Playwright and app UX stay out of this report by design.
       */
      include: [
        "lib/**/*.{ts,tsx}",
        "app/api/**/*.{ts,tsx}",
        "components/reports/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.config.*",
        "**/*.d.ts",
        "**/payload-types.ts",
        "**/next-env.d.ts",
        "**/.source/**",
      ],
    },
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    /**
     * Do not write JSON here — any `vitest run` (including a single file) would
     * overwrite `test-reports/unit/results.json` and break the static review hub.
     * Use `pnpm test:unit:report` for the JSON snapshot the review site consumes.
     */
    reporters: ["default"],
  },
});
