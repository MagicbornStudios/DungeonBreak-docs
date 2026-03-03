import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { logCodexAuth } from "@/lib/codex-auth-log";

type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type DeviceAuthSession = {
  id: string;
  startedAt: number;
  process: ChildProcess;
  status: "pending" | "completed" | "failed";
  detail: string;
  verificationUrl: string | null;
  userCode: string | null;
  exitCode: number | null;
};

const deviceAuthSessions = new Map<string, DeviceAuthSession>();
let cachedCodexBinary: string | null = null;

function parseLoggedIn(statusText: string): boolean {
  return /logged in/i.test(statusText) && !/not logged in/i.test(statusText);
}

function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;]*m/g, "");
}

function quoteWindowsArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function getBundledCodexBinaryCandidate(): string | null {
  const roots = [process.cwd(), path.resolve(process.cwd(), "..")];
  if (process.platform === "win32") {
    for (const root of roots) {
      const platformExe = path.join(
        root,
        "node_modules",
        ".pnpm",
        "@openai+codex@0.107.0-win32-x64",
        "node_modules",
        "@openai",
        "codex",
        "vendor",
        "x86_64-pc-windows-msvc",
        "codex",
        "codex.exe",
      );
      if (existsSync(platformExe)) return platformExe;
    }
  }
  return null;
}

function spawnCommand(command: string, args: string[]) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
    const joined = [quoteWindowsArg(command), ...args.map(quoteWindowsArg)].join(" ");
    return spawn("cmd.exe", ["/d", "/s", "/c", joined], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  }
  return spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function runCommand(command: string, args: string[], timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args);
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

async function resolveCodexBinary(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedCodexBinary) return cachedCodexBinary;
  const bundled = getBundledCodexBinaryCandidate();
  if (bundled) {
    cachedCodexBinary = bundled;
    await logCodexAuth("binary.resolve.bundled", { binary: bundled });
    return bundled;
  }
  if (process.env.CODEX_BINARY_PATH?.trim()) {
    const configured = process.env.CODEX_BINARY_PATH.trim();
    if (process.platform === "win32") {
      const winCandidate = configured.toLowerCase().endsWith(".exe") || configured.toLowerCase().endsWith(".cmd")
        ? configured
        : existsSync(`${configured}.cmd`)
          ? `${configured}.cmd`
          : configured;
      cachedCodexBinary = winCandidate;
      await logCodexAuth("binary.resolve.env", { binary: winCandidate });
      return cachedCodexBinary;
    }
    cachedCodexBinary = configured;
    await logCodexAuth("binary.resolve.env", { binary: configured });
    return cachedCodexBinary;
  }

  if (process.platform === "win32") {
    const whereExe = await runCommand("cmd.exe", ["/d", "/s", "/c", "where codex.exe"], 5000);
    if (whereExe.code === 0) {
      const exeCandidates = whereExe.stdout
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter((row) => row.length > 0);
      const preferredExe = exeCandidates.find((row) => row.toLowerCase().endsWith(".exe")) ?? exeCandidates[0];
      if (preferredExe) {
        cachedCodexBinary = preferredExe;
        await logCodexAuth("binary.resolve.win32.exe", { binary: preferredExe, candidates: exeCandidates });
        return preferredExe;
      }
    }
    const knownExes = getKnownWindowsCodexExes();
    if (knownExes.length > 0) {
      cachedCodexBinary = knownExes[0];
      await logCodexAuth("binary.resolve.win32.known", { binary: knownExes[0], candidates: knownExes });
      return knownExes[0];
    }

    const where = await runCommand("cmd.exe", ["/d", "/s", "/c", "where codex"], 5000);
    if (where.code !== 0) {
      throw new Error("Could not locate Codex binary. Run `codex login` in terminal first.");
    }
    const candidates = where.stdout
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter((row) => row.length > 0);
    const preferred = candidates.find((row) => row.toLowerCase().endsWith(".exe"))
      ?? candidates.find((row) => row.toLowerCase().endsWith(".cmd"))
      ?? candidates[0];
    if (!preferred) {
      throw new Error("Could not resolve Codex binary path.");
    }
    cachedCodexBinary = preferred;
    await logCodexAuth("binary.resolve.win32", { binary: preferred, candidates });
    return preferred;
  }

  const which = await runCommand("which", ["codex"], 5000);
  if (which.code !== 0) {
    throw new Error("Could not locate Codex binary. Run `codex login` in terminal first.");
  }
  const resolved = which.stdout.split(/\r?\n/).map((row) => row.trim()).find(Boolean);
  if (!resolved) throw new Error("Could not resolve Codex binary path.");
  cachedCodexBinary = resolved;
  await logCodexAuth("binary.resolve.posix", { binary: resolved });
  return resolved;
}

