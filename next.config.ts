import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering model: pages that read the session are rendered per request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
