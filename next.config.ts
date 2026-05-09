import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { newsThumbnailRemotePatterns } from "./src/lib/newsThumbnailHosts";

function git(args: string): string {
  try {
    return execSync(`git ${args}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/** Increments with each commit on this branch (proxy for shipped iterations). Override via NEXT_PUBLIC_RELEASE_BUILD. */
const NEXT_PUBLIC_RELEASE_BUILD =
  process.env.NEXT_PUBLIC_RELEASE_BUILD?.trim() ||
  git("rev-list --count HEAD") ||
  "dev";

const NEXT_PUBLIC_RELEASE_SHA =
  process.env.NEXT_PUBLIC_RELEASE_SHA?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  git("rev-parse --short HEAD") ||
  "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_RELEASE_BUILD,
    NEXT_PUBLIC_RELEASE_SHA,
  },
  /* Avoid trailing-slash redirects that can cause 404s on Vercel */
  trailingSlash: false,
  images: {
    remotePatterns: newsThumbnailRemotePatterns,
  },
};

export default nextConfig;
