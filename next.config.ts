import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The protocol lab (`npm run lab`) runs two dev servers from this one
  // folder. Next locks its build directory, so each lab instance gets its
  // own. Unset everywhere else → the default `.next`.
  ...(process.env.NEARSTREAM_DIST_DIR
    ? { distDir: process.env.NEARSTREAM_DIST_DIR }
    : {}),
};

export default nextConfig;
