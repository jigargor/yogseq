import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  transpilePackages: ["@yogseq/db", "@yogseq/figure", "@yogseq/content"],
  // Native sharp cannot ship in the Cloudflare Worker OpenNext bundle.
  images: { unoptimized: true },
  // Tailwind runs through postcss.config.mjs for both webpack and Turbopack.
};

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development" || process.env.SERWIST === "0",
});

export default withSerwist(nextConfig);
