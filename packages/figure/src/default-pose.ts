import { BONE_IDS, type BoneId } from "./bones";
import type { BonePose, FigurePose } from "./pose-schema";

function buildBones(overrides: Partial<Record<BoneId, BonePose>>): Record<BoneId, BonePose> {
  return Object.fromEntries(
    BONE_IDS.map((id) => [id, overrides[id] ?? { angle: 0, scale: 1, depth: 0 }]),
  ) as Record<BoneId, BonePose>;
}

/**
 * Mountain pose (tadasana), front view: arms hang slightly away from the body,
 * feet point outward and are foreshortened because they face the viewer.
 */
export const DEFAULT_POSE: FigurePose = {
  version: 1,
  view: "front",
  root: { x: 0, y: 0, rotation: 0 },
  bones: buildBones({
    pelvis: { angle: 0, scale: 1, depth: 0 },
    upperArmL: { angle: 0.08, scale: 1, depth: 0 },
    upperArmR: { angle: -0.08, scale: 1, depth: 0 },
    footL: { angle: 0, scale: 0.45, depth: 0 },
    footR: { angle: Math.PI, scale: 0.45, depth: 0 },
  }),
};

/** Fresh deep copy of the default pose, safe to mutate. */
export function createDefaultPose(): FigurePose {
  return structuredClone(DEFAULT_POSE);
}
