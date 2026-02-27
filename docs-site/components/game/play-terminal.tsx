"use client";

import "ink-web/css";
import {
  Box,
  InkTerminalBox,
  Text,
  useInput,
} from "ink-web";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActionAvailability,
  EntityState,
  GameEvent,
  PlayerAction,
} from "@/lib/escape-the-dungeon/core/types";
import { GameEngine } from "@/lib/escape-the-dungeon/engine/game";
import {
  createPersistence,
  type PersistenceAdapter,
} from "@/lib/escape-the-dungeon/persistence/indexeddb";
import {
  MAX_TRANSCRIPT_LINES,
  PLAY_TERMINAL_OPTIONS,
  PLAY_TERMINAL_ROWS,
  PLAY_TONE_COLORS,
  type TerminalLineTone,
} from "@/components/game/terminal-theme";

type PlayTerminalProps = {
  onReady?: () => void;
};

type TerminalLine = {
  id: number;
  tone: TerminalLineTone;
  text: string;
};

const DEFAULT_SLOT = "autosave";

const helpText = [
  "Commands:",
  "  help",
  "  look",
  "  status",
  "  actions [--all]",
  "  dialogue",
  "  pages",
  "  deeds",
  "  cutscenes",
  "  north|south|east|west|up|down",
  "  go <direction>",
  "  train | rest | search",
  "  talk [target_id]",
  "  fight [target_id]",
  "  steal [target_id]",
  "  recruit [target_id]",
  "  murder [target_id]",
  "  stream [effort]",
  "  say <text>",
  "  choose <option_id>",
  "  evolve <skill_id>",
  "  save [slot]",
  "  load [slot]",
  "  slots",
  "  delete-slot <slot>",
  "  clear",
].join("\n");

const formatStatus = (status: Record<string, unknown>): string => {
  const playerLevel = Number(status.level ?? 1);
  const location = `Depth ${String(status.depth ?? "?")} / Room ${String(status.roomId ?? "?")}`;
  const chapter = `Act ${String(status.act ?? "?")} Chapter ${String(status.chapter ?? "?")}`;
  const vitals = `HP ${String(status.health ?? "?")} | Energy ${String(status.energy ?? "?")} | Level ${playerLevel}`;
  const social = `Faction ${String(status.faction ?? "freelancer")} | Reputation ${String(status.reputation ?? 0)} | Companion ${String(status.companion ?? "none")}`;
  const quests = JSON.stringify(status.quests ?? {}, null, 2);
  return [location, chapter, vitals, social, `Quests: ${quests}`].join("\n");
};

const parseAction = (
  verb: string,
  args: string[],
): PlayerAction | null => {
  const directions = ["north", "south", "east", "west", "up", "down"];

  if (directions.includes(verb)) {
    return { actionType: "move", payload: { direction: verb } };
  }
  if (verb === "go" && args[0] && directions.includes(args[0])) {
    return { actionType: "move", payload: { direction: args[0] } };
  }
  if (verb === "train") {
    return { actionType: "train", payload: {} };
  }
  if (verb === "rest") {
    return { actionType: "rest", payload: {} };
  }
  if (verb === "search") {
    return { actionType: "search", payload: {} };
  }
  if (verb === "talk") {
    return { actionType: "talk", payload: args[0] ? { targetId: args[0] } : {} };
  }
  if (verb === "fight") {
    return { actionType: "fight", payload: args[0] ? { targetId: args[0] } : {} };
  }
  if (verb === "steal") {
    return { actionType: "steal", payload: args[0] ? { targetId: args[0] } : {} };
  }
  if (verb === "recruit") {
    return { actionType: "recruit", payload: args[0] ? { targetId: args[0] } : {} };
  }
  if (verb === "murder") {
    return { actionType: "murder", payload: args[0] ? { targetId: args[0] } : {} };
  }
  if (verb === "stream") {
    const effort = Number(args[0] ?? 10);
    return {
      actionType: "live_stream",
      payload: { effort: Number.isFinite(effort) && effort > 0 ? effort : 10 },
    };
  }
  if (verb === "say") {
    const intentText = args.join(" ").trim();
    return { actionType: "speak", payload: { intentText } };
  }
  if (verb === "choose") {
    const optionId = args[0] ?? "";
    return { actionType: "choose_dialogue", payload: { optionId } };
  }
  if (verb === "evolve") {
    const skillId = args[0] ?? "";
    return { actionType: "evolve_skill", payload: { skillId } };
  }
  return null;
};

