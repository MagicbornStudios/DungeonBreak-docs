#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildContentPackReleaseArtifacts } from "./lib/content-pack-release-artifacts.mjs";

function parseArgs(argv) {
	const out = {
		bundle: "",
		version: "dev",
		outDir: "release-artifacts",
	};
	for (let i = 2; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--bundle") {
			out.bundle = String(argv[i + 1] ?? "");
			i += 1;
			continue;
		}
		if (arg === "--version") {
			out.version = String(argv[i + 1] ?? "dev");
			i += 1;
			continue;
		}
		if (arg === "--out-dir") {
			out.outDir = String(argv[i + 1] ?? "release-artifacts");
			i += 1;
			continue;
		}
	}
	return out;
}

const args = parseArgs(process.argv);
if (!args.bundle) {
	console.error("Missing --bundle path");
	process.exit(1);
}

const bundlePath = resolve(process.cwd(), args.bundle);
const outDir = resolve(process.cwd(), args.outDir);
const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
const artifacts = buildContentPackReleaseArtifacts(bundle, {
	version: args.version,
});

mkdirSync(outDir, { recursive: true });
const bundleOutName = `content-pack.bundle.${args.version}.v1.json`;
const bundleOutPath = join(outDir, bundleOutName);

writeFileSync(bundleOutPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
for (const output of artifacts.generatedOutputs) {
	writeFileSync(join(outDir, output.fileName), output.text, "utf8");
}

console.log(`[content-pack-release] wrote ${bundleOutPath}`);
for (const output of artifacts.generatedOutputs) {
	console.log(`[content-pack-release] wrote ${join(outDir, output.fileName)}`);
}
