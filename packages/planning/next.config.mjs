import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoPlanner = path.resolve(dirname, "../../vendor/repo-planner");

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve?.alias,
      "@/vendor/repo-planner": repoPlanner,
      "@/components": path.join(repoPlanner, "components"),
      "@/lib": path.join(repoPlanner, "lib"),
      "@/planning-ui": path.join(dirname, "planning-ui"),
      "@/planning-ui/*": path.join(dirname, "planning-ui/*"),
      "@/lib/utils": path.join(dirname, "lib/utils"),
      "@/hooks": path.join(dirname, "hooks"),
      "@/hooks/*": path.join(dirname, "hooks/*"),
    };
    return config;
  },
};

export default config;
