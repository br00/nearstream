import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@napi-rs/canvas` ships a native `.node` binding that the bundler can't
  // pack into an ESM chunk. Mark it external so Next requires it at runtime
  // from `node_modules` instead of inlining it.
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