function getKnownWindowsCodexExes(): string[] {
  const home = process.env.USERPROFILE?.trim();
  if (!home) return [];
  const extensionRoots = [
    path.join(home, ".cursor", "extensions"),
    path.join(home, ".vscode", "extensions"),
  ];

  const out: string[] = [];
  for (const root of extensionRoots) {
    if (!existsSync(root)) continue;
    let entries: Array<{ isDirectory(): boolean; name: string }>;
    try {
      entries = readdirSync(root, { withFileTypes: true, encoding: "utf8" });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.toLowerCase().startsWith("openai.chatgpt-")) continue;
      const candidate = path.join(root, entry.name, "bin", "windows-x86_64", "codex.exe");
      if (existsSync(candidate)) out.push(candidate);
    }
  }
  return out.sort((a, b) => b.localeCompare(a));
}

async function getWindowsBinaryCandidates(): Promise<string[]> {
  const list: string[] = [];
  const seen = new Set<string>();

  const add = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    list.push(normalized);
  };

  const whereExe = await runCommand("cmd.exe", ["/d", "/s", "/c", "where codex.exe"], 5000).catch(() => null);
  if (whereExe?.code === 0) {
    whereExe.stdout.split(/\r?\n/).forEach(add);
  }
  for (const candidate of getKnownWindowsCodexExes()) add(candidate);
  const whereCmd = await runCommand("cmd.exe", ["/d", "/s", "/c", "where codex.cmd"], 5000).catch(() => null);
  if (whereCmd?.code === 0) {
    whereCmd.stdout.split(/\r?\n/).forEach(add);
  }
  const whereGeneric = await runCommand("cmd.exe", ["/d", "/s", "/c", "where codex"], 5000).catch(() => null);
  if (whereGeneric?.code === 0) {
    whereGeneric.stdout.split(/\r?\n/).forEach(add);
  }

  return list;
}

export async function getCodexLoginStatus(): Promise<{ loggedIn: boolean; detail: string }> {
  let codexBinary = await resolveCodexBinary();
  let result: CommandResult;
  try {
    result = await runCommand(codexBinary, ["login", "status"], 10000);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ENOENT|EINVAL/i.test(message)) throw error;
    cachedCodexBinary = null;
    codexBinary = await resolveCodexBinary(true);
    result = await runCommand(codexBinary, ["login", "status"], 10000);
  }
  let text = stripAnsi(`${result.stdout}\n${result.stderr}`.trim());
  let loggedIn = parseLoggedIn(text);

  if (process.platform === "win32" && !loggedIn) {
    const alternatives = await getWindowsBinaryCandidates();
    for (const candidate of alternatives) {
      if (candidate.toLowerCase() === codexBinary.toLowerCase()) continue;
      try {
        const probe = await runCommand(candidate, ["login", "status"], 8000);
        const probeText = stripAnsi(`${probe.stdout}\n${probe.stderr}`.trim());
        const probeLoggedIn = parseLoggedIn(probeText);
        await logCodexAuth("login.status.probe", {
          candidate,
          code: probe.code,
          loggedIn: probeLoggedIn,
        });
        if (probeLoggedIn) {
          codexBinary = candidate;
          cachedCodexBinary = candidate;
          result = probe;
          text = probeText;
          loggedIn = true;
          await logCodexAuth("binary.switch.logged-in", { binary: candidate });
          break;
        }
      } catch (probeError) {
        await logCodexAuth("login.status.probe.error", {
          candidate,
          error: probeError instanceof Error ? probeError.message : String(probeError),
        });
      }
    }
  }

  await logCodexAuth("login.status", {
    binary: codexBinary,
    code: result.code,
    loggedIn,
  });
  return {
    loggedIn,
    detail: text || "No status output.",
  };
}

export async function runCodexExecJson(prompt: string): Promise<string> {
  const { Codex } = await import("@openai/codex-sdk");
  const codex = new Codex({
    codexPathOverride: await resolveCodexBinary(),
  });
  const thread = codex.startThread({
    sandboxMode: "read-only",
    skipGitRepoCheck: true,
    workingDirectory: process.cwd(),
  });
  const turn = await thread.run(prompt);
  const response = String(turn.finalResponse ?? "").trim();
  if (!response) {
    throw new Error("Codex did not return an assistant message.");
  }
  return response;
}

