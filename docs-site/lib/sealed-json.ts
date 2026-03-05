import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type SealedJsonV1 = {
  schemaVersion: "sealed-json.v1";
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  payload: string;
};

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function sealJsonWithSecret(value: unknown, secret: string): SealedJsonV1 {
  const key = keyFromSecret(secret);
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

export function unsealJsonWithSecret<T>(sealed: SealedJsonV1, secret: string): T {
  if (sealed.schemaVersion !== "sealed-json.v1" || sealed.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported sealed JSON format.");
  }
  const key = keyFromSecret(secret);
  const iv = Buffer.from(sealed.iv, "base64");
  const tag = Buffer.from(sealed.tag, "base64");
  const payload = Buffer.from(sealed.payload, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

