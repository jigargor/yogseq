import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  transpilePackages: ["@yogseq/db", "@yogseq/figure", "@yogseq/content"],
  // Native sharp cannot ship in the Cloudflare Worker OpenNext bundle.
  images: { unoptimized: true },
  // Tailwind runs through postcss.config.mjs for both webpack and Turbopack.
  //
  // Next's default `s-maxage=31536000` on static HTML is unsafe here: a cached
  // HTML document can keep pointing at a previous `/_next/static/css/*.css`
  // hash after deploy (404 → unstyled page). Keep HTML fresh; hashed assets
  // are still long-cached by the framework.
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|icons|catalog|favicon.ico|sw.js|manifest.webmanifest|.*\\..*).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development" || process.env.SERWIST === "0",
});

export default withSerwist(nextConfig);