function parseDeviceAuth(text: string): { verificationUrl: string | null; userCode: string | null } {
  const cleaned = stripAnsi(text);
  const urlMatch = cleaned.match(/https:\/\/auth\.openai\.com\/[^\s]*/i);
  const codeMatch = cleaned.match(/\b([A-Z0-9]{4,})[-\s]([A-Z0-9]{4,})\b/);
  return {
    verificationUrl: urlMatch ? urlMatch[0] : null,
    userCode: codeMatch ? `${codeMatch[1]}-${codeMatch[2]}` : null,
  };
}

function clearOldSessions() {
  const now = Date.now();
  for (const [id, session] of deviceAuthSessions.entries()) {
    if (now - session.startedAt > 20 * 60 * 1000) {
      try {
        if (session.status === "pending") session.process.kill();
      } catch {
        // ignore
      }
      deviceAuthSessions.delete(id);
    }
  }
}

export async function startCodexDeviceAuth(): Promise<{ id: string; verificationUrl: string | null; userCode: string | null }> {
  clearOldSessions();
  let codexBinary = await resolveCodexBinary();
  const id = randomUUID();
  let child = spawnCommand(codexBinary, ["login"]);
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    child.once("spawn", () => {
      settled = true;
      resolve();
    });
    child.once("error", (error) => {
      if (settled) return;
      reject(error);
    });
  }).catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ENOENT|EINVAL/i.test(message)) throw error;
    cachedCodexBinary = null;
    codexBinary = await resolveCodexBinary(true);
    child = spawnCommand(codexBinary, ["login"]);
  });
  await logCodexAuth("login.start.spawned", { sessionId: id, binary: codexBinary });

  const session: DeviceAuthSession = {
    id,
    startedAt: Date.now(),
    process: child,
    status: "pending",
    detail: "Waiting for browser authorization.",
    verificationUrl: null,
    userCode: null,
    exitCode: null,
  };
  deviceAuthSessions.set(id, session);

  child.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    session.detail = stripAnsi(`${session.detail}\n${text}`.trim());
    const parsed = parseDeviceAuth(session.detail);
    session.verificationUrl = parsed.verificationUrl ?? session.verificationUrl;
    session.userCode = parsed.userCode ?? session.userCode;
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    session.detail = stripAnsi(`${session.detail}\n${text}`.trim());
  });

  child.on("close", async (code) => {
    session.exitCode = code ?? null;
    if ((code ?? 1) === 0) {
      session.status = "completed";
      session.detail = stripAnsi(`${session.detail}\nLogin completed.`.trim());
    } else {
      session.status = "failed";
      const status = await getCodexLoginStatus().catch(() => ({ loggedIn: false, detail: "" }));
      if (status.loggedIn) {
        session.status = "completed";
      }
      session.detail = stripAnsi(`${session.detail}\nLogin command exited with code ${code ?? 1}.`.trim());
    }
    await logCodexAuth("login.start.closed", {
      sessionId: id,
      code: code ?? null,
      status: session.status,
      verificationUrl: session.verificationUrl,
      hasUserCode: Boolean(session.userCode),
    });
  });

  child.on("error", (error) => {
    session.status = "failed";
    session.detail = stripAnsi(`${session.detail}\n${error.message}`.trim());
    void logCodexAuth("login.start.error", {
      sessionId: id,
      error: error.message,
      binary: codexBinary,
    });
  });

  await new Promise((resolve) => setTimeout(resolve, 1200));
  const parsed = parseDeviceAuth(session.detail);
  session.verificationUrl = parsed.verificationUrl ?? session.verificationUrl;
  session.userCode = parsed.userCode ?? session.userCode;

  return {
    id,
    verificationUrl: session.verificationUrl,
    userCode: session.userCode,
  };
}

export function getCodexDeviceAuthSession(id: string): {
  id: string;
  status: "pending" | "completed" | "failed";
  verificationUrl: string | null;
  userCode: string | null;
  detail: string;
} | null {
  const session = deviceAuthSessions.get(id);
  if (!session) return null;
  return {
    id: session.id,
    status: session.status,
    verificationUrl: session.verificationUrl,
    userCode: session.userCode,
    detail: session.detail,
  };
}
