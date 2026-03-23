import path from "node:path";
import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(dirname, "..");

const SERVER_EXTERNAL_PACKAGES = [
  "@dungeonbreak/engine",
  "@dungeonbreak/engine/react",
  "@modelcontextprotocol/sdk",
  "@openai/codex",
  "@openai/codex-sdk",
  "@payloadcms/db-postgres",
  "@payloadcms/db-sqlite",
  "@payloadcms/email-nodemailer",
  "mcp-handler",
  "openai",
  "payload",
  "sharp",
];

/** @type {import('next').NextConfig} */
const config = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  reactStrictMode: true,
  serverExternalPackages: SERVER_EXTERNAL_PACKAGES,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.S3_ENDPOINT?.replace(/^https?:\/\//, "") || "",
      },
    ],
  },
};

export default withPayload(config);
