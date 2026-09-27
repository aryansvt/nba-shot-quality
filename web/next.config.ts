import type { NextConfig } from "next";

// static export, vercel (or any static host) serves web/out
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
