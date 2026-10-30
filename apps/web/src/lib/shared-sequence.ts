import { cache } from "react";
import { getSequenceByShareSlug } from "@/lib/sequences";

/** Request-scoped memoised share lookup (page, metadata and OG image share one query). */
export const getSharedSequence = cache(async (slug: string) => {
  try {
    return await getSequenceByShareSlug(slug);
  } catch (error) {
    console.error("[share] lookup failed", error);
    return null;
  }
});
