function increment(row, key) {
	if (!key) return;
	row[key] = (row[key] ?? 0) + 1;
}

function asArray(value) {
	return Array.isArray(value) ? value : [];
}

function uniqueSorted(values) {
	return [...new Set(values.filter(Boolean))].sort((a, b) =>
		a.localeCompare(b),
	);
}

function toLabel(value) {
	return String(value)
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join(" ");
}

function toTypeName(value) {
	return String(value)
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join("");
}

function toConstName(value) {
	return String(value)
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((part) => part.toUpperCase())
		.join("_");
}

function toMemberName(value) {
	const cleaned = String(value).replace(/[^a-zA-Z0-9_]/g, "_");
	if (!cleaned) return "value";
	if (/^[0-9]/.test(cleaned)) return `v_${cleaned}`;
	return cleaned;
}

function toFileSegment(value) {
	const normalized = String(value)
		.trim()
		.replace(/[^a-zA-Z0-9._-]+/g, "-");
	return normalized.replace(/-+/g, "-").replace(/^-|-$/g, "") || "dev";
}

function toJsonText(value) {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function toStringMap(value) {
	const next = {};
	if (!value || typeof value !== "object" || Array.isArray(value)) return next;
	for (const [key, entry] of Object.entries(value)) {
		next[key] = String(entry);
	}
	return next;
}

function countNestedRooms(level) {
	const topLevelRooms = asArray(level.rooms).length;
	const buildingRooms = asArray(level.buildings).reduce(
		(total, building) => total + asArray(building.rooms).length,
		0,
	);
	const townRooms = asArray(level.towns).reduce((total, town) => {
		const direct = asArray(town.buildings).reduce(
			(sum, building) => sum + asArray(building.rooms).length,
			0,
		);
		const districtRooms = asArray(town.districts).reduce(
			(sum, district) =>
				sum +
				asArray(district.buildings).reduce(
					(inner, building) => inner + asArray(building.rooms).length,
					0,
				),
			0,
		);
		return total + direct + districtRooms;
	}, 0);
	return topLevelRooms + buildingRooms + townRooms;
}

function countNestedBuildings(level) {
	const direct = asArray(level.buildings).length;
	const townBuildings = asArray(level.towns).reduce((total, town) => {
		const directTownBuildings = asArray(town.buildings).length;
		const districtBuildings = asArray(town.districts).reduce(
			(sum, district) => sum + asArray(district.buildings).length,
			0,
		);
		return total + directTownBuildings + districtBuildings;
	}, 0);
	return direct + townBuildings;
}

function countNestedDistricts(level) {
	return asArray(level.towns).reduce(
		(total, town) => total + asArray(town.districts).length,
		0,
	);
}

function buildLevelBrowserPayload(levelContent, now = new Date()) {
	return {
		schemaVersion: "level-browser.payload.v1",
		generatedAt: now.toISOString(),
		runs: asArray(levelContent.dungeonRuns).map((run) => ({
			runId: String(run.runId ?? ""),
			title: String(run.title ?? run.runId ?? "run"),
			levelCount: asArray(run.levelIds).length,
			levelIds: asArray(run.levelIds).map((levelId) => String(levelId)),
			startLevelId: String(run.startLevelId ?? ""),
			escapeLevelId: String(run.escapeLevelId ?? ""),
		})),
		levels: asArray(levelContent.levels).map((level) => ({
			levelId: String(level.levelId ?? ""),
			name: String(level.name ?? level.levelId ?? "level"),
			kind: String(level.kind ?? "unknown"),
			theme: level.theme ? String(level.theme) : undefined,
			summary: level.summary ? String(level.summary) : undefined,
			tags: uniqueSorted(asArray(level.tags).map((tag) => String(tag))),
			connectionCount: asArray(level.connections).length,
			structure: {
				townCount: asArray(level.towns).length,
				districtCount: countNestedDistricts(level),
				buildingCount: countNestedBuildings(level),
				roomCount: countNestedRooms(level),
				siteCount: asArray(level.sites).length,
				wildernessZoneCount: asArray(level.wildernessZones).length,
				outskirtsZoneCount: asArray(level.outskirtsZones).length,
				dungeonEntranceCount: asArray(level.dungeonEntrances).length,
			},
			content: {
				entityRefCount: asArray(level.entityRefs).length,
				contentRefCount: asArray(level.contentRefs).length,
				dialogueRefCount: asArray(level.dialogueRefs).length,
				questRefCount: asArray(level.questRefs).length,
			},
			rules: toStringMap(level.rules),
			visualHints: toStringMap(level.visualHints),
		})),
	};
}

export function buildContentPackManifest(
	bundle,
	version = "dev",
	now = new Date(),
) {
	const packs = bundle.packs ?? {};
	const spaceVectors = packs.spaceVectors ?? {};
	const levelContent =
		packs.levelContent && typeof packs.levelContent === "object"
			? packs.levelContent
			: {};
	const featureSchema = asArray(spaceVectors.featureSchema);
	const modelSchemas = asArray(spaceVectors.modelSchemas);
	const contentBindings = spaceVectors.contentBindings ?? {};
	const canonicalModelInstances = asArray(
		contentBindings.canonicalModelInstances,
	);
	const modelById = new Map(
		modelSchemas
			.map((row) => [String(row.modelId ?? ""), row])
			.filter(([id]) => !!id),
	);

	function collectStatClassRefs(modelId) {
		const refs = [];
		const visited = new Set();
		let cursor = modelById.get(modelId);
		while (cursor) {
			const id = String(cursor.modelId ?? "");
			if (!id || visited.has(id)) break;
			visited.add(id);
			if (id.endsWith("stats")) refs.push(id);
			const parent = String(cursor.extendsModelId ?? "");
			cursor = parent ? modelById.get(parent) : null;
		}
		return uniqueSorted(refs);
	}

	const statClasses = modelSchemas
		.filter((row) => String(row.modelId ?? "").endsWith("stats"))
		.map((row) => ({
			statClassId: String(row.modelId ?? ""),
			label: String(row.label ?? toLabel(row.modelId ?? "")),
			description: row.description ? String(row.description) : undefined,
			featureIds: uniqueSorted(
				asArray(row.featureRefs).map((ref) => String(ref.featureId ?? "")),
			),
		}));

	const models = modelSchemas
		.filter((row) => !String(row.modelId ?? "").endsWith("stats"))
		.map((row) => {
			const modelId = String(row.modelId ?? "");
			return {
				modelId,
				label: String(row.label ?? toLabel(modelId)),
				description: row.description ? String(row.description) : undefined,
				extendsModelId: row.extendsModelId
					? String(row.extendsModelId)
					: undefined,
				statClassRefs: collectStatClassRefs(modelId),
				featureRefs: asArray(row.featureRefs).map((ref) => ({
					featureId: String(ref.featureId ?? ""),
					spaces: uniqueSorted(
						asArray(ref.spaces).map((space) => String(space)),
					),
					required: Boolean(ref.required),
					defaultValue:
						typeof ref.defaultValue === "number" ? ref.defaultValue : undefined,
				})),
			};
		});

	const featuresBySpace = new Map();
	for (const row of featureSchema) {
		const featureId = String(row.featureId ?? "");
		for (const space of asArray(row.spaces)) {
			const key = String(space);
			if (!featuresBySpace.has(key)) featuresBySpace.set(key, new Set());
			if (featureId) featuresBySpace.get(key).add(featureId);
		}
	}
	const modelsBySpace = new Map();
	for (const row of models) {
		for (const ref of row.featureRefs) {
			for (const space of ref.spaces) {
				if (!modelsBySpace.has(space)) modelsBySpace.set(space, new Set());
				modelsBySpace.get(space).add(row.modelId);
			}
		}
	}
	const spaces = uniqueSorted([
		...featuresBySpace.keys(),
		...modelsBySpace.keys(),
	]).map((spaceId) => ({
		spaceId,
		label: toLabel(spaceId),
		featureIds: uniqueSorted([...(featuresBySpace.get(spaceId) ?? new Set())]),
		modelIds: uniqueSorted([...(modelsBySpace.get(spaceId) ?? new Set())]),
	}));

	const canonicalAssets = canonicalModelInstances
		.filter((row) => row && row.canonical !== false)
		.map((row) => ({
			assetId: String(row.id ?? ""),
			name: String(row.name ?? row.id ?? "asset"),
			modelId: String(row.modelId ?? ""),
			canonical: true,
		}))
		.filter((row) => row.assetId && row.modelId);

	return {
		schemaVersion: "content-pack.manifest.v1",
		generatedAt: now.toISOString(),
		buildVersion: version,
		packIdentity: {
			packId: String(bundle.patchName ?? "content-pack.bundle.v1"),
			packVersion: String(bundle.generatedAt ?? "unknown"),
			packHash: String(bundle.hashes?.overall ?? "unknown"),
			schemaVersion: String(bundle.schemaVersion ?? "content-pack.bundle.v1"),
			engineVersion: String(bundle.enginePackage?.version ?? "unknown"),
		},
		statClasses,
		models,
		canonicalAssets,
		spaces,
		levels: {
			levelCount: asArray(levelContent.levels).length,
			dungeonRunCount: asArray(levelContent.dungeonRuns).length,
			levelKinds: uniqueSorted(
				asArray(levelContent.levels).map((row) => String(row.kind ?? "")),
			),
		},
	};
}

export function buildContentPackSchemaBundle(
	manifest,
	version = "dev",
	now = new Date(),
) {
	const modelSchemas = {};
	for (const model of manifest.models) {
		modelSchemas[model.modelId] = {
			type: "object",
			title: model.label,
			description: model.description,
			allOf: model.extendsModelId
				? [{ $ref: `#/definitions/models/${model.extendsModelId}` }]
				: undefined,
			properties: Object.fromEntries(
				model.featureRefs.map((ref) => [
					ref.featureId,
					{
						type: "number",
						default: ref.defaultValue ?? 0,
						"x-spaces": ref.spaces,
						"x-required": ref.required,
					},
				]),
			),
			required: model.featureRefs
				.filter((ref) => ref.required)
				.map((ref) => ref.featureId),
			"x-stat-classes": model.statClassRefs,
		};
	}
	return {
		$schema: "https://json-schema.org/draft/2020-12/schema",
		schemaVersion: "content-pack.schema-bundle.v1",
		generatedAt: now.toISOString(),
		buildVersion: version,
		manifestSchemaVersion: manifest.schemaVersion,
		definitions: {
			statClasses: Object.fromEntries(
				manifest.statClasses.map((row) => [
					row.statClassId,
					{
						type: "object",
						title: row.label,
						description: row.description,
						properties: Object.fromEntries(
							row.featureIds.map((featureId) => [
								featureId,
								{ type: "number" },
							]),
						),
					},
				]),
			),
			models: modelSchemas,
		},
		"x-spaces": manifest.spaces,
	};
}

export function buildContentPackLanguageStubs(manifest) {
	const tsLines = ["// generated from content-pack.manifest.v1", ""];
	const cppLines = [
		"#pragma once",
		"// generated from content-pack.manifest.v1",
		"",
	];
	const csLines = ["// generated from content-pack.manifest.v1", ""];

	for (const model of manifest.models) {
		const tsType = `${toTypeName(model.modelId)}Model`;
		const tsParent = model.extendsModelId
			? `${toTypeName(model.extendsModelId)}Model`
			: "";
		tsLines.push(
			`export interface ${tsType}${tsParent ? ` extends ${tsParent}` : ""} {`,
		);
		for (const ref of model.featureRefs) {
			tsLines.push(`  "${ref.featureId}": number;`);
		}
		tsLines.push("}", "");
		tsLines.push(
			`export const ${toConstName(model.modelId)}_DEFAULTS: Partial<${tsType}> = {`,
		);
		for (const ref of model.featureRefs) {
			tsLines.push(
				`  "${ref.featureId}": ${(ref.defaultValue ?? 0).toFixed(3)},`,
			);
		}
		tsLines.push("};", "");

		const cppType = `${toTypeName(model.modelId)}Model`;
		const cppParent = model.extendsModelId
			? `${toTypeName(model.extendsModelId)}Model`
			: "";
		cppLines.push(`struct ${cppType}${cppParent ? ` : ${cppParent}` : ""} {`);
		for (const ref of model.featureRefs) {
			cppLines.push(
				`  float ${toMemberName(ref.featureId)} = ${(ref.defaultValue ?? 0).toFixed(3)}f;`,
			);
		}
		cppLines.push("};", "");

		const csType = `${toTypeName(model.modelId)}Model`;
		const csParent = model.extendsModelId
			? ` : ${toTypeName(model.extendsModelId)}Model`
			: "";
		csLines.push(`public record class ${csType}${csParent}`);
		csLines.push("{");
		for (const ref of model.featureRefs) {
			csLines.push(
				`  public float ${toTypeName(ref.featureId)} { get; init; } = ${(ref.defaultValue ?? 0).toFixed(3)}f;`,
			);
		}
		csLines.push("}", "");
	}

	return {
		typescript: `${tsLines.join("\n")}\n`,
		cpp: `${cppLines.join("\n")}\n`,
		csharp: `${csLines.join("\n")}\n`,
	};
}

export function buildContentPackReleaseReport(
	bundle,
	version = "dev",
	now = new Date(),
) {
	const packs = bundle.packs ?? {};
	const spaceVectors = packs.spaceVectors ?? {};
	const levelContent =
		packs.levelContent && typeof packs.levelContent === "object"
			? packs.levelContent
			: {};
	const featureSchema = Array.isArray(spaceVectors.featureSchema)
		? spaceVectors.featureSchema
		: [];
	const modelSchemas = Array.isArray(spaceVectors.modelSchemas)
		? spaceVectors.modelSchemas
		: [];
	const groups = {};
	const spaces = {};
	const modelPrefixes = {};
	const featureIds = new Set(
		featureSchema.map((row) => String(row.featureId ?? "")).filter(Boolean),
	);
	const unresolvedFeatureRefs = [];

	for (const row of featureSchema) {
		for (const group of row.groups ?? []) increment(groups, String(group));
		for (const space of row.spaces ?? []) increment(spaces, String(space));
	}

	for (const row of modelSchemas) {
		const modelId = String(row.modelId ?? "");
		const prefix = modelId.includes(".") ? modelId.split(".")[0] : "other";
		increment(modelPrefixes, prefix);
		for (const ref of row.featureRefs ?? []) {
			const featureId = String(ref.featureId ?? "");
			if (featureId && !featureIds.has(featureId)) {
				unresolvedFeatureRefs.push(`${modelId}:${featureId}`);
			}
			for (const space of ref.spaces ?? []) increment(spaces, String(space));
		}
	}

	return {
		schemaVersion: "content-pack.release-report.v1",
		generatedAt: now.toISOString(),
		buildVersion: version,
		bundle: {
			schemaVersion: bundle.schemaVersion,
			enginePackage: bundle.enginePackage ?? {},
			hashes: bundle.hashes ?? {},
		},
		summary: {
			packKeys: Object.keys(packs).sort((a, b) => a.localeCompare(b)),
			spaceVectors: {
				featureCount: featureSchema.length,
				modelCount: modelSchemas.length,
				groups,
				spaces,
				modelPrefixes,
				unresolvedFeatureRefs: [...new Set(unresolvedFeatureRefs)].sort(
					(a, b) => a.localeCompare(b),
				),
			},
			levelContent: {
				levelCount: asArray(levelContent.levels).length,
				dungeonRunCount: asArray(levelContent.dungeonRuns).length,
				levelKinds: uniqueSorted(
					asArray(levelContent.levels).map((row) => String(row.kind ?? "")),
				),
			},
		},
	};
}

function buildContentPackReleaseIndex({
	bundle,
	report,
	generatedOutputs,
	version,
	now,
}) {
	const artifactNames = Object.fromEntries(
		generatedOutputs
			.filter((output) => output.artifactId !== "index")
			.map((output) => [output.artifactId, output.fileName]),
	);
	return {
		schemaVersion: "content-pack.release-index.v1",
		generatedAt: now.toISOString(),
		buildVersion: version,
		artifacts: artifactNames,
		hashes: bundle.hashes ?? {},
		summary: {
			featureCount: report.summary.spaceVectors.featureCount,
			modelCount: report.summary.spaceVectors.modelCount,
			levelCount: report.summary.levelContent.levelCount,
			dungeonRunCount: report.summary.levelContent.dungeonRunCount,
		},
	};
}

export function buildContentPackReleaseArtifacts(bundle, options = {}) {
	const version = String(options.version ?? "dev");
	const now = options.now instanceof Date ? options.now : new Date();
	const fileVersion = toFileSegment(version);
	const manifest = buildContentPackManifest(bundle, version, now);
	const report = buildContentPackReleaseReport(bundle, version, now);
	const schemaBundle = buildContentPackSchemaBundle(manifest, version, now);
	const stubs = buildContentPackLanguageStubs(manifest);
	const levelContent =
		bundle.packs?.levelContent && typeof bundle.packs.levelContent === "object"
			? bundle.packs.levelContent
			: null;
	const levelBrowserPayload = levelContent
		? buildLevelBrowserPayload(levelContent, now)
		: null;

	const generatedOutputs = [
		{
			artifactId: "report",
			label: "Release Report",
			fileName: `content-pack-report.${fileVersion}.json`,
			contentType: "application/json",
			language: "json",
			text: toJsonText(report),
		},
		{
			artifactId: "manifest",
			label: "Manifest",
			fileName: `content-pack.manifest.${fileVersion}.json`,
			contentType: "application/json",
			language: "json",
			text: toJsonText(manifest),
		},
		{
			artifactId: "schemaBundle",
			label: "Schema Bundle",
			fileName: `content-pack.schema-bundle.${fileVersion}.json`,
			contentType: "application/json",
			language: "json",
			text: toJsonText(schemaBundle),
		},
		...(levelContent
			? [
					{
						artifactId: "levelContentDocument",
						label: "Level Content Document",
						fileName: `level-content.document.${fileVersion}.json`,
						contentType: "application/json",
						language: "json",
						text: toJsonText(levelContent),
					},
					{
						artifactId: "levelBrowserPayload",
						label: "Level Browser Payload",
						fileName: `level-browser.payload.${fileVersion}.json`,
						contentType: "application/json",
						language: "json",
						text: toJsonText(levelBrowserPayload),
					},
				]
			: []),
		{
			artifactId: "modelsTs",
			label: "TypeScript Stubs",
			fileName: `content-pack-models.${fileVersion}.ts`,
			contentType: "text/x-typescript",
			language: "typescript",
			text: stubs.typescript,
		},
		{
			artifactId: "modelsCpp",
			label: "C++ Stubs",
			fileName: `content-pack-models.${fileVersion}.hpp`,
			contentType: "text/x-c++src",
			language: "cpp",
			text: stubs.cpp,
		},
		{
			artifactId: "modelsCsharp",
			label: "C# Stubs",
			fileName: `content-pack-models.${fileVersion}.cs`,
			contentType: "text/plain",
			language: "csharp",
			text: stubs.csharp,
		},
	];

	const index = buildContentPackReleaseIndex({
		bundle,
		report,
		generatedOutputs,
		version,
		now,
	});

	generatedOutputs.push({
		artifactId: "index",
		label: "Release Index",
		fileName: `content-pack-index.${fileVersion}.json`,
		contentType: "application/json",
		language: "json",
		text: toJsonText(index),
	});

	return {
		generatedAt: now.toISOString(),
		version,
		manifest,
		report,
		schemaBundle,
		stubs,
		index,
		generatedOutputs,
	};
}
