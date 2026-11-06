import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the e2e tests run a second server next to your dev server without fighting over .next (NEXT_DIST_DIR=.next-e2e).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Workspace packages (packages/*, platforms/*) are compiled automatically by Turbopack; listed for webpack builds.
  transpilePackages: ["@street-wolf/db", "@street-wolf/core", "@street-wolf/platform-sdk", "@street-wolf/google-maps", "@street-wolf/instagram", "@street-wolf/reddit", "@street-wolf/x"],
  // The mongodb driver uses Node APIs, so it must stay out of the bundle.
  serverExternalPackages: ["mongodb"],
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
