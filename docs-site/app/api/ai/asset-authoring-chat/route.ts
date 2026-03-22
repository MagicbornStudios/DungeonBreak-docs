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
      })
    )
    .min(1)
    .max(24),
  context: z.record(z.string(), z.unknown()).optional(),
  cohort: z.string().optional(),
});

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
);

const SelectSchemaOperation = z.object({
  op: z.literal("select_schema"),
  schemaId: z.string().min(1),
});

const CreateSchemaOperation = z.object({
  op: z.literal("create_schema"),
  schemaId: z.string().min(1),
  name: z.string().min(1),
  schemaType: z.string().optional(),
  document: JsonValueSchema.optional(),
});

const UpdateSchemaDocumentOperation = z.object({
  op: z.literal("update_schema_document"),
  schemaId: z.string().min(1),
  name: z.string().optional(),
  schemaType: z.string().optional(),
  document: JsonValueSchema,
});

const SeedGameFormsOperation = z.object({
  op: z.literal("seed_game_forms"),
  packIds: z.array(z.string().min(1)).optional(),
});

const ImportCanonicalGameDataOperation = z.object({
  op: z.literal("import_canonical_game_data"),
  packIds: z.array(z.string().min(1)).optional(),
});

const SelectAssetOperation = z.object({
  op: z.literal("select_asset"),
  dataId: z.string().min(1),
  schemaId: z.string().optional(),
});

const CreateAssetOperation = z.object({
  op: z.literal("create_asset"),
  dataId: z.string().min(1),
  schemaId: z.string().optional(),
  name: z.string().optional(),
  namespace: z.string().optional(),
  document: JsonValueSchema.optional(),
});

const UpdateAssetDocumentOperation = z.object({
  op: z.literal("update_asset_document"),
  dataId: z.string().min(1),
  schemaId: z.string().optional(),
  document: JsonValueSchema,
});

const UpdateAssetMetadataOperation = z.object({
  op: z.literal("update_asset_metadata"),
  dataId: z.string().min(1),
  schemaId: z.string().optional(),
  name: z.string().optional(),
  namespace: z.string().optional(),
});

const ExportProjectOperation = z.object({
  op: z.literal("export_project"),
});

const PublishProjectOperation = z.object({
  op: z.literal("publish_project"),
});

const OperationSchema = z.discriminatedUnion("op", [
  SelectSchemaOperation,
  CreateSchemaOperation,
  UpdateSchemaDocumentOperation,
  SeedGameFormsOperation,
  ImportCanonicalGameDataOperation,
  SelectAssetOperation,
  CreateAssetOperation,
  UpdateAssetDocumentOperation,
  UpdateAssetMetadataOperation,
  ExportProjectOperation,
  PublishProjectOperation,
]);

const StructuredResponseSchema = z.object({
  reply: z.string().min(1).max(12000),
  operations: z.array(OperationSchema).max(20).default([]),
  operationNotes: z.array(z.string().min(1).max(500)).max(8).default([]),
});

type ChatProvider = "codex" | "openai" | "openrouter";

function truncateContext(context: Record<string, unknown> | undefined): string {
  if (!context) {
    return "{}";
  }
  const json = JSON.stringify(context, null, 2);
  return json.length > 16000 ? `${json.slice(0, 16000)}\n...<truncated>` : json;
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
  return cookie
    .split(";")
    .some((row) => row.trim() === "dungeonbreak-codex-auth=connected");
}

function determineProvider(request: Request): ChatProvider {
  const preferred = process.env.ASSET_AUTHORING_PROVIDER?.trim().toLowerCase();
  if (preferred === "codex") {
    return "codex";
  }
  if (preferred === "openrouter") {
    return "openrouter";
  }
  if (preferred === "openai") {
    return "openai";
  }
  if (isCodexConnected(request)) {
    return "codex";
  }
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    return "openrouter";
  }
  return "openai";
}

function getOpenAIClient(provider: Exclude<ChatProvider, "codex">): OpenAI {
  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }
    return new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        ...(process.env.OPENROUTER_APP_URL?.trim()
          ? { "HTTP-Referer": process.env.OPENROUTER_APP_URL.trim() }
          : {}),
        ...(process.env.OPENROUTER_APP_NAME?.trim()
          ? { "X-Title": process.env.OPENROUTER_APP_NAME.trim() }
          : {}),
      },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey });
}

function defaultModelForProvider(
  provider: Exclude<ChatProvider, "codex">
): string {
  if (provider === "openrouter") {
    return "openai/gpt-4.1-mini";
  }
  return "gpt-4.1-mini";
}

function buildSystemPrompt(
  context: Record<string, unknown> | undefined
): string {
  return [
    "You are the hosted asset authoring assistant for DungeonBreak Asset Explorer.",
    "You help plan, review, and make targeted updates to Escape the Dungeon forms and assets.",
    "You must return JSON only (no markdown).",
    "Prefer executable operations when the user asks for concrete changes.",
    "If the user is brainstorming, reviewing, or asking questions, keep operations empty and reply concisely.",
    "Allowed operations:",
    "- select_schema",
    "- create_schema",
    "- update_schema_document",
    "- seed_game_forms",
    "- import_canonical_game_data",
    "- select_asset",
    "- create_asset",
    "- update_asset_document",
    "- update_asset_metadata",
    "- export_project",
    "- publish_project",
    "Operational guidance:",
    "- Prefer updating an existing selected schema/asset rather than inventing extra records.",
    "- Use create_schema/create_asset only when the user clearly wants something new.",
    "- Keep schema and asset documents valid JSON objects.",
    "- Do not emit operations that require deleting records; deletion is not supported here yet.",
    "- Avoid bulk speculative changes. Stay targeted.",
    'Response JSON shape: {"reply":"string","operations":[...],"operationNotes":["string"]}',
    "Never include unknown operation names.",
    "Context JSON follows:",
    truncateContext(context),
  ].join("\n");
}

function parseStructured(raw: string) {
  const parsedObject = extractFirstJsonObject(raw);
  const structured = parsedObject
    ? StructuredResponseSchema.safeParse(parsedObject)
    : null;
  const reply = structured?.success
    ? structured.data.reply
    : raw || "I could not generate a response. Please try again.";
  return {
    reply,
    operations: structured?.success ? structured.data.operations : [],
    operationNotes: structured?.success
      ? structured.data.operationNotes
      : [
          "Response was treated as plain text; no structured operations were emitted.",
        ],
  };
}

export async function GET() {
  const routingDef = getAiFlagDefinition("ai.assistant.session-routing");
  const enabled = isAiFlagEnabled("ai.assistant.session-routing", {
    cohort: "internal",
  });
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
        {
          ok: false,
          error: "AI authoring chat is currently disabled by feature flag.",
        },
        { status: 403 }
      );
    }

    const systemPrompt = buildSystemPrompt(parsed.context);
    const provider = determineProvider(request);

    if (provider === "codex") {
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
        provider,
      });
    }

    const client = getOpenAIClient(provider);
    const model =
      process.env.ASSET_AUTHORING_CHAT_MODEL?.trim() ||
      defaultModelForProvider(provider);
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
      provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
