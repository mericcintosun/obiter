import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There is a stray pnpm-lock.yaml in the home directory above this repo, so
  // Next infers the wrong workspace root and traces files from there. Pin the
  // root to this project.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
