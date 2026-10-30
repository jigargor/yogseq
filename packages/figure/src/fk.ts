import {
  BONE_ATTACH_END,
  BONE_IDS,
  BONE_LATERAL_ATTACH,
  BONE_PARENT,
  BONE_REST_ANGLE,
  BONE_SIDE,
  DEFAULT_AVATAR,
  type Avatar,
  type BoneId,
  type BoneSide,
} from "./bones";
import { directionFromAngle, leftLateralFromAngle, type Point } from "./math";
import type { FigurePose, FigureView } from "./pose-schema";

export interface FkSegment {
  boneId: BoneId;
  side: BoneSide;
  start: Point;
  end: Point;
  /** World angle (radians) of the bone direction. */
  rotation: number;
  /** Effective length after foreshortening (unit height). */
  length: number;
  /** Stroke width (unit height). */
  width: number;
  /** Higher = closer to viewer. */
  depth: number;
}

/**
 * How much the shoulder/hip lateral offsets are visible per view. In a side
 * view the left and right joints project onto (almost) the same point.
 */
export const VIEW_ATTACH_FACTOR = {
  front: 1,
  back: 1,
  threeQuarter: 0.6,
  side: 0.08,
} as const satisfies Record<FigureView, number>;

/** How wide the torso hull appears per view. */
export const VIEW_HULL_FACTOR = {
  front: 1,
  back: 1,
  threeQuarter: 0.8,
  side: 0.6,
} as const satisfies Record<FigureView, number>;

/** Default back-to-front order when depths tie: legs, torso, head, arms. */
export const DEFAULT_LAYER_ORDER = [
  "footR",
  "shinR",
  "thighR",
  "footL",
  "shinL",
  "thighL",
  "pelvis",
  "spineLower",
  "spineUpper",
  "neck",
  "head",
  "handR",
  "forearmR",
  "upperArmR",
  "handL",
  "forearmL",
  "upperArmL",
] as const satisfies readonly BoneId[];

/**
 * Forward kinematics. Coordinates are in unit-height units with the origin at
 * the pelvis (`root` translates it), Y+ down, X+ right.
 * Segments are returned in `BONE_IDS` order (parents before children).
 */
export function forwardKinematics(pose: FigurePose, avatar: Avatar = DEFAULT_AVATAR): FkSegment[] {
  const byId = new Map<BoneId, FkSegment>();
  const attachFactor = VIEW_ATTACH_FACTOR[pose.view];

  for (const boneId of BONE_IDS) {
    const bone = pose.bones[boneId];
    const parentId = BONE_PARENT[boneId];
    const parent = parentId ? byId.get(parentId) : undefined;
    const parentRotation = parent ? parent.rotation : pose.root.rotation;

    let start: Point = { x: pose.root.x, y: pose.root.y };
    if (parent) {
      start = BONE_ATTACH_END[boneId] === "start" ? { ...parent.start } : { ...parent.end };
      const lateralKind = BONE_LATERAL_ATTACH[boneId];
      if (lateralKind) {
        const half = lateralKind === "shoulder" ? avatar.shoulderHalfWidth : avatar.hipHalfWidth;
        const sign = BONE_SIDE[boneId] === "left" ? 1 : -1;
        const lateral = leftLateralFromAngle(parent.rotation);
        start = {
          x: start.x + lateral.x * half * attachFactor * sign,
          y: start.y + lateral.y * half * attachFactor * sign,
        };
      }
    }

    const rotation = parentRotation + BONE_REST_ANGLE[boneId] + bone.angle;
    const length = avatar.lengths[boneId] * (bone.scale ?? 1);
    const dir = directionFromAngle(rotation);

    byId.set(boneId, {
      boneId,
      side: BONE_SIDE[boneId],
      start,
      end: { x: start.x + dir.x * length, y: start.y + dir.y * length },
      rotation,
      length,
      width: avatar.widths[boneId],
      depth: bone.depth ?? 0,
    });
  }

  return BONE_IDS.map((id) => byId.get(id)!);
}

export function segmentsById(segments: readonly FkSegment[]): Record<BoneId, FkSegment> {
  return Object.fromEntries(segments.map((s) => [s.boneId, s])) as Record<BoneId, FkSegment>;
}

/**
 * Back-to-front draw order. Uses `pose.layers` when present (missing bones are
 * appended in default order); otherwise sorts by depth ascending, with the
 * default order as a stable tie-breaker.
 */
export function resolveLayerOrder(pose: FigurePose): BoneId[] {
  if (pose.layers && pose.layers.length > 0) {
    const seen = new Set<BoneId>();
    const ordered: BoneId[] = [];
    for (const id of [...pose.layers, ...DEFAULT_LAYER_ORDER]) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
    return ordered;
  }
  return [...DEFAULT_LAYER_ORDER].sort(
    (a, b) => (pose.bones[a].depth ?? 0) - (pose.bones[b].depth ?? 0),
  );
}

/**
 * Closed outline of the torso (hip, waist, shoulder on both sides), in unit
 * coordinates. `inset` shrinks the hull so a round-joined stroke of width
 * `2 * inset` restores the intended silhouette.
 */
export function torsoHullPoints(
  segments: readonly FkSegment[],
  view: FigureView,
  avatar: Avatar = DEFAULT_AVATAR,
  inset = 0,
): Point[] {
  const seg = segmentsById(segments);
  const factor = VIEW_HULL_FACTOR[view];
  const rows: { center: Point; rotation: number; half: number }[] = [
    { center: seg.pelvis.start, rotation: seg.pelvis.rotation, half: avatar.hull.hip },
    { center: seg.spineLower.end, rotation: seg.spineLower.rotation, half: avatar.hull.waist },
    { center: seg.spineUpper.end, rotation: seg.spineUpper.rotation, half: avatar.hull.shoulder },
  ];
  const offset = (row: (typeof rows)[number], sign: 1 | -1): Point => {
    const lateral = leftLateralFromAngle(row.rotation);
    const half = Math.max(0.005, row.half * factor - inset) * sign;
    return { x: row.center.x + lateral.x * half, y: row.center.y + lateral.y * half };
  };
  return [
    ...rows.map((row) => offset(row, 1)),
    ...[...rows].reverse().map((row) => offset(row, -1)),
  ];
}
