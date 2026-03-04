import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { runCodexExecJson } from "@/lib/codex-cli";

export const runtime = "nodejs";

const ROOT = path.resolve(process.cwd(), "..");
const PLANNING_DIR = path.join(ROOT, ".planning");

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

const StructuredResponseSchema = z.object({
  reply: z.string().max(12000),
  plan: PlanSchema.optional(),
  questions: QuestionsSchema.optional(),
  edits: z.array(EditSchema).max(10).default([]),
});

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey });
}

function isCodexConnected(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").some((row) => row.trim() === "dungeonbreak-codex-auth=connected");
}

/** Resolve and validate: path must be under .planning. Returns absolute path or null if invalid. */
function resolvePlanningPath(relativePath: string): string | null {
  const normalized = path.normalize(relativePath).replace(/\\/g, "/");
  if (normalized.startsWith("..") || path.isAbsolute(relativePath)) return null;
  const base = normalized.startsWith(".planning/") ? normalized : `.planning/${normalized}`;
  const absolute = path.join(ROOT, base);
  const relative = path.relative(PLANNING_DIR, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return absolute;
}

/** System prompt: planning-only scope; plan first, then edits only after approval; may ask questions. */
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
  } catch {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const parsed = RequestSchema.parse(await request.json());
    const systemPrompt = buildPlanningSystemPrompt(parsed.context);
    const preferCodex = isCodexConnected(request) || process.env.PLANNING_CHAT_PROVIDER?.trim() === "codex";

    let raw = "";
    let model = "codex-cli";
    if (preferCodex) {
      const transcript = parsed.messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");
      const codexPrompt = [systemPrompt, "", "Conversation:", transcript, "", "Reply with JSON only: {\"reply\": \"...\", \"edits\": [...]}."].join("\n");
      raw = await runCodexExecJson(codexPrompt);
    } else {
      const client = getOpenAIClient();
      model = process.env.PLANNING_CHAT_MODEL?.trim() || "gpt-4.1-mini";
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          ...parsed.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      raw = (completion.choices[0]?.message?.content ?? "").trim();
    }

    const parsedJson = extractFirstJsonObject(raw);
    const structured = parsedJson ? StructuredResponseSchema.safeParse(parsedJson) : null;
    const planApproved = parsed.context?.planApproved === true || parsed.context?.planApproved === "true";
    let reply = structured?.success ? structured.data.reply : (raw || "No reply.").trim();
    let editsFromModel = structured?.success ? structured.data.edits : [];
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
      edits.push({
        path: relativePath,
        oldContent,
        newContent: e.newContent,
        summary: e.summary,
      });
    }

    return NextResponse.json({
      ok: true,
      reply: reply || "No reply.",
      plan,
      questions,
      edits,
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
