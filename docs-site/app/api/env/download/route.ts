import configPromise from "@payload-config";
import { createPayloadRequest, getPayload } from "payload";
import { NextResponse } from "next/server";

type EnvVariable = {
	key?: string;
	value?: string;
	envAll?: boolean;
	envDevelopment?: boolean;
	envProduction?: boolean;
	envStaging?: boolean;
	// legacy
	environment?: string;
};

function serializeEnvLine(key: string, value: string): string {
	const trimmed = value.trim();
	if (trimmed === "") return `${key}=`;
	if (/[\n#"']/.test(trimmed))
		return `${key}="${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	return `${key}=${trimmed}`;
}

function matchesEnvironment(
	v: EnvVariable,
	envFilter: string
): boolean {
	if (v.envAll) return true;
	switch (envFilter) {
		case "development":
			return Boolean(v.envDevelopment);
		case "production":
			return Boolean(v.envProduction);
		case "staging":
			return Boolean(v.envStaging);
		default:
			return true;
	}
}

export async function GET(request: Request) {
	try {
		const req = await createPayloadRequest({
			config: configPromise,
			request,
		});
		const payload = await getPayload({ config: configPromise });
		const envGlobal = (await payload.findGlobal({
			slug: "env",
			req,
			overrideAccess: false,
		})) as { variables?: EnvVariable[] };
		const variables = envGlobal?.variables ?? [];
		const envFilter = new URL(request.url).searchParams.get("environment") ?? "";
		const filtered =
			envFilter.length > 0
				? variables.filter((v) => matchesEnvironment(v, envFilter))
				: variables;
		const lines = filtered
			.filter((v) => v.key != null && v.key.trim() !== "")
			.map((v) =>
				serializeEnvLine(
					v.key!.trim(),
					typeof v.value === "string" ? v.value : ""
				)
			);
		const content = lines.join("\n") + (lines.length ? "\n" : "");
		return new NextResponse(content, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Content-Disposition": 'attachment; filename=".env"',
			},
		});
	} catch {
		return NextResponse.json(
			{ error: "Forbidden or not found" },
			{ status: 403 }
		);
	}
}
