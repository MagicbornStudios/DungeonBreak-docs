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

function readBoardSnapshot(page) {
  return page.evaluate(() => {
    return window.__KAPLAY_DEBUG_BOARD__ ?? null;
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

async function hasButtonMatching(page, matcher) {
  const buttons = await readDebugButtons(page);
  return buttons.some((entry) => matcher(entry.label));
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

async function advanceIntoNavigation(page, rect, timeoutMs = 20_000) {
  const started = Date.now();
  let lastButtons = [];
  while (Date.now() - started < timeoutMs) {
    if (await hasButton(page, "[Tab/Start] Menus")) {
      return;
    }
    const buttons = await readDebugButtons(page);
    lastButtons = buttons;
    const hasNewGame = buttons.some((entry) => entry.label === "New Game");
    const continueButton = [...buttons].reverse().find((entry) => {
      return entry.label === "Continue";
    });
    if (continueButton) {
      if (hasNewGame) {
        await clickButton(page, rect, "New Game");
      } else {
        await clickCanvas(
          page,
          rect,
          {
            x: continueButton.x + continueButton.width / 2,
            y: continueButton.y + continueButton.height / 2,
          },
          "Continue"
        );
      }
      await page.waitForTimeout(800);
      continue;
    }
    await page.waitForTimeout(250);
  }
  throw new Error(
    `Navigation shell never became ready. Buttons: ${JSON.stringify(lastButtons)}`
  );
}

async function waitForBoardSnapshot(page, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snapshot = await readBoardSnapshot(page);
    if (snapshot?.rooms?.length) {
      return snapshot;
    }
    await page.waitForTimeout(150);
  }
  throw new Error("Board snapshot was not published to the debug registry.");
}

async function waitForRoomChange(page, previousRoomId, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snapshot = await readBoardSnapshot(page);
    if (snapshot?.activeRoomId && snapshot.activeRoomId !== previousRoomId) {
      return snapshot;
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Active room did not change from ${previousRoomId}.`);
}

async function waitForSettledBoard(page, roomId, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snapshot = await readBoardSnapshot(page);
    if (snapshot?.activeRoomId === roomId && snapshot.pendingTurn === false) {
      return snapshot;
    }
    await page.waitForTimeout(150);
  }
  throw new Error(`Board did not settle for room ${roomId}.`);
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
  await page.waitForTimeout(5000);

  const rect = await readCanvasRect(page);
  await clickButton(page, rect, "New Game");
  await advanceIntoNavigation(page, rect, 20_000);
  await page.waitForTimeout(400);
  const initialBoard = await waitForBoardSnapshot(page, 6000);

  const bossRoom = initialBoard.rooms.find((room) => room.isBossRoom);
  if (!bossRoom) {
    throw new Error("Expected a boss room in the board snapshot.");
  }
  if (!(bossRoom.isDiscovered && bossRoom.presenceVisible)) {
    throw new Error(
      "Boss room should be permanently revealed with visible presence."
    );
  }
  if (!(bossRoom.tileIconVisible && bossRoom.tileIconId === "crown")) {
    throw new Error("Boss room should render the crown tile icon.");
  }
  const discoveredRoomsWithoutIcons = initialBoard.rooms.filter((room) => {
    return (
      (room.isDiscovered || room.isCurrent || room.isBossRoom) &&
      !room.tileIconVisible
    );
  });
  if (discoveredRoomsWithoutIcons.length > 0) {
    throw new Error(
      `Discovered rooms missing tile icons: ${JSON.stringify(discoveredRoomsWithoutIcons)}`
    );
  }

  for (const command of COMMAND_CLICKS) {
    const beforeEvents = await readDebugEvents(page);
    await clickButton(page, rect, "[Tab/Start] Menus");
    await clickButton(page, rect, command.commandLabel);
    if (command.expected === "spellbook") {
      const hasEquipButton = await hasButtonMatching(page, (label) => {
        return label.startsWith("[EQUIP] Equip -> Prepared ");
      });
      const hasLegacyPrepareButton = await hasButtonMatching(page, (label) => {
        return label.startsWith("[PREP] Prepare -> Slot ");
      });
      if (!hasEquipButton || hasLegacyPrepareButton) {
        throw new Error(
          "Spellbook overlay did not render the new equip/clear actions."
        );
      }
    }
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

  const beforeMoveEvents = await readDebugEvents(page);
  const previousRoomId = initialBoard.activeRoomId;
  await page.keyboard.press("Enter");
  const movedBoard = await waitForRoomChange(page, previousRoomId, 6000);
  const settledBoard = await waitForSettledBoard(
    page,
    movedBoard.activeRoomId,
    6000
  );
  const moveEvents = await readDebugEvents(page);
  const recentTurnEvents = moveEvents.slice(beforeMoveEvents.length);
  const resolvedTurn = recentTurnEvents.some((entry) => {
    return (
      entry.scope === "turn" &&
      entry.event === "resolved" &&
      typeof entry.detail?.durationMs === "number"
    );
  });
  if (!resolvedTurn) {
    throw new Error(
      "Move confirmation did not emit a resolved turn debug event."
    );
  }
  if (settledBoard.activeRoomId === previousRoomId) {
    throw new Error("Move confirmation did not update the active room.");
  }
  const currentRoom = settledBoard.rooms.find((room) => {
    return room.roomId === settledBoard.activeRoomId;
  });
  if (!currentRoom?.tileIconVisible) {
    throw new Error("Current room should publish a visible tile icon.");
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
