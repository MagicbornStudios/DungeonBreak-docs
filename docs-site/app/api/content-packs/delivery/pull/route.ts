import { NextResponse } from "next/server";
import { z } from "zod";
import {
	createSignedDeliveryPath,
	getDeliveryIndex,
	selectVersion,
	type DeliveryCompatibility,
} from "@/lib/content-pack-delivery";

export const runtime = "nodejs";

const pullBodySchema = z.object({
	version: z.string().optional(),
	compatibility: z
		.object({
			pluginVersion: z.string().optional(),
			runtimeVersion: z.string().optional(),
			contentSchemaVersion: z.string().optional(),
		})
		.optional(),
	ttlSeconds: z.number().int().positive().max(24 * 60 * 60).optional(),
});

export async function POST(request: Request) {
	try {
		const body = pullBodySchema.parse(await request.json());
		const index = await getDeliveryIndex();
		const record = selectVersion(index, {
			version: body.version,
			compatibility: body.compatibility as DeliveryCompatibility | undefined,
		});

		if (!record) {
			return NextResponse.json(
				{
					ok: false,
					error: "No matching content-pack version found.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json({
			ok: true,
			version: record.version,
			record,
			downloads: {
				bundle: createSignedDeliveryPath(record.artifacts.bundleKey, { ttlSeconds: body.ttlSeconds }),
				manifest: createSignedDeliveryPath(record.artifacts.manifestKey, { ttlSeconds: body.ttlSeconds }),
				report: record.artifacts.reportKey
					? createSignedDeliveryPath(record.artifacts.reportKey, { ttlSeconds: body.ttlSeconds })
					: null,
			},
			index: {
				latest: index.latest,
				updatedAt: index.updatedAt,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const status = message.includes("Invalid") ? 400 : 500;
		return NextResponse.json(
			{
				ok: false,
				error: message,
			},
			{ status },
		);
	}
}
