import { NextResponse } from "next/server";
import { CONTENT_PACK_REGISTRY } from "../../../../packages/engine/src/escape-the-dungeon/contracts/index";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "engine-contract-registry",
    packs: CONTENT_PACK_REGISTRY,
  });
}
