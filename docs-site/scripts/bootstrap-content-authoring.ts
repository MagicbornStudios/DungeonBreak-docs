import { getPayload } from "payload";
import config from "../payload.config";
import {
  createProject,
  importCanonicalPacks,
  projectDetail,
  publishProjectToGame,
} from "../lib/content-editor/payload-content-authoring";

type Args = {
  name: string;
  slug: string;
  publish: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    name: "Canonical Game Content",
    slug: "canonical-game-content",
    publish: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--name") {
      args.name = String(argv[index + 1] ?? args.name);
      index += 1;
      continue;
    }
    if (arg === "--slug") {
      args.slug = String(argv[index + 1] ?? args.slug);
      index += 1;
      continue;
    }
    if (arg === "--publish") {
      args.publish = true;
    }
  }

  return args;
}

async function ensureProject(projectName: string, projectSlug: string) {
  const payload = await getPayload({ config });
  const existing = await payload.find({
    collection: "content-projects",
    where: {
      slug: {
        equals: projectSlug,
      },
    },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });

  if (existing.docs[0]) {
    return {
      payload,
      projectId: String(existing.docs[0].id),
      created: false,
    };
  }

  const created = await createProject(payload, {
    name: projectName,
    slug: projectSlug,
    description: "Payload-backed canonical content project imported from engine contracts.",
    notes:
      "Bootstrapped by scripts/bootstrap-content-authoring.ts for the content editor hardening loop.",
  });

  return {
    payload,
    projectId: String(created.id ?? ""),
    created: true,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { payload, projectId, created } = await ensureProject(args.name, args.slug);
  const importResult = await importCanonicalPacks(payload, projectId);
  const detail = await projectDetail(payload, projectId);

  console.log(
    JSON.stringify(
      {
        ok: true,
        created,
        projectId,
        project: detail.project,
        imported: importResult.imported,
        importedPackIds: importResult.packs,
        removedPackIds: importResult.removed,
        packCount: detail.packs.length,
        schemaImportCount: detail.schemaImports.length,
      },
      null,
      2,
    ),
  );

  if (!args.publish) {
    return;
  }

  const publish = await publishProjectToGame(payload, projectId);
  console.log(
    JSON.stringify(
      {
        ok: true,
        published: true,
        projectId,
        publish,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
