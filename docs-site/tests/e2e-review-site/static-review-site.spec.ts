import { expect, test } from "@playwright/test";

test("static review site exposes latest game and test surfaces", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "DungeonBreak review hub",
    })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Launch standalone game" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Test review" })).toBeVisible();
});

test("static review site test page links to coverage and game artifacts", async ({
  page,
}) => {
  await page.goto("/tests/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Test Review" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Coverage HTML" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Launch Standalone Game" })
  ).toBeVisible();
  await expect(page.getByText("Vitest Summary")).toBeVisible();
});
