import { chromium } from "playwright";

const DEFAULT_PORT_RANGE = { start: 3001, end: 3012 };
const VIEWPORT = { width: 1000, height: 760 };
const COMMAND_CLICKS = [
  { commandLabel: "Bag", expected: "bag" },
  { commandLabel: "Journal", expected: "journal" },
  { commandLabel: "Spellbook", expected: "spellbook" },
  { commandLabel: "Stats", expected: "stats" },
  { commandLabel: "Equipped", expected: "equipped" },
];

async function detectUrl() {
  if (process.env.KAPLAY_URL) {
    return process.env.KAPLAY_URL;
  }
  for (
    let port = DEFAULT_PORT_RANGE.start;
    port <= DEFAULT_PORT_RANGE.end;
    port += 1
  ) {
    const url = `http://127.0.0.1:${String(port)}/`;
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(1500),
      });
      if (response.ok) {
        return url;
      }
    } catch {
      /* keep scanning */
    }
  }
  throw new Error("Could not find a running standalone KAPLAY server.");
}

function readDebugEvents(page) {
  return page.evaluate(() => {
    return window.__KAPLAY_DEBUG_EVENTS__ ?? [];
  });
}

function readDebugButtons(page) {
  return page.evaluate(() => {
    return window.__KAPLAY_DEBUG_BUTTONS__ ?? [];
  });
}

async function readCanvasRect(page) {
  const rect = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      return null;
    }
    const bounds = canvas.getBoundingClientRect();
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  });
  if (!rect) {
    throw new Error("Canvas was not found.");
  }
  return rect;
}

async function clickCanvas(page, rect, point, label) {
  const x = rect.x + point.x;
  const y = rect.y + point.y;
  console.log(`[smoke] click ${label} @ (${String(x)}, ${String(y)})`);
  await page.mouse.click(x, y);
  await page.waitForTimeout(500);
}

async function clickButton(page, rect, label) {
  const buttons = await readDebugButtons(page);
  const button = [...buttons].reverse().find((entry) => entry.label === label);
  if (!button) {
    throw new Error(
      `Button ${label} was not found in the canvas debug registry.`
    );
  }
  return clickCanvas(
    page,
    rect,
    {
      x: button.x + button.width / 2,
      y: button.y + button.height / 2,
    },
    label
  );
}

async function hasButton(page, label) {
  const buttons = await readDebugButtons(page);
  return buttons.some((entry) => entry.label === label);
}

async function waitForButton(page, label, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await hasButton(page, label)) {
      return true;
    }
    await page.waitForTimeout(150);
  }
  return false;
}

async function main() {
  const url = await detectUrl();
  console.log(`[smoke] using ${url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const pageErrors = [];
  const consoleErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(url, { waitUntil: "load", timeout: 20_000 });
  await page.waitForTimeout(1000);

  const rect = await readCanvasRect(page);
  await clickButton(page, rect, "New Game");

  if (await waitForButton(page, "Continue", 1500)) {
    await clickButton(page, rect, "Continue");
  } else {
    await page.keyboard.press("Enter");
  }

  await waitForButton(page, "[Tab/Start] Menus", 6000);
  await page.waitForTimeout(400);

  for (const command of COMMAND_CLICKS) {
    const beforeEvents = await readDebugEvents(page);
    await clickButton(page, rect, "[Tab/Start] Menus");
    await clickButton(page, rect, command.commandLabel);
    const afterEvents = await readDebugEvents(page);
    const recentEvents = afterEvents.slice(beforeEvents.length);
    const matched = recentEvents.some((entry) => {
      return (
        entry.scope === "nav" &&
        entry.event === "overlay-toggle" &&
        entry.detail?.to === command.expected
      );
    });
    console.log(
      `[smoke] ${command.expected} events=${String(recentEvents.length)} matched=${String(matched)}`
    );
    if (!matched) {
      throw new Error(
        `Command ${command.expected} did not emit the expected overlay-toggle event.`
      );
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }

  const debugTail = await readDebugEvents(page);
  await browser.close();

  if (pageErrors.length > 0 || consoleErrors.length > 0) {
    console.log(
      "[smoke] debug tail",
      JSON.stringify(debugTail.slice(-12), null, 2)
    );
    throw new Error(
      `UI smoke failed with ${String(pageErrors.length)} page errors and ${String(consoleErrors.length)} console errors.`
    );
  }

  console.log(
    "[smoke] debug tail",
    JSON.stringify(debugTail.slice(-12), null, 2)
  );
  console.log("[smoke] ui smoke passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
