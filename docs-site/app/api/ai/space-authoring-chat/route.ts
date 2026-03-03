import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getAiFlagDefinition, isAiFlagEnabled } from "@/lib/ai-flags";
import { runCodexExecJson } from "@/lib/codex-cli";

export const runtime = "nodejs";

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
  cohort: z.string().optional(),
});

const AddFeatureSchemaOperation = z.object({
  op: z.literal("add_feature_schema"),
  featureId: z.string().min(1),
  label: z.string().optional(),
  groups: z.array(z.string().min(1)).optional(),
  spaces: z.array(z.string().min(1)).min(1),
  defaultValue: z.number().optional(),
});

const SetFeatureDefaultOperation = z.object({
  op: z.literal("set_feature_default"),
  featureId: z.string().min(1),
  defaultValue: z.number(),
});

const CreateModelSchemaOperation = z.object({
  op: z.literal("create_model_schema"),
  modelId: z.string().min(1),
  label: z.string().optional(),
  description: z.string().optional(),
  extendsModelId: z.string().optional(),
  featureIds: z.array(z.string().min(1)).optional(),
  spaces: z.array(z.string().min(1)).optional(),
});

const UpdateModelMetadataOperation = z.object({
  op: z.literal("update_model_metadata"),
  modelId: z.string().min(1),
  label: z.string().optional(),
  description: z.string().optional(),
});

const AddModelFeatureRefOperation = z.object({
  op: z.literal("add_model_feature_ref"),
  modelId: z.string().min(1),
  featureId: z.string().min(1),
  spaces: z.array(z.string().min(1)).optional(),
  required: z.boolean().optional(),
  defaultValue: z.number().optional(),
});

const RemoveModelFeatureRefOperation = z.object({
  op: z.literal("remove_model_feature_ref"),
  modelId: z.string().min(1),
  featureId: z.string().min(1),
});

const CreateCanonicalAssetOperation = z.object({
  op: z.literal("create_canonical_asset"),
  modelId: z.string().min(1),
  name: z.string().optional(),
});

const RenameModelInstanceOperation = z.object({
  op: z.literal("rename_model_instance"),
  instanceId: z.string().min(1),
  name: z.string().min(1),
});

const SetCanonicalStateOperation = z.object({
  op: z.literal("set_canonical_state"),
  instanceId: z.string().min(1),
  canonical: z.boolean(),
});

const SetActiveSelectionOperation = z.object({
  op: z.literal("set_active_selection"),
  modelId: z.string().min(1),
  instanceId: z.string().nullable().optional(),
});

const BuildBundleOperation = z.object({
  op: z.literal("build_bundle"),
  patchName: z.string().optional(),
  download: z.boolean().optional(),
});

const OperationSchema = z.discriminatedUnion("op", [
  AddFeatureSchemaOperation,
  SetFeatureDefaultOperation,
  CreateModelSchemaOperation,
  UpdateModelMetadataOperation,
  AddModelFeatureRefOperation,
  RemoveModelFeatureRefOperation,
  CreateCanonicalAssetOperation,
  RenameModelInstanceOperation,
  SetCanonicalStateOperation,
  SetActiveSelectionOperation,
  BuildBundleOperation,
]);

const StructuredResponseSchema = z.object({
  reply: z.string().min(1).max(12000),
  operations: z.array(OperationSchema).max(20).default([]),
  operationNotes: z.array(z.string().min(1).max(500)).max(8).default([]),
});

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey });
}

function truncateContext(context: Record<string, unknown> | undefined): string {
  if (!context) return "{}";
  const json = JSON.stringify(context, null, 2);
  return json.length > 12000 ? `${json.slice(0, 12000)}\n...<truncated>` : json;
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

function isCodexConnected(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").some((row) => row.trim() === "dungeonbreak-codex-auth=connected");
}

function buildSystemPrompt(context: Record<string, unknown> | undefined): string {
  return [
    "You are Codex integrated into DungeonBreak Space Explorer.",
    "You must return JSON only (no markdown).",
    "Primary goal: help users edit model schema, stats/features, canonical model instances, and bundle serialization actions.",
    "Prefer executable operations when user asks for changes.",
    "If user asks questions only, leave operations empty and provide a concise reply.",
    "Allowed operations:",
    "- add_feature_schema",
    "- set_feature_default",
    "- create_model_schema",
    "- update_model_metadata",
    "- add_model_feature_ref",
    "- remove_model_feature_ref",
    "- create_canonical_asset",
    "- rename_model_instance",
    "- set_canonical_state",
    "- set_active_selection",
    "- build_bundle",
    "Response JSON shape:",
    '{"reply":"string","operations":[...],"operationNotes":["string"]}',
    "Never include unknown operation names.",
    "Context JSON follows:",
    truncateContext(context),
  ].join("\n");
}

function parseStructured(raw: string) {
  const parsedObject = extractFirstJsonObject(raw);
  const structured = parsedObject ? StructuredResponseSchema.safeParse(parsedObject) : null;
  const reply = structured?.success
    ? structured.data.reply
    : raw || "I could not generate a response. Please try again.";
  return {
    reply,
    operations: structured?.success ? structured.data.operations : [],
    operationNotes: structured?.success
      ? structured.data.operationNotes
      : ["Response was treated as plain text; no structured operations were emitted."],
  };
}

export async function GET() {
  const routingDef = getAiFlagDefinition("ai.assistant.session-routing");
  const enabled = isAiFlagEnabled("ai.assistant.session-routing", { cohort: "internal" });
  return NextResponse.json({
    ok: true,
    enabled,
    flag: {
      id: routingDef.id,
      default: routingDef.default,
      mode: routingDef.mode,
      owner: routingDef.owner,
    },
  });
}

export async function POST(request: Request) {
  try {
    const parsed = RequestSchema.parse(await request.json());
    const cohort = parsed.cohort ?? "internal";
    const enabled = isAiFlagEnabled("ai.assistant.session-routing", { cohort });
    if (!enabled) {
      return NextResponse.json(
        { ok: false, error: "AI authoring chat is currently disabled by feature flag." },
        { status: 403 },
      );
    }

    const systemPrompt = buildSystemPrompt(parsed.context);
    const preferCodex = isCodexConnected(request) || process.env.SPACE_AUTHORING_PROVIDER?.trim() === "codex";

    if (preferCodex) {
      const transcript = parsed.messages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n\n");
      const codexPrompt = [
        systemPrompt,
        "",
        "Conversation transcript:",
        transcript,
        "",
        "Produce the JSON response now.",
      ].join("\n");
      const raw = await runCodexExecJson(codexPrompt);
      const structured = parseStructured(raw);
      return NextResponse.json({
        ok: true,
        ...structured,
        model: "codex-cli",
      });
    }

    const client = getOpenAIClient();
    const model = process.env.SPACE_AUTHORING_CHAT_MODEL?.trim() || "gpt-4.1-mini";
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        ...parsed.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const structured = parseStructured(raw);
    return NextResponse.json({
      ok: true,
      ...structured,
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
