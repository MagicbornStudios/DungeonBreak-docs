import { createHmac } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { buildContentPackManifest, type ContentPackBundle, type ContentPackManifest } from "@/lib/content-pack-manifest";

const DELIVERY_INDEX_VERSION = "content-pack.delivery.index.v1";
const INDEX_KEY = "content-packs/index/content-pack.delivery.index.v1.json";
const DEFAULT_URL_TTL_SECONDS = 15 * 60;

type JsonObject = Record<string, unknown>;

export type DeliveryCompatibility = {
	pluginVersion?: string;
	runtimeVersion?: string;
	contentSchemaVersion?: string;
};

export type DeliveryVersionRecord = {
	version: string;
	packId: string;
	packHash: string;
	publishedAt: string;
	compatibility: DeliveryCompatibility;
	artifacts: {
		bundleKey: string;
		manifestKey: string;
		reportKey?: string;
	};
};

export type DeliveryIndex = {
	schemaVersion: typeof DELIVERY_INDEX_VERSION;
	updatedAt: string;
	latest: string | null;
	versions: DeliveryVersionRecord[];
};

export type PublishInput = {
	version: string;
	bundle: ContentPackBundle;
	report?: JsonObject;
	compatibility?: DeliveryCompatibility;
};

function requiredEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function optionalEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : undefined;
}

function getS3Client(): { client: S3Client; bucket: string } {
	const bucket = requiredEnv("S3_BUCKET");
	const region = requiredEnv("S3_REGION");
	const endpoint = optionalEnv("S3_ENDPOINT");
	const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
	const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");
	const client = new S3Client({
		region,
		endpoint,
		forcePathStyle: true,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});
	return { client, bucket };
}

function toJsonString(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

async function putJsonObject(key: string, value: unknown): Promise<void> {
	const { client, bucket } = getS3Client();
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: toJsonString(value),
			ContentType: "application/json",
		}),
	);
}

async function readBodyAsString(body: unknown): Promise<string> {
	if (!body) return "";
	if (typeof body === "string") return body;
	if (typeof body === "object" && body !== null && "transformToString" in body) {
		const transform = (body as { transformToString?: (encoding?: string) => Promise<string> }).transformToString;
		if (typeof transform === "function") {
			return transform("utf-8");
		}
	}
	if (typeof body === "object" && body !== null && Symbol.asyncIterator in body) {
		const chunks: Buffer[] = [];
		for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		}
		return Buffer.concat(chunks).toString("utf8");
	}
	throw new Error("Unsupported S3 response body type.");
}

async function getJsonObject<T>(key: string): Promise<T | null> {
	const { client, bucket } = getS3Client();
	try {
		const response = await client.send(
			new GetObjectCommand({
				Bucket: bucket,
				Key: key,
			}),
		);
		const text = await readBodyAsString(response.Body);
		if (!text) return null;
		return JSON.parse(text) as T;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("NoSuchKey") || message.includes("not exist")) {
			return null;
		}
		throw error;
	}
}

function releasePrefix(version: string): string {
	return `content-packs/releases/${version}`;
}

function buildRecord(input: PublishInput, manifest: ContentPackManifest): DeliveryVersionRecord {
	const prefix = releasePrefix(input.version);
	return {
		version: input.version,
		packId: manifest.packIdentity.packId,
		packHash: manifest.packIdentity.packHash,
		publishedAt: new Date().toISOString(),
		compatibility: {
			pluginVersion: input.compatibility?.pluginVersion ?? "*",
			runtimeVersion: input.compatibility?.runtimeVersion ?? "*",
			contentSchemaVersion: input.compatibility?.contentSchemaVersion ?? manifest.packIdentity.schemaVersion,
		},
		artifacts: {
			bundleKey: `${prefix}/content-pack.bundle.v1.json`,
			manifestKey: `${prefix}/content-pack.manifest.v1.json`,
			reportKey: input.report ? `${prefix}/content-pack.report.v1.json` : undefined,
		},
	};
}

