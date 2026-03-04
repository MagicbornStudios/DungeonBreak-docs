import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/page";

export const metadata = {
	title: "Content Delivery System",
	description:
		"End-to-end workflow from content authoring to Supabase delivery, Unreal plugin import, and Dolt lineage.",
};

export default function ContentDeliverySystemPage() {
	return (
		<DocsPage footer={{ enabled: false }} tableOfContent={{ style: "normal", single: false }} toc={[]}>
			<DocsTitle className="font-bold font-serif text-4xl md:text-5xl">
				Content Delivery System
			</DocsTitle>
			<DocsDescription>
				End-to-end workflow from Content Editor and Space Explorer to Supabase delivery, Unreal import, and Dolt lineage.
			</DocsDescription>
			<DocsBody>
				<div className="fd-prose">
					<h2>Quick start (how to run it)</h2>
					<ol>
						<li>Build a content-pack bundle from Space Explorer/content data.</li>
						<li>Publish that bundle to delivery storage with a version.</li>
						<li>Pull the version for Unreal and use signed download links.</li>
						<li>Verify/import in plugin runtime and monitor telemetry.</li>
					</ol>

					<h3>1) Build artifacts</h3>
					<pre>
						<code>{`pnpm --dir docs-site run content:ingest
pnpm --dir packages/engine run build:content-pack-release-artifacts -- --bundle <bundle-path> --version <version> --out-dir <out-dir>`}</code>
					</pre>

					<h3>2) Publish a version</h3>
					<pre>
						<code>{`POST /api/content-packs/delivery/publish
{
  "version": "2026.03.04-rc1",
  "bundle": { ... },
  "compatibility": {
    "pluginVersion": "1.0.0",
    "runtimeVersion": "UE5.4",
    "contentSchemaVersion": "content-pack.bundle.v1"
  }
}`}</code>
					</pre>
					<p>
						Expected result: versioned artifacts are stored, index is updated, and latest points to the published version.
					</p>

					<h3>3) Pull for Unreal</h3>
					<pre>
						<code>{`POST /api/content-packs/delivery/pull
{
  "compatibility": {
    "pluginVersion": "1.0.0",
    "runtimeVersion": "UE5.4"
  }
}`}</code>
					</pre>
					<p>
						Expected result: response includes selected version metadata and signed download URLs for bundle/manifest/report.
					</p>

					<h3>4) Download via signed URL</h3>
					<pre>
						<code>{`GET /api/content-packs/delivery/download?key=...&expires=...&sig=...`}</code>
					</pre>
					<p>
						Expected result: artifact is returned when signature is valid and not expired; invalid/expired links fail.
					</p>

					<h2>Who this is for</h2>
					<ul>
						<li>Content designers authoring schema and canonical assets.</li>
						<li>Release engineers building and publishing downloadable packs.</li>
						<li>Unreal integrators importing verified packs into plugin/runtime workflows.</li>
						<li>Platform and support owners handling observability and rollback.</li>
					</ul>

					<h2>System roles</h2>
					<ul>
						<li>
							<strong>Supabase/S3</strong>: runtime system of record for downloadable artifacts.
						</li>
						<li>
							<strong>Dolt</strong>: optional build-time lineage for content patch history.
						</li>
						<li>
							<strong>Unreal plugin</strong>: pull, verify, import, and load content packs.
						</li>
					</ul>

					<h2>End-to-end workflow</h2>
					<ol>
						<li>Author schema and canonical content in Space Explorer/Content Creator.</li>
						<li>Optionally capture patch lineage in Dolt (`content_pack_patches`).</li>
						<li>Ingest and build release artifacts (bundle, manifest, report, provenance hash).</li>
						<li>Publish immutable versioned artifacts to Supabase object storage.</li>
						<li>Unreal plugin resolves version, pulls signed URL, verifies integrity, imports.</li>
						<li>Telemetry captures success/failure and drives rollback decisions.</li>
					</ol>

					<h2>Workflow loops and owners</h2>
					<ul>
						<li>
							<strong>Authoring loop (content designers)</strong>: iterate content quickly until bundle validation passes.
						</li>
						<li>
							<strong>Delivery loop (release engineers)</strong>: publish indexed versions and validate signed download flow.
						</li>
						<li>
							<strong>Runtime loop (Unreal integrators)</strong>: verify and import packs safely in editor/runtime.
						</li>
						<li>
							<strong>Ops loop (platform/support)</strong>: monitor failures, triage incidents, rollback on bad versions.
						</li>
						<li>
							<strong>Dolt governance loop (future phase)</strong>: branch/merge/promotion policy for lineage governance.
						</li>
					</ul>

					<h2>What to expect</h2>
					<ul>
						<li>Local authoring can run without remote publish.</li>
						<li>Runtime distribution goes through Supabase-signed artifact delivery.</li>
						<li>Dolt improves auditability but is not a runtime dependency.</li>
						<li>Failures are diagnosed by manifest/hash/index telemetry, not manual guesswork.</li>
					</ul>

					<h2>Operational notes</h2>
					<pre>
						<code>{`# Delivery index status
GET /api/content-packs/delivery/index

# Optional secret transport workflow
pnpm env:bundle:seal -- --entry docs-site=docs-site/.env --entry unreal-plugin=plugins/DB_Unreal_DLC_Plugin/.env --out .secrets/env.bundle.sealed.json`}</code>
					</pre>
				</div>
			</DocsBody>
		</DocsPage>
	);
}
