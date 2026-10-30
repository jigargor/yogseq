import type { Pose, PoseCatalog } from "@yogseq/content";
import catalogJson from "../../public/catalog/poses.json";

/**
 * Server-side access to the generated pose catalog (`pnpm content:build`
 * writes `public/catalog/poses.json`). Bundled at build time so it also works
 * on Cloudflare Workers where there is no filesystem.
 */
const catalog = catalogJson as unknown as PoseCatalog;

let cachedBySlug: Map<string, Pose> | undefined;

export function getPoseCatalog(): PoseCatalog {
  return catalog;
}

export function listPublishedPoses(): Pose[] {
  return catalog.poses.filter((pose) => pose.status === "published");
}

export function getPoseMap(): Map<string, Pose> {
  cachedBySlug ??= new Map(catalog.poses.map((pose) => [pose.slug, pose]));
  return cachedBySlug;
}

export function getPoseBySlug(slug: string): Pose | undefined {
  return getPoseMap().get(slug);
}
