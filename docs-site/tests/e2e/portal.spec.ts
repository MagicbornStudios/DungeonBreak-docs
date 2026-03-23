import { expect, test } from "@playwright/test";

test("marketing landing page routes into the portal", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("DungeonBreak Portal")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Enter Internal Portal" })
  ).toBeVisible();
  await expect(page.getByText("Hosted AI")).toBeVisible();
});

test("asset explorer route redirects unauthenticated users into portal access", async ({
  page,
}) => {
  await page.goto("/dungeonbreak-content-app/asset-explorer");

  await expect(page).toHaveURL(/\/portal-access\?/);
  await expect(page.getByText("Internal Portal Access")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enter Asset Explorer" })
  ).toBeVisible();
});
