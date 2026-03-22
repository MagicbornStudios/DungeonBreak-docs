import { expect, test } from "@playwright/test";

test("test review page renders the review shell", async ({ page }) => {
  await page.goto("/dungeonbreak-content-app/tests");

  await expect(
    page.getByRole("heading", { level: 1, name: "Unit Test Review" })
  ).toBeVisible();
  await expect(page.getByText("Total Tests")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Asset Explorer/i })
  ).toBeVisible();
});