const formatActions = (rows: ActionAvailability[], showBlocked: boolean): string => {
  const visible = showBlocked ? rows : rows.filter((row) => row.available);
  if (visible.length === 0) {
    return "No actions available.";
  }
  return visible
    .map((row) => {
      if (row.available) {
        return `[ok] ${row.label}`;
      }
      return `[x] ${row.label} -> ${row.blockedReasons.join("; ")}`;
    })
    .join("\n");
};

const formatNearby = (entities: EntityState[]): string => {
  if (entities.length === 0) {
    return "none";
  }
  return entities
    .map((entity) => `${entity.entityId} (${entity.name}, ${entity.faction})`)
    .join(", ");
};

const SessionApp = ({
  engine,
  onRegisterCommandRunner,
  persistence,
  onLatestOutput,
}: {
  engine: GameEngine;
  onRegisterCommandRunner: (runner: (command: string) => Promise<void>) => void;
  persistence: PersistenceAdapter;
  onLatestOutput: (text: string) => void;
}) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 1, tone: "system", text: "Escape the Dungeon terminal online." },
    { id: 2, tone: "system", text: "Type `help` to view commands." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const idRef = useRef(3);
  const hydratedRef = useRef(false);

  const appendLine = useCallback(
    (tone: TerminalLineTone, text: string) => {
      const parts = text.split("\n");
      const newLines: TerminalLine[] = parts.map((part) => ({
        id: idRef.current++,
        tone,
        text: part,
      }));
      const latest = parts[parts.length - 1] ?? "";
      onLatestOutput(latest);
      setLines((previous) => [...previous, ...newLines].slice(-MAX_TRANSCRIPT_LINES));
    },
    [onLatestOutput],
  );

  const appendEvent = useCallback(
    (event: GameEvent) => {
      const prefix = `[t${event.turnIndex}] ${event.actorName} ${event.actionType}@${event.roomId}`;
      appendLine("event", `${prefix}: ${event.message}`);
      if (event.warnings.length > 0) {
        appendLine("warning", `${prefix} warnings: ${event.warnings.join(", ")}`);
      }
    },
    [appendLine],
  );

  const autosave = useCallback(async () => {
    await persistence.saveSlot(DEFAULT_SLOT, engine.snapshot(), "Auto Save");
  }, [engine, persistence]);

  const hydrate = useCallback(async () => {
    const loaded = await persistence.loadSlot(DEFAULT_SLOT);
    if (loaded) {
      engine.restore(loaded.snapshot);
      appendLine("system", `Loaded slot '${loaded.name}' from autosave.`);
      appendLine("output", engine.look());
      return;
    }
    appendLine("system", "No autosave found. Starting a new run.");
    appendLine("output", engine.look());
    await autosave();
  }, [appendLine, autosave, engine, persistence]);

  const runAction = useCallback(
    async (action: PlayerAction) => {
      const result = engine.dispatch(action);
      for (const event of result.events) {
        appendEvent(event);
      }
      await autosave();
      if (result.escaped) {
        appendLine("system", "Kael escaped the dungeon. Run complete.");
      }
    },
    [appendEvent, appendLine, autosave, engine],
  );

  const runCommand = useCallback(
    async (rawCommand: string) => {
      const normalized = rawCommand.trim();
      if (!normalized) {
        return;
      }

      appendLine("system", `> ${normalized}`);
      const [verbRaw, ...args] = normalized.split(/\s+/);
      const verb = verbRaw.toLowerCase();

      if (verb === "help") {
        appendLine("output", helpText);
        return;
      }
      if (verb === "clear") {
        setLines([]);
        return;
      }
      if (verb === "look") {
        appendLine("output", engine.look());
        return;
      }
      if (verb === "status") {
        appendLine("output", formatStatus(engine.status()));
        return;
      }
      if (verb === "actions") {
        const showBlocked = args.includes("--all");
        appendLine("output", formatActions(engine.availableActions(), showBlocked));
        return;
      }
      if (verb === "dialogue") {
        const rows = engine.availableDialogueOptions();
        if (rows.length === 0) {
          appendLine("warning", "No dialogue options are in range.");
          return;
        }
        const text = rows.map((row) => `${row.optionId}: ${row.label}`).join("\n");
        appendLine("output", text);
        return;
      }
      if (verb === "pages") {
        const pages = engine.pagesForCurrentChapter();
        appendLine("output", pages.chapter.slice(-12).join("\n") || "No page entries yet.");
        return;
      }
      if (verb === "deeds") {
        const deeds = engine.recentDeeds(8);
        appendLine(
          "output",
          deeds.length === 0
            ? "No deeds recorded."
            : deeds
                .map((deed) => `${deed.turnIndex} ${deed.deedType}@${deed.roomId}: ${deed.summary}`)
                .join("\n"),
        );
        return;
      }
      if (verb === "cutscenes") {
        const cutscenes = engine.recentCutscenes(8);
        appendLine(
          "output",
          cutscenes.length === 0
            ? "No cutscenes triggered."
            : cutscenes
                .map((event) => `${event.turnIndex} ${event.message}`)
                .join("\n"),
        );
        return;
      }
      if (verb === "nearby") {
        const nearby = Object.values(engine.state.entities).filter((entity) => {
          const player = engine.player;
          if (entity.entityId === player.entityId || entity.health <= 0) {
            return false;
          }
          return entity.depth === player.depth && entity.roomId === player.roomId;
        });
        appendLine("output", formatNearby(nearby));
        return;
      }
      if (verb === "save") {
        const slot = args[0] ?? DEFAULT_SLOT;
        await persistence.saveSlot(slot, engine.snapshot(), slot);
        appendLine("system", `Saved slot '${slot}'.`);
        return;
      }
      if (verb === "load") {
        const slot = args[0] ?? DEFAULT_SLOT;
        const loaded = await persistence.loadSlot(slot);
        if (!loaded) {
          appendLine("warning", `Slot '${slot}' not found.`);
          return;
        }
        engine.restore(loaded.snapshot);
        appendLine("system", `Loaded slot '${slot}'.`);
        appendLine("output", engine.look());
        return;
      }
      if (verb === "slots") {
        const slots = await persistence.listSlots();
        appendLine(
          "output",
          slots.length === 0
            ? "No slots saved."
            : slots
                .map((slot) => `${slot.id} @ ${new Date(slot.updatedAt).toISOString()}`)
                .join("\n"),
        );
        return;
      }
      if (verb === "delete-slot") {
        const slot = args[0];
        if (!slot) {
          appendLine("warning", "Usage: delete-slot <slot>");
          return;
        }
        await persistence.deleteSlot(slot);
        appendLine("system", `Deleted slot '${slot}'.`);
        return;
      }

      const action = parseAction(verb, args);
      if (!action) {
        appendLine("error", `Unknown command '${verb}'. Type 'help'.`);
        return;
      }
      await runAction(action);
    },
    [appendLine, engine, persistence, runAction],
  );

  useEffect(() => {
    onRegisterCommandRunner(runCommand);
  }, [onRegisterCommandRunner, runCommand]);

  useInput((value, key) => {
    if (key.ctrl && value === "c") {
      appendLine("warning", "Use your browser tab controls to exit the game view.");
      return;
    }
    if (key.return) {
      const command = input;
      setInput("");
      if (busy) {
        appendLine("warning", "Still processing previous command.");
        return;
      }
      setBusy(true);
      void runCommand(command).finally(() => setBusy(false));
      return;
    }
    if (key.backspace || key.delete) {
      setInput((previous) => previous.slice(0, -1));
      return;
    }
    if (key.tab) {
      return;
    }
    if (!key.ctrl && !key.meta && value) {
      setInput((previous) => previous + value);
    }
  });

  const prompt = busy ? "> ...processing" : `> ${input}`;
  const displayed = useMemo(() => lines.slice(-PLAY_TERMINAL_ROWS + 2), [lines]);

  useEffect(() => {
    if (hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    void hydrate();
  }, [hydrate]);

  return (
    <Box flexDirection="column">
      {displayed.map((line) => (
        <Text color={PLAY_TONE_COLORS[line.tone]} key={line.id}>
          {line.text}
        </Text>
      ))}
      <Text color="yellow">{prompt}</Text>
    </Box>
  );
};

export function PlayTerminal({ onReady }: PlayTerminalProps) {
  const engine = useMemo(() => GameEngine.create(7), []);
  const persistence = useMemo(() => createPersistence(), []);
  const commandRunnerRef = useRef<((command: string) => Promise<void>) | null>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [externalCommand, setExternalCommand] = useState("");
  const [lastOutput, setLastOutput] = useState("Ready.");

  const registerCommandRunner = useCallback((runner: (command: string) => Promise<void>) => {
    commandRunnerRef.current = runner;
  }, []);

  const runExternalCommand = useCallback(async (commandOverride?: string) => {
    const next = (commandOverride ?? externalCommand).trim();
    if (!next) {
      return;
    }
    if (!commandRunnerRef.current) {
      setLastOutput("Terminal still initializing...");
      return;
    }
    await commandRunnerRef.current(next);
    setExternalCommand("");
    if (commandInputRef.current) {
      commandInputRef.current.value = "";
    }
  }, [externalCommand]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    (window as typeof window & { __escapeDungeonRunCommand?: (command: string) => Promise<void> }).__escapeDungeonRunCommand =
      async (command: string) => {
        if (!commandRunnerRef.current) {
          throw new Error("Terminal command runner unavailable");
        }
        await commandRunnerRef.current(command);
      };
    return () => {
      delete (window as typeof window & { __escapeDungeonRunCommand?: (command: string) => Promise<void> })
        .__escapeDungeonRunCommand;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    (window as typeof window & { __escapeDungeonLastOutput?: string }).__escapeDungeonLastOutput = lastOutput;
  }, [lastOutput]);

  return (
    <div className="play-shell">
      <InkTerminalBox
        className="play-terminal"
        focus
        loading={{ type: "skeleton", position: "center" }}
        onReady={onReady}
        rows={PLAY_TERMINAL_ROWS}
        termOptions={PLAY_TERMINAL_OPTIONS}
      >
        <SessionApp
          engine={engine}
          onLatestOutput={setLastOutput}
          onRegisterCommandRunner={registerCommandRunner}
          persistence={persistence}
        />
      </InkTerminalBox>
      <div className="play-command-bar">
        <input
          aria-label="Command input"
          className="play-command-input"
          data-testid="play-command-input"
          ref={commandInputRef}
          onChange={(event) => setExternalCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void runExternalCommand(event.currentTarget.value);
            }
          }}
          placeholder="Type command and press Enter"
          type="text"
          value={externalCommand}
        />
        <button
          className="play-command-button"
          data-testid="play-command-submit"
          onClick={() => {
            const value = commandInputRef.current?.value ?? externalCommand;
            void runExternalCommand(value);
          }}
          type="button"
        >
          Run
        </button>
      </div>
      <p className="play-last-output" data-testid="play-last-output">
        {lastOutput}
      </p>
    </div>
  );
}
