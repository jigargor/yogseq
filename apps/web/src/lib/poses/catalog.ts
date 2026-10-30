import MiniSearch from "minisearch";
import type { LevelId, Pose, PoseCatalog, PoseTypeId, PositionId } from "@yogseq/content";

export const CATALOG_URL = "/catalog/poses.json";

export type PoseSearchIndex = MiniSearch<Pose>;

export interface PoseFilters {
  q?: string | null;
  position?: PositionId | null;
  type?: PoseTypeId | null;
  level?: LevelId | null;
  /** Search index from `createPoseSearch`; without it `q` falls back to substring matching. */
  index?: PoseSearchIndex;
}

let catalogPromise: Promise<PoseCatalog> | null = null;

/** Fetch the published pose catalog once per page load. */
export function loadCatalog(): Promise<PoseCatalog> {
  if (catalogPromise) return catalogPromise;
  catalogPromise = fetch(CATALOG_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load pose catalog (${response.status})`);
      return response.json() as Promise<PoseCatalog>;
    })
    .catch((error: unknown) => {
      catalogPromise = null;
      throw error;
    });
  return catalogPromise;
}

/** Lowercase and strip diacritics so "Utkatasana" matches "Utkaṭāsana". */
export function normalizeSearchTerm(term: string): string {
  return term
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function createPoseSearch(poses: readonly Pose[]): PoseSearchIndex {
  const index = new MiniSearch<Pose>({
    idField: "id",
    fields: ["nameEn", "nameSanskrit", "nameSanskritDiacritics", "aliases", "slug"],
    storeFields: ["id"],
    extractField: (pose, field) => {
      const value = (pose as unknown as Record<string, unknown>)[field];
      return Array.isArray(value) ? value.join(" ") : (value as string | undefined) ?? "";
    },
    processTerm: normalizeSearchTerm,
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      combineWith: "AND",
      boost: { nameEn: 3, nameSanskrit: 2, aliases: 1.5 },
    },
  });
  index.addAll([...poses]);
  return index;
}

export function filterPoses(poses: readonly Pose[], filters: PoseFilters = {}): Pose[] {
  const { q, position, type, level, index } = filters;
  const query = q?.trim() ?? "";

  let result: readonly Pose[] = poses;
  if (query) {
    if (index) {
      const ranked = new Set(index.search(query).map((hit) => String(hit.id)));
      const byId = new Map(poses.map((pose) => [pose.id, pose]));
      result = [...ranked].flatMap((id) => byId.get(id) ?? []);
    } else {
      const needle = normalizeSearchTerm(query);
      result = poses.filter((pose) =>
        normalizeSearchTerm(
          [pose.nameEn, pose.nameSanskrit, pose.nameSanskritDiacritics, pose.slug, ...pose.aliases].join(" "),
        ).includes(needle),
      );
    }
  }

  return result.filter(
    (pose) =>
      (!position || pose.position === position) &&
      (!type || pose.types.includes(type)) &&
      (!level || pose.level === level),
  );
}
