/**
 * Seed a default owner user when no users exist (e.g. after fresh clone or DB init).
 * Run from repo root: pnpm exec tsx docs-site/scripts/seed-payload.ts
 * Or from docs-site: pnpm exec tsx scripts/seed-payload.ts
 */
import { getPayload } from "payload";
import config from "../payload.config";

const DEFAULT_EMAIL = "admin@example.com";
const DEFAULT_PASSWORD = "changeme";
const DEFAULT_NAME = "Admin";

async function seed() {
	const payload = await getPayload({ config });
	const { totalDocs } = await payload.count({ collection: "users" });
	if (totalDocs > 0) {
		console.log("Users already exist, skipping seed.");
		return;
	}
	await payload.create({
		collection: "users",
		data: {
			email: process.env.SEED_USER_EMAIL ?? DEFAULT_EMAIL,
			password: process.env.SEED_USER_PASSWORD ?? DEFAULT_PASSWORD,
			name: process.env.SEED_USER_NAME ?? DEFAULT_NAME,
			role: "owner",
		},
	});
	console.log(
		"Seeded default owner. Email:",
		process.env.SEED_USER_EMAIL ?? DEFAULT_EMAIL
	);
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
