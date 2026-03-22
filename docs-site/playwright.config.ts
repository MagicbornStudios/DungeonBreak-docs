import { defineConfig } from "@playwright/test";

const port = 3100;

export default defineConfig({
  fullyParallel: false,
  outputDir: "./test-reports/e2e/artifacts",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "./test-reports/e2e/html" }],
    ["json", { outputFile: "./test-reports/e2e/results.json" }],
  ],
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests/e2e",
  timeout: 90_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm run start:test",
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
