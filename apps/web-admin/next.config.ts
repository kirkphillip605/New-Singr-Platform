import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@singr/ui", "@singr/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
