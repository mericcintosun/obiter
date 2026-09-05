import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There is a stray pnpm-lock.yaml in the home directory above this repo, so
  // Next infers the wrong workspace root and traces files from there. Pin the
  // root to this project.
  outputFileTracingRoot: path.join(__dirname),

  // The Postgres driver opens raw sockets and resolves its own protocol modules,
  // so it is left as a plain node require rather than bundled into the server
  // output. Nothing else in the app is external.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
