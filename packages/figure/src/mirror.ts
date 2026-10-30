import { BONE_IDS, BONE_REST_ANGLE, MIRROR_MAP, type BoneId } from "./bones";
import { normalizeAngle } from "./math";
import type { BonePose, FigurePose } from "./pose-schema";

/**
 * Mirror a pose across the vertical axis: left/right bones swap, x is negated.
 *
 * With world angle w = parent + rest + a, mirroring gives -w, so the mirrored
 * relative angle is `-2 * rest - a` (bones in a pair share the same rest).
 * Applying it twice returns the original pose.
 */
export function mirrorPose(pose: FigurePose): FigurePose {
  const bones = {} as Record<BoneId, BonePose>;
  for (const id of BONE_IDS) {
    const source = pose.bones[MIRROR_MAP[id]];
    bones[id] = {
      ...source,
      angle: normalizeAngle(-2 * BONE_REST_ANGLE[id] - source.angle),
    };
  }

  const mirrored: FigurePose = {
    ...pose,
    root: { x: -pose.root.x, y: pose.root.y, rotation: normalizeAngle(-pose.root.rotation) },
    bones,
  };

  if (pose.layers) mirrored.layers = pose.layers.map((id) => MIRROR_MAP[id]);
  if (pose.props)
    mirrored.props = pose.props.map((prop) => ({
      ...prop,
      x: -prop.x,
      ...(prop.rotation === undefined ? {} : { rotation: -prop.rotation }),
      ...(prop.attachedTo === undefined ? {} : { attachedTo: MIRROR_MAP[prop.attachedTo] }),
    }));

  return mirrored;
}
