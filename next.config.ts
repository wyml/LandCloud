import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    loader: "custom",
    loaderFile: "./src/lib/images/loader.ts",
    qualities: [75, 80],
  },
};

export default nextConfig;
