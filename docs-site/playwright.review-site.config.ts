import { defineConfig } from "@playwright/test";

const port = 3210;

export default defineConfig({
  fullyParallel: false,
  outputDir: "./test-reports/e2e-review-site/artifacts",
  reporter: [
    ["list"],
    [
      "html",
      { open: "never", outputFolder: "./test-reports/e2e-review-site/html" },
    ],
    ["json", { outputFile: "./test-reports/e2e-review-site/results.json" }],
  ],
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests/e2e-review-site",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm run review-site:build && cross-env REVIEW_SITE_PORT=3210 tsx scripts/serve-static-review-site.ts",
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
