import { NextResponse } from "next/server";
import { getDeliveryIndex } from "@/lib/content-pack-delivery";

export const runtime = "nodejs";

export async function GET() {
	try {
		const index = await getDeliveryIndex();
		return NextResponse.json({
			ok: true,
			index,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
