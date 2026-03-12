export type ContentPackBundle = {
	schemaVersion?: string;
	generatedAt?: string;
	patchName?: string;
	enginePackage?: { name?: string; version?: string };
	hashes?: Record<string, string>;
	packs?: Record<string, unknown>;
};

export type ContentPackManifest = {
	schemaVersion: "content-pack.manifest.v1";
	generatedAt: string;
	buildVersion: string;
	packIdentity: {
		packId: string;
		packVersion: string;
		packHash: string;
		schemaVersion: string;
		engineVersion: string;
	};
	statClasses: Array<{
		statClassId: string;
		label: string;
		description?: string;
		featureIds: string[];
	}>;
	models: Array<{
		modelId: string;
		label: string;
		description?: string;
		extendsModelId?: string;
		statClassRefs: string[];
		featureRefs: Array<{
			featureId: string;
			spaces: string[];
			required: boolean;
			defaultValue?: number;
		}>;
	}>;
	canonicalAssets: Array<{
		assetId: string;
		name: string;
		modelId: string;
		canonical: true;
	}>;
	spaces: Array<{
		spaceId: string;
		label: string;
		featureIds: string[];
		modelIds: string[];
	}>;
	levels: {
		levelCount: number;
		dungeonRunCount: number;
		levelKinds: string[];
	};
};

export type ContentPackSchemaBundle = {
	$schema: string;
	schemaVersion: "content-pack.schema-bundle.v1";
	generatedAt: string;
	buildVersion: string;
	manifestSchemaVersion: string;
	definitions: Record<string, unknown>;
	"x-spaces": Array<{
		spaceId: string;
		label: string;
		featureIds: string[];
		modelIds: string[];
	}>;
};

export type ContentPackReleaseReport = {
	schemaVersion: "content-pack.release-report.v1";
	generatedAt: string;
	buildVersion: string;
	bundle: {
		schemaVersion?: string;
		enginePackage: Record<string, unknown>;
		hashes: Record<string, string>;
	};
	summary: {
		packKeys: string[];
		spaceVectors: {
			featureCount: number;
			modelCount: number;
			groups: Record<string, number>;
			spaces: Record<string, number>;
			modelPrefixes: Record<string, number>;
			unresolvedFeatureRefs: string[];
		};
		levelContent: {
			levelCount: number;
			dungeonRunCount: number;
			levelKinds: string[];
		};
	};
};

export type ContentPackGeneratedOutput = {
	artifactId:
		| "report"
		| "manifest"
		| "schemaBundle"
		| "levelContentDocument"
		| "levelBrowserPayload"
		| "modelsTs"
		| "modelsCpp"
		| "modelsCsharp"
		| "index";
	label: string;
	fileName: string;
	contentType: string;
	language: "json" | "typescript" | "cpp" | "csharp";
	text: string;
};

export type ContentPackReleaseArtifacts = {
	generatedAt: string;
	version: string;
	manifest: ContentPackManifest;
	report: ContentPackReleaseReport;
	schemaBundle: ContentPackSchemaBundle;
	stubs: {
		typescript: string;
		cpp: string;
		csharp: string;
	};
	index: {
		schemaVersion: "content-pack.release-index.v1";
		generatedAt: string;
		buildVersion: string;
		artifacts: Record<string, string>;
		hashes: Record<string, string>;
		summary: {
			featureCount: number;
			modelCount: number;
			levelCount: number;
			dungeonRunCount: number;
		};
	};
	generatedOutputs: ContentPackGeneratedOutput[];
};

export function buildContentPackManifest(
	bundle: ContentPackBundle,
	version?: string,
	now?: Date,
): ContentPackManifest;
export function buildContentPackSchemaBundle(
	manifest: ContentPackManifest,
	version?: string,
	now?: Date,
): ContentPackSchemaBundle;
export function buildContentPackLanguageStubs(manifest: ContentPackManifest): {
	typescript: string;
	cpp: string;
	csharp: string;
};
export function buildContentPackReleaseReport(
	bundle: ContentPackBundle,
	version?: string,
	now?: Date,
): ContentPackReleaseReport;
export function buildContentPackReleaseArtifacts(
	bundle: ContentPackBundle,
	options?: { version?: string; now?: Date },
): ContentPackReleaseArtifacts;
