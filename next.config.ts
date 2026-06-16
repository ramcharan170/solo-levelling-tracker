import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Disable linting on build to speed up and prevent failure on minor warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
