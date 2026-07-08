import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Silence the multi-lockfile workspace-root warning — the repo root's yarn.lock
  // belongs to the separate Anchor TS test workspace, not this app.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
