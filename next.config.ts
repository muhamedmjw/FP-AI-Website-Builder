import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // Ensure theme CSS files (read via fs.readFileSync at runtime) are included
  // in Vercel serverless function bundles. Without this, the bundler may not
  // trace these files since they aren't statically imported.
  outputFileTracingIncludes: {
    "/api/chat/send": ["./src/server/prompts/categories/**/themes/*.css"],
    "/api/guest/chat": ["./src/server/prompts/categories/**/themes/*.css"],
  },
};

export default nextConfig;
