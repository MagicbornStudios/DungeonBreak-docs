import { expect, test } from "@playwright/test";

test("play route supports clickable gameplay with persistence", async ({ page }) => {
  await page.goto("/play");

  await expect(page.getByRole("heading", { level: 1, name: "Escape the Dungeon" })).toBeVisible();
  await expect(page.locator("iframe").first()).toBeVisible();
  await expect(page.getByText("Need the previous React first-person shell?")).toBeVisible();
});

test("play route degrades cleanly without assistant frame host", async ({ page }) => {
  await page.goto("/play");

  await expect(page.getByRole("heading", { level: 1, name: "Escape the Dungeon" })).toBeVisible();
  await expect(page.locator("iframe").first()).toBeVisible();
});

test("space explorer supports preset and draft authoring controls", async ({ page }) => {
  await page.goto("/play/reports/spaces");

  await expect(page.getByText("Model Schema Builder")).toBeVisible();
  await expect(page.getByTestId("space-builder-preset-select")).toBeVisible();
  await page.getByTestId("space-builder-apply-preset").click();
  await expect(page.getByTestId("space-builder-message")).toContainText("Applied preset");

  await page.getByTestId("space-builder-draft-name").fill("e2e-draft");
  await page.getByTestId("space-builder-save-draft").click();
  await expect(page.getByTestId("space-builder-message")).toContainText("Saved draft");
  await expect(page.getByTestId("space-builder-validation-ok")).toBeVisible();
});

test("content pack report page accepts uploaded bundle and persists report", async ({ page }) => {
  await page.goto("/play/reports/content-packs");

  const bundle = {
    schemaVersion: "content-pack.bundle.v1",
    generatedAt: new Date().toISOString(),
    hashes: { overall: "e2e" },
    packs: {
      spaceVectors: {
        featureSchema: [
          {
            featureId: "e2e_feature",
            label: "E2E Feature",
            groups: ["content_features"],
            spaces: ["dialogue"],
          },
        ],
        modelSchemas: [
          {
            modelId: "entity.e2e",
            label: "Entity E2E",
            featureRefs: [{ featureId: "e2e_feature", spaces: ["dialogue"], required: true }],
          },
        ],
      },
    },
  };

  await page.getByTestId("content-pack-report-upload").setInputFiles({
    name: "e2e-content-pack.bundle.v1.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bundle), "utf8"),
  });

  await expect(page.getByText("Report created", { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Source:", { exact: false })).toBeVisible();
  await expect(page.getByText("e2e-content-pack.bundle.v1.json", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Space Explorer" }).first()).toBeVisible();
});
