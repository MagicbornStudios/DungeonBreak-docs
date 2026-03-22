import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./test-reports/unit-coverage",
    },
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    reporters: ["default", "json"],
    outputFile: {
      json: "./test-reports/unit/results.json",
    },
  },
});
