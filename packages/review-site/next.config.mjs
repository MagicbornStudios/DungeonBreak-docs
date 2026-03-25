import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsSiteRoot = path.resolve(__dirname, "../../docs-site");
const srcRoot = path.join(__dirname, "src");

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  turbopack: {
    resolveAlias: {
      "@docs": docsSiteRoot,
      "@": srcRoot,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@docs": docsSiteRoot,
      "@": srcRoot,
    };
    return config;
  },
};

export default nextConfig;
