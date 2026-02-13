import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Turbopack treats this project directory as the workspace root.
  // (Prevents accidentally picking up lockfiles / node_modules from parent dirs.)
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
