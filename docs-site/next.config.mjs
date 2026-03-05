import path from "node:path";
import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";
import { createMDX } from "fumadocs-mdx/next";

const withMdx = createMDX();
const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  serverExternalPackages: ["sharp"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve?.alias,
      "@/vendor/repo-planner": path.join(dirname, "../vendor/repo-planner"),
    };
    return config;
  },
  turbopack: {
    root: dirname,
    resolveAlias: {
      "@/vendor/repo-planner": path.join(dirname, "../vendor/repo-planner"),
    },
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
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

export default withPayload(withMdx(config));
