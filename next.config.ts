import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Avoid trailing-slash redirects that can cause 404s on Vercel */
  trailingSlash: false,
};

export default nextConfig;
