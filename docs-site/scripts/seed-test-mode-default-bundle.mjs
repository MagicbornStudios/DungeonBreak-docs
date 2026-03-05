#!/usr/bin/env node
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.resolve(root, "public", "game", "content-pack.bundle.v1.json");
const outPath = path.resolve(root, "content-packs", "defaults", "default-content-pack.bundle.v1.sealed.json");

function payloadSecret() {
  const secret = process.env.PAYLOAD_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing PAYLOAD_SECRET. Set it before sealing default test-mode bundle.");
  }
  return secret;
}

function sealJsonWithSecret(value, secret) {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    schemaVersion: "sealed-json.v1",
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    payload: ciphertext.toString("base64"),
  };
}

async function main() {
  const raw = await readFile(sourcePath, "utf8");
  const bundle = JSON.parse(raw);
  const sealed = sealJsonWithSecret(bundle, payloadSecret());
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(sealed, null, 2)}\n`, "utf8");
  console.log(`Sealed test-mode default bundle -> ${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

