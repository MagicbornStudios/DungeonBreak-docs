#!/usr/bin/env node
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ALGORITHM = "aes-256-gcm";
const DEFAULT_KEY_ENV = "ENV_BUNDLE_KEY";

const usage = () => {
  console.log(`Usage:
  node scripts/env-bundle.mjs seal --entry <name=path> [--entry <name=path> ...] [--out <sealed.json>] [--key-env <ENV_VAR>] [--key-id <id>]
  node scripts/env-bundle.mjs unseal --in <sealed.json> [--entry <name>] [--out <path>] [--out-dir <dir>] [--key-env <ENV_VAR>]

Key input:
  Set ENV_BUNDLE_KEY (or --key-env var) as one of:
  - raw 64-char hex
  - base64:<value>
  - hex:<value>
`);
};

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(args, key)) {
      const prior = args[key];
      args[key] = Array.isArray(prior) ? [...prior, value] : [prior, value];
    } else {
      args[key] = value;
    }
    i += 1;
  }
  return args;
};

const normalizeEntries = (raw) => {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map((entry) => {
    const index = entry.indexOf("=");
    if (index <= 0 || index === entry.length - 1) {
      throw new Error(`Invalid --entry '${entry}'. Expected --entry name=path.`);
    }
    return {
      name: entry.slice(0, index).trim(),
      path: entry.slice(index + 1).trim(),
    };
  });
};

const decodeKey = (raw) => {
  if (!raw) {
    throw new Error("Missing encryption key. Set ENV_BUNDLE_KEY or pass --key-env.");
  }
  const value = raw.trim();
  let key;
  if (value.startsWith("base64:")) {
    key = Buffer.from(value.slice("base64:".length), "base64");
  } else if (value.startsWith("hex:")) {
    key = Buffer.from(value.slice("hex:".length), "hex");
  } else if (/^[a-fA-F0-9]{64}$/.test(value)) {
    key = Buffer.from(value, "hex");
  } else {
    key = Buffer.from(value, "base64");
  }
  if (key.length !== 32) {
    throw new Error(`Invalid key length (${key.length}). Expected 32 bytes for AES-256-GCM.`);
  }
  return key;
};

const seal = (args) => {
  const entries = normalizeEntries(args.entry);
  if (entries.length === 0) {
    throw new Error("Seal mode requires at least one --entry name=path.");
  }
  const keyEnv = args["key-env"] ?? DEFAULT_KEY_ENV;
  const key = decodeKey(process.env[keyEnv]);
  const outPath = resolve(args.out ?? ".secrets/env.bundle.sealed.json");

  const sealedEntries = {};
  for (const entry of entries) {
    if (!entry.name) {
      throw new Error("Entry name cannot be empty.");
    }
    const sourcePath = resolve(entry.path);
    const plaintext = readFileSync(sourcePath);
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    sealedEntries[entry.name] = {
      sourcePath: entry.path,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  }

  const payload = {
    version: 1,
    algorithm: ALGORITHM,
    createdAt: new Date().toISOString(),
    keyEnv,
    keyId: args["key-id"] ?? null,
    entries: sealedEntries,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Sealed ${entries.length} env file(s) to ${outPath}`);
};

const unsealOne = (entryName, entry, key, outPath) => {
  const iv = Buffer.from(entry.iv, "base64");
  const tag = Buffer.from(entry.tag, "base64");
  const ciphertext = Buffer.from(entry.ciphertext, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, plaintext);
  console.log(`Unsealed '${entryName}' -> ${outPath}`);
};

const unseal = (args) => {
  const inPath = args.in;
  if (!inPath) {
    throw new Error("Unseal mode requires --in <sealed.json>.");
  }
  const keyEnv = args["key-env"] ?? DEFAULT_KEY_ENV;
  const key = decodeKey(process.env[keyEnv]);

  const bundle = JSON.parse(readFileSync(resolve(inPath), "utf8"));
  if (!bundle || bundle.version !== 1 || bundle.algorithm !== ALGORITHM || !bundle.entries) {
    throw new Error("Invalid sealed bundle format.");
  }

  const targetEntry = args.entry;
  if (targetEntry) {
    const entry = bundle.entries[targetEntry];
    if (!entry) {
      throw new Error(`Entry '${targetEntry}' not found in sealed bundle.`);
    }
    const outPath = resolve(args.out ?? entry.sourcePath ?? `${targetEntry}.env`);
    unsealOne(targetEntry, entry, key, outPath);
    return;
  }

  const outDir = resolve(args["out-dir"] ?? ".");
  for (const [entryName, entry] of Object.entries(bundle.entries)) {
    const defaultPath = entry.sourcePath ? resolve(outDir, entry.sourcePath) : resolve(outDir, `${entryName}.env`);
    unsealOne(entryName, entry, key, defaultPath);
  }
};

const main = () => {
  const [, , mode, ...argv] = process.argv;
  if (!mode || mode === "--help" || mode === "-h") {
    usage();
    process.exit(0);
  }
  const args = parseArgs(argv);
  if (mode === "seal") {
    seal(args);
    return;
  }
  if (mode === "unseal") {
    unseal(args);
    return;
  }
  throw new Error(`Unknown mode '${mode}'. Use 'seal' or 'unseal'.`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
