import { expect, test, type Page } from "@playwright/test";

const sendCommand = async (command: string, page: Page) => {
  await page.waitForFunction(() => {
    return typeof (window as Window & { __escapeDungeonRunCommand?: unknown }).__escapeDungeonRunCommand === "function";
  });
  await page.evaluate(async (nextCommand) => {
    const runner = (window as Window & { __escapeDungeonRunCommand?: (command: string) => Promise<void> })
      .__escapeDungeonRunCommand;
    if (!runner) {
      throw new Error("run command bridge missing");
    }
    await runner(nextCommand);
  }, command);
};

test("play route loads terminal and accepts commands with persistence", async ({ page }) => {
  await page.goto("/play");

  await expect(page.getByRole("heading", { level: 1, name: "Escape the Dungeon" })).toBeVisible();
  await expect(page.getByTestId("play-last-output")).toContainText("Available actions:", { timeout: 30_000 });

  await sendCommand("help", page);
  await expect(page.getByTestId("play-last-output")).toContainText("clear");

  await sendCommand("look", page);
  await expect(page.getByTestId("play-last-output")).toContainText("Available actions:");

  await sendCommand("save smoke", page);
  await expect(page.getByTestId("play-last-output")).toContainText("Saved slot 'smoke'");

  await page.reload();
  await expect(page.getByTestId("play-last-output")).toContainText("Available actions:", { timeout: 30_000 });
  await expect(page.getByText("Loaded slot 'Auto Save' from autosave.")).toBeVisible();
});
