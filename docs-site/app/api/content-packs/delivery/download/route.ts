import { NextResponse } from "next/server";
import { fetchDeliveryArtifact, validateSignedDeliveryRequest } from "@/lib/content-pack-delivery";

export const runtime = "nodejs";

export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const { key } = validateSignedDeliveryRequest(url.searchParams);
		const artifact = await fetchDeliveryArtifact(key);
		return new NextResponse(Buffer.from(artifact.body), {
			status: 200,
			headers: {
				"content-type": artifact.contentType,
				"cache-control": "private, max-age=60",
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 401 },
		);
	}
}
