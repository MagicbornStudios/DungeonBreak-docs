import { NextResponse } from "next/server";

/** Codex-recommended models (from Codex docs). Override with CODEX_MODELS env (JSON array of { id, label }). */
const DEFAULT_MODELS = [
  { id: "gpt-5.4", label: "GPT-5.4 (recommended)" },
  { id: "gpt-5.3-codex-spark", label: "GPT-5.3 Codex Spark" },
];

export async function GET() {
  try {
    const envModels = process.env.CODEX_MODELS?.trim();
    const models = envModels
      ? (JSON.parse(envModels) as Array<{ id: string; label: string }>)
      : DEFAULT_MODELS;
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: DEFAULT_MODELS });
  }
}
