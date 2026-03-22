import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const DEFAULT_PORT_RANGE = { start: 3001, end: 3012 };
const VIEWPORT = { width: 1000, height: 760 };
const CAPTURE_SCENES = [
  { file: "01-navigation", commandLabel: null, expectedOverlay: null },
  { file: "02-bag", commandLabel: "Bag", expectedOverlay: "bag" },
  { file: "03-journal", commandLabel: "Journal", expectedOverlay: "journal" },
  { file: "04-spellbook", commandLabel: "Spellbook", expectedOverlay: "spellbook" },
  { file: "05-stats", commandLabel: "Stats", expectedOverlay: "stats" },
  { file: "06-equipped", commandLabel: "Equipped", expectedOverlay: "equipped" },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outputDir = join(root, "test-reports", "kaplay-ui-captures");

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

function readDebugButtons(page) {
  return page.evaluate(() => window.__KAPLAY_DEBUG_BUTTONS__ ?? []);
}

function readDebugEvents(page) {
  return page.evaluate(() => window.__KAPLAY_DEBUG_EVENTS__ ?? []);
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

async function clickCanvas(page, rect, point) {
  await page.mouse.click(rect.x + point.x, rect.y + point.y);
  await page.waitForTimeout(350);
}

async function clickButton(page, rect, label) {
  const buttons = await readDebugButtons(page);
  const button = [...buttons].reverse().find((entry) => entry.label === label);
  if (!button) {
    throw new Error(`Button ${label} was not found in the canvas debug registry.`);
  }
  return clickCanvas(page, rect, {
    x: button.x + button.width / 2,
    y: button.y + button.height / 2,
  });
}

async function waitForButton(page, label, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const buttons = await readDebugButtons(page);
    if (buttons.some((entry) => entry.label === label)) {
      return true;
    }
    await page.waitForTimeout(150);
  }
  return false;
}

async function waitForOverlayEvent(page, previousEventCount, expectedOverlay) {
  const started = Date.now();
  while (Date.now() - started < 4000) {
    const events = await readDebugEvents(page);
    const recent = events.slice(previousEventCount);
    if (
      recent.some((entry) => {
        return (
          entry.scope === "nav" &&
          entry.event === "overlay-toggle" &&
          entry.detail?.to === expectedOverlay
        );
      })
    ) {
      return;
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Overlay ${expectedOverlay} did not emit the expected debug event.`);
}

async function main() {
  const url = await detectUrl();
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--use-angle=swiftshader",
      "--use-gl=swiftshader",
    ],
  });
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
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
  await page.waitForTimeout(500);

  const manifest = {
    schemaVersion: "kaplay-ui-captures.v1",
    capturedAt: new Date().toISOString(),
    url,
    viewport: VIEWPORT,
    scenes: [],
  };

  for (const scene of CAPTURE_SCENES) {
    if (scene.commandLabel) {
      const beforeEvents = await readDebugEvents(page);
      await clickButton(page, rect, "[Tab/Start] Menus");
      await clickButton(page, rect, scene.commandLabel);
      await waitForOverlayEvent(page, beforeEvents.length, scene.expectedOverlay);
      await page.waitForTimeout(300);
    }

    const buttons = await readDebugButtons(page);
    const events = await readDebugEvents(page);
    const fileName = `${scene.file}.png`;
    await page.screenshot({ path: join(outputDir, fileName) });
    manifest.scenes.push({
      file: fileName,
      commandLabel: scene.commandLabel,
      expectedOverlay: scene.expectedOverlay,
      buttonLabels: buttons.map((entry) => entry.label),
      debugTail: events.slice(-10),
    });

    if (scene.commandLabel) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
    }
  }

  writeFileSync(join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await browser.close();

  console.log(`KAPLAY UI captures written: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
