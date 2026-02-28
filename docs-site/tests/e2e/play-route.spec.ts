import { expect, test } from "@playwright/test";

test("play route supports clickable gameplay with persistence", async ({ page }) => {
  await page.goto("/play");

  await expect(page.getByRole("heading", { level: 1, name: "Escape the Dungeon" })).toBeVisible();
  await expect(page.getByTestId("play-game-shell")).toBeVisible();

  await page.getByTestId("action-look-around").click();
  await expect(page.getByTestId("feed-last-message")).toContainText("Available actions:");

  const beforeLocation = await page.getByTestId("status-location").innerText();
  const firstMove = page.locator("button[data-testid^='action-move']").first();
  await firstMove.click();
  await expect.poll(async () => page.getByTestId("status-location").innerText()).not.toBe(beforeLocation);

  await page.getByRole("button", { name: /^stream$/i }).click();
  await expect(page.getByTestId("cutscene-modal")).toBeVisible();
  await expect(page.getByTestId("cutscene-text")).toContainText("audience count");
  await page.getByTestId("cutscene-dismiss").click();
  await expect(page.getByTestId("cutscene-modal")).toBeHidden();

  const murderButton = page.locator("button[data-testid^='action-murder']").first();
  await expect(murderButton).toBeDisabled();
  await expect(page.locator("[data-testid^='action-murder'][data-testid$='-blocked']").first()).toBeVisible();

  const persistedLocation = await page.getByTestId("status-location").innerText();
  await page.reload();

  await expect(page.getByText("Loaded 'Auto Save' from autosave.")).toBeVisible();
  await expect(page.getByTestId("status-location")).toHaveText(persistedLocation);
});

test("play route degrades cleanly without assistant frame host", async ({ page }) => {
  await page.goto("/play");

  await expect(page.getByTestId("play-game-shell")).toBeVisible();
  await page.getByTestId("action-look-around").click();
  await expect(page.getByTestId("feed-last-message")).toContainText("Available actions:");
});
