import type { NextConfig } from "next";
import { newsThumbnailRemotePatterns } from "./src/lib/newsThumbnailHosts";

const nextConfig: NextConfig = {
  /* Avoid trailing-slash redirects that can cause 404s on Vercel */
  trailingSlash: false,
  images: {
    remotePatterns: newsThumbnailRemotePatterns,
  },
};

export default nextConfig;
