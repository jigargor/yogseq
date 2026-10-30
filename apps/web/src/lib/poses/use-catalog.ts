"use client";

import { useEffect, useMemo, useState } from "react";
import type { Pose, PoseCatalog } from "@yogseq/content";
import { createPoseSearch, loadCatalog, type PoseSearchIndex } from "./catalog";

export interface CatalogState {
  poses: Pose[];
  poseById: ReadonlyMap<string, Pose>;
  index: PoseSearchIndex | null;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_POSES: Pose[] = [];

export function useCatalog(): CatalogState {
  const [catalog, setCatalog] = useState<PoseCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalog()
      .then((loaded) => !cancelled && setCatalog(loaded))
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load poses");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const poses = catalog?.poses ?? EMPTY_POSES;
  const poseById = useMemo(() => new Map(poses.map((pose) => [pose.id, pose])), [poses]);
  const index = useMemo(() => (catalog ? createPoseSearch(poses) : null), [catalog, poses]);

  return { poses, poseById, index, isLoading: !catalog && !error, error };
}
