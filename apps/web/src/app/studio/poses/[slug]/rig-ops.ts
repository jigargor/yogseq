import {
  BONE_IDS,
  BONE_PARENT,
  BONE_REST_ANGLE,
  DEFAULT_AVATAR,
  FIGURE_GROUND_Y,
  FIGURE_UNIT,
  FIGURE_VIEWBOX_HEIGHT,
  FIGURE_VIEWBOX_WIDTH,
  angleFromVector,
  forwardKinematics,
  normalizeAngle,
  segmentsById,
  solveTwoBoneIK,
  type BoneId,
  type FigurePose,
  type Point,
} from "@yogseq/figure";

/**
 * Pure rig-editing helpers for Pose Studio. Coordinates are unit-height units
 * (pelvis origin, Y down) unless a function says "view" (the 200x280 SVG box).
 */

export type DragMode = "fk" | "ik";

/** Two-bone IK chains, keyed by the *end* bone (forearm -> wrist, shin -> ankle). */
export const IK_CHAINS = {
  forearmL: "upperArmL",
  forearmR: "upperArmR",
  shinL: "thighL",
  shinR: "thighR",
} as const satisfies Partial<Record<BoneId, BoneId>>;

export type IkEndBone = keyof typeof IK_CHAINS;

export function isIkEndBone(boneId: BoneId): boneId is IkEndBone {
  return boneId in IK_CHAINS;
}

/* -------------------------------------------------------------------------- */
/* View <-> unit coordinates (must mirror `Figure`'s own projection)           */
/* -------------------------------------------------------------------------- */

const FIGURE_ORIGIN_Y =
  FIGURE_GROUND_Y -
  (DEFAULT_AVATAR.lengths.thighL + DEFAULT_AVATAR.lengths.shinL + DEFAULT_AVATAR.widths.footL / 2) *
    FIGURE_UNIT;

export function toViewPoint(point: Point): Point {
  return {
    x: FIGURE_VIEWBOX_WIDTH / 2 + point.x * FIGURE_UNIT,
    y: FIGURE_ORIGIN_Y + point.y * FIGURE_UNIT,
  };
}

export function fromViewPoint(point: Point): Point {
  return {
    x: (point.x - FIGURE_VIEWBOX_WIDTH / 2) / FIGURE_UNIT,
    y: (point.y - FIGURE_ORIGIN_Y) / FIGURE_UNIT,
  };
}

/** Client (pointer) coordinates -> SVG viewBox coordinates for a rendered rect. */
export function clientToViewPoint(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): Point {
  return {
    x: ((clientX - rect.left) / rect.width) * FIGURE_VIEWBOX_WIDTH,
    y: ((clientY - rect.top) / rect.height) * FIGURE_VIEWBOX_HEIGHT,
  };
}

/* -------------------------------------------------------------------------- */
/* Editing operations                                                         */
/* -------------------------------------------------------------------------- */

function parentRotationOf(
  boneId: BoneId,
  rig: FigurePose,
  segments: ReturnType<typeof segmentsById>,
): number {
  const parentId = BONE_PARENT[boneId];
  return parentId ? segments[parentId].rotation : rig.root.rotation;
}

function withBone(rig: FigurePose, boneId: BoneId, patch: Partial<FigurePose["bones"][BoneId]>) {
  return { ...rig, bones: { ...rig.bones, [boneId]: { ...rig.bones[boneId], ...patch } } };
}

/** FK: rotate `boneId` about its start so its tip points at `target`. */
export function dragFk(rig: FigurePose, boneId: BoneId, target: Point): FigurePose {
  const segments = segmentsById(forwardKinematics(rig));
  const segment = segments[boneId];
  const world = angleFromVector(target.x - segment.start.x, target.y - segment.start.y);
  const angle = normalizeAngle(
    world - parentRotationOf(boneId, rig, segments) - BONE_REST_ANGLE[boneId],
  );
  return withBone(rig, boneId, { angle });
}

/** Which way the elbow/knee currently bends, so IK starts without a flip. */
export function inferBend(rig: FigurePose, endBone: IkEndBone): boolean {
  const segments = segmentsById(forwardKinematics(rig));
  const first = segments[IK_CHAINS[endBone]];
  const end = segments[endBone].end;
  const base = angleFromVector(end.x - first.start.x, end.y - first.start.y);
  return normalizeAngle(first.rotation - base) >= 0;
}

/** IK: place the wrist/ankle at `target`, solving the two-bone chain. */
export function dragIk(
  rig: FigurePose,
  endBone: IkEndBone,
  target: Point,
  bendPositive: boolean,
): FigurePose {
  const firstBone = IK_CHAINS[endBone];
  const segments = segmentsById(forwardKinematics(rig));
  const first = segments[firstBone];
  const second = segments[endBone];
  const result = solveTwoBoneIK(first.start, target, first.length, second.length, bendPositive);

  const firstAngle = normalizeAngle(
    result.angle1 - parentRotationOf(firstBone, rig, segments) - BONE_REST_ANGLE[firstBone],
  );
  const secondAngle = normalizeAngle(result.angle2 - BONE_REST_ANGLE[endBone]);

  return withBone(withBone(rig, firstBone, { angle: firstAngle }), endBone, {
    angle: secondAngle,
  });
}

/** Current tip position (unit coordinates) of a bone. */
export function boneTip(rig: FigurePose, boneId: BoneId): Point {
  return segmentsById(forwardKinematics(rig))[boneId].end;
}

export function setBoneValue(
  rig: FigurePose,
  boneId: BoneId,
  patch: Partial<FigurePose["bones"][BoneId]>,
): FigurePose {
  return withBone(rig, boneId, patch);
}

export function moveLayer(order: readonly BoneId[], boneId: BoneId, toward: "front" | "back") {
  const index = order.indexOf(boneId);
  const swapWith = toward === "front" ? index + 1 : index - 1;
  if (index < 0 || swapWith < 0 || swapWith >= order.length) return [...order];
  const next = [...order];
  [next[index], next[swapWith]] = [next[swapWith]!, next[index]!];
  return next;
}

/* -------------------------------------------------------------------------- */
/* Serialisation                                                              */
/* -------------------------------------------------------------------------- */

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Round numbers like the authored content files (4 decimals), dropping default scale/depth. */
export function roundRig(rig: FigurePose): FigurePose {
  const bones = {} as FigurePose["bones"];
  for (const id of BONE_IDS) {
    const bone = rig.bones[id];
    bones[id] = {
      angle: round(bone.angle),
      ...(bone.scale !== undefined && Math.abs(bone.scale - 1) > 1e-4
        ? { scale: round(bone.scale, 3) }
        : {}),
      ...(bone.depth !== undefined && Math.abs(bone.depth) > 1e-4
        ? { depth: round(bone.depth, 3) }
        : {}),
    };
  }
  return {
    ...rig,
    root: { x: round(rig.root.x), y: round(rig.root.y), rotation: round(rig.root.rotation) },
    bones,
    // Landmark dumps are large and only useful while editing.
    source: undefined,
  };
}