export async function publishDeliveryVersion(input: PublishInput): Promise<{
	record: DeliveryVersionRecord;
	index: DeliveryIndex;
	manifest: ContentPackManifest;
}> {
	const manifest = buildContentPackManifest(input.bundle);
	const record = buildRecord(input, manifest);

	await putJsonObject(record.artifacts.bundleKey, input.bundle);
	await putJsonObject(record.artifacts.manifestKey, manifest);
	if (input.report && record.artifacts.reportKey) {
		await putJsonObject(record.artifacts.reportKey, input.report);
	}

	const existing = (await getJsonObject<DeliveryIndex>(INDEX_KEY)) ?? {
		schemaVersion: DELIVERY_INDEX_VERSION,
		updatedAt: new Date(0).toISOString(),
		latest: null,
		versions: [],
	};
	const withoutCurrent = existing.versions.filter((item) => item.version !== record.version);
	const nextIndex: DeliveryIndex = {
		schemaVersion: DELIVERY_INDEX_VERSION,
		updatedAt: new Date().toISOString(),
		latest: record.version,
		versions: [record, ...withoutCurrent].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
	};
	await putJsonObject(INDEX_KEY, nextIndex);

	return { record, index: nextIndex, manifest };
}

export async function getDeliveryIndex(): Promise<DeliveryIndex> {
	return (
		(await getJsonObject<DeliveryIndex>(INDEX_KEY)) ?? {
			schemaVersion: DELIVERY_INDEX_VERSION,
			updatedAt: new Date(0).toISOString(),
			latest: null,
			versions: [],
		}
	);
}

function matchesOrWildcard(expected: string | undefined, actual: string | undefined): boolean {
	if (!expected || expected === "*") return true;
	if (!actual || actual === "*") return true;
	return expected === actual;
}

export function selectVersion(
	index: DeliveryIndex,
	options: {
		version?: string;
		compatibility?: DeliveryCompatibility;
	},
): DeliveryVersionRecord | null {
	if (options.version) {
		return index.versions.find((item) => item.version === options.version) ?? null;
	}
	const candidate = index.versions.find((item) => {
		const expected = options.compatibility;
		if (!expected) return true;
		return (
			matchesOrWildcard(expected.pluginVersion, item.compatibility.pluginVersion) &&
			matchesOrWildcard(expected.runtimeVersion, item.compatibility.runtimeVersion) &&
			matchesOrWildcard(expected.contentSchemaVersion, item.compatibility.contentSchemaVersion)
		);
	});
	return candidate ?? null;
}

function signingSecret(): string {
	return requiredEnv("PAYLOAD_SECRET");
}

function hmacSignature(payload: string): string {
	return createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

export function createSignedDeliveryPath(
	key: string,
	options?: {
		ttlSeconds?: number;
	},
): string {
	const expires = Math.floor(Date.now() / 1000) + (options?.ttlSeconds ?? DEFAULT_URL_TTL_SECONDS);
	const payload = `${key}:${expires}`;
	const sig = hmacSignature(payload);
	const params = new URLSearchParams({
		key,
		expires: String(expires),
		sig,
	});
	return `/api/content-packs/delivery/download?${params.toString()}`;
}

export function validateSignedDeliveryRequest(query: URLSearchParams): {
	key: string;
	expires: number;
} {
	const key = query.get("key") ?? "";
	const expires = Number(query.get("expires") ?? "0");
	const sig = query.get("sig") ?? "";
	if (!key || !Number.isFinite(expires) || !sig) {
		throw new Error("Missing or invalid signed download query parameters.");
	}
	const now = Math.floor(Date.now() / 1000);
	if (expires < now) {
		throw new Error("Signed URL expired.");
	}
	const expected = hmacSignature(`${key}:${expires}`);
	if (expected !== sig) {
		throw new Error("Invalid signed URL signature.");
	}
	return { key, expires };
}

export async function fetchDeliveryArtifact(key: string): Promise<{
	body: Uint8Array;
	contentType: string;
}> {
	const { client, bucket } = getS3Client();
	const response = await client.send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
		}),
	);
	const text = await readBodyAsString(response.Body);
	return {
		body: new TextEncoder().encode(text),
		contentType: response.ContentType || "application/json",
	};
}
