import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCodexLoginStatus, runCodexExecJsonStream } from "@planning/lib/codex-cli";
import { append as appendDebugLog, setLastChatOutcome } from "@planning/lib/planning-debug-log";
import { getPlanningDir, getProjectRoot } from "@/vendor/repo-planner/api/lib/project-root";

export const runtime = "nodejs";

const ROOT = getProjectRoot();
const PLANNING_DIR = getPlanningDir();

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(24),
  context: z.record(z.string(), z.unknown()).optional(),
  model: z.string().max(200).optional(),
});

const EditSchema = z.object({
  path: z.string().min(1).max(500),
  newContent: z.string().max(500_000),
  summary: z.string().max(500).optional(),
});

const PlanTodoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  description: z.string().optional(),
});

const PlanSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  todos: z.array(PlanTodoSchema).min(1),
});

const QuestionOptionSchema = z.object({ id: z.string(), label: z.string(), description: z.string().optional() });
const QuestionStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  options: z.array(QuestionOptionSchema).min(1),
});
const QuestionsSchema = z.object({
  steps: z.array(QuestionStepSchema).min(1),
});

function buildPlanningSystemPrompt(context: Record<string, unknown> | undefined): string {
  const planApproved = context?.planApproved === true || context?.planApproved === "true";
  const ctx = context ? `\nCurrent planning context (for reference only):\n${JSON.stringify(context, null, 2).slice(0, 4000)}` : "";
  return [
    "You are a planning assistant for the DungeonBreak development cockpit.",
    "You MUST only work with planning documents: files under .planning/ (STATE.xml, TASK-REGISTRY.xml, ROADMAP.xml, DECISIONS.xml, phases, PLAN.xml, SUMMARY.xml, reports, etc.).",
    "You must NOT read, write, or suggest changes outside the .planning directory.",
    "REQUIREMENT: You may only propose file edits AFTER the user has approved a plan. So:",
    "1. When the user asks for changes, first return a plan (steps/todos). Use \"plan\": {\"id\": \"plan-1\", \"title\": \"...\", \"description\": \"...\", \"todos\": [{\"id\": \"1\", \"label\": \"...\", \"status\": \"pending\"|\"in_progress\"|\"completed\"|\"cancelled\"}]}. The user will approve or request changes.",
    "2. Only when the user has approved the plan (you will see planApproved in context) may you return \"edits\" with file changes. If you have no approved plan and the user asks for edits, return a plan first, not edits.",
    "You may ask clarifying questions using \"questions\": {\"steps\": [{\"id\": \"...\", \"title\": \"...\", \"description\": \"...\", \"options\": [{\"id\": \"...\", \"label\": \"...\"}]}]}. When the user answers, use that to continue.",
    "Always return JSON only. Shape: {\"reply\": \"...\", \"plan\": {...} or undefined, \"questions\": {...} or undefined, \"edits\": [...]}. Path in edits must start with .planning/. Include a short 'summary' per edit.",
    "For discussion-only replies use {\"reply\": \"...\", \"edits\": []}. Do not include \"edits\" unless planApproved is true.",
    ctx,
  ].join("\n");
}

function extractFirstJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // continue
    }
  }
  return null;
}

function resolvePlanningPath(relativePath: string): string | null {
  const normalized = path.normalize(relativePath).replace(/\\/g, "/");
  if (normalized.startsWith("..") || path.isAbsolute(relativePath)) return null;
  const base = normalized.startsWith(".planning/") ? normalized : `.planning/${normalized}`;
  const absolute = path.join(ROOT, base);
  const relative = path.relative(PLANNING_DIR, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return absolute;
}

export async function POST(request: Request) {
  try {
    const parsed = RequestSchema.parse(await request.json());
    const systemPrompt = buildPlanningSystemPrompt(parsed.context);
    const transcript = parsed.messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    const codexPrompt = [
      systemPrompt,
      "",
      "Conversation:",
      transcript,
      "",
      "Reply with JSON only: {\"reply\": \"...\", \"plan\": {...} or undefined, \"questions\": {...} or undefined, \"edits\": [...]}.",
    ].join("\n");

    appendDebugLog(`[${new Date().toISOString()}] chat/stream request`);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = "";
          appendDebugLog("Codex run start");
          for await (const chunk of runCodexExecJsonStream(codexPrompt, {
            workingDirectory: ROOT,
            model: parsed.model,
          })) {
            fullText += chunk;
            controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify(chunk)}\n\n`));
          }
          if (!fullText.trim()) {
            const { loggedIn, detail } = await getCodexLoginStatus().catch(() => ({
              loggedIn: false,
              detail: "Could not get Codex status",
            }));
            const diagnostic = `Codex returned no response. Codex login: ${loggedIn ? "ok" : "not logged in"}. ${detail}`;
            setLastChatOutcome({
              route: "stream",
              replyLength: 0,
              lastError: diagnostic,
              timestamp: Date.now(),
            });
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify(diagnostic)}\n\n`),
            );
            controller.close();
            return;
          }
          const parsedJson = extractFirstJsonObject(fullText);
          const StructuredResponseSchema = z.object({
            reply: z.string().max(12000),
            plan: PlanSchema.optional(),
            questions: QuestionsSchema.optional(),
            edits: z.array(EditSchema).max(10).default([]),
          });
          const structured = parsedJson ? StructuredResponseSchema.safeParse(parsedJson) : null;
          const planApproved = parsed.context?.planApproved === true || parsed.context?.planApproved === "true";
          let reply = structured?.success ? structured.data.reply : (fullText.trim() || "No reply.");
          let editsFromModel = structured?.success ? structured.data.edits ?? [] : [];
          if (!planApproved && editsFromModel.length > 0) {
            editsFromModel = [];
            if (!reply.endsWith(".")) reply += ".";
            reply += " Approve a plan first to apply file edits.";
          }
          const plan = structured?.success ? structured.data.plan : undefined;
          const questions = structured?.success ? structured.data.questions : undefined;
          const edits: Array<{ path: string; oldContent: string; newContent: string; summary?: string }> = [];
          for (const e of editsFromModel) {
            const absolutePath = resolvePlanningPath(e.path);
            if (!absolutePath) continue;
            let oldContent = "";
            try {
              oldContent = await readFile(absolutePath, "utf8");
            } catch {
              oldContent = "";
            }
            const relativePath = path.relative(ROOT, absolutePath).replace(/\\/g, "/");
            edits.push({ path: relativePath, oldContent, newContent: e.newContent, summary: e.summary });
          }
          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({ reply: reply.trim() || "No reply.", plan, questions, edits })}\n\n`,
            ),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          appendDebugLog(`error: ${message}`);
          setLastChatOutcome({
            route: "stream",
            replyLength: 0,
            lastError: message,
            timestamp: Date.now(),
          });
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(message)}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
