import { NextResponse } from "next/server";
import { z } from "zod";
import { publishDeliveryVersion, type DeliveryCompatibility } from "@/lib/content-pack-delivery";

export const runtime = "nodejs";

const compatibilitySchema = z
	.object({
		pluginVersion: z.string().optional(),
		runtimeVersion: z.string().optional(),
		contentSchemaVersion: z.string().optional(),
	})
	.optional();

const publishBodySchema = z.object({
	version: z.string().min(1),
	bundle: z.record(z.string(), z.unknown()),
	report: z.record(z.string(), z.unknown()).optional(),
	compatibility: compatibilitySchema,
});

export async function POST(request: Request) {
	try {
		const body = publishBodySchema.parse(await request.json());
		const result = await publishDeliveryVersion({
			version: body.version,
			bundle: body.bundle,
			report: body.report,
			compatibility: body.compatibility as DeliveryCompatibility | undefined,
		});

		return NextResponse.json({
			ok: true,
			version: result.record.version,
			record: result.record,
			manifest: result.manifest,
			index: {
				latest: result.index.latest,
				count: result.index.versions.length,
				updatedAt: result.index.updatedAt,
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const status = message.includes("required") || message.includes("Invalid") ? 400 : 500;
		return NextResponse.json(
			{
				ok: false,
				error: message,
			},
			{ status },
		);
	}
}
