import { BONE_IDS, BONE_PARENT, BONE_REST_ANGLE, type BoneId } from "./bones";
import { DEFAULT_POSE } from "./default-pose";
import { resolveLayerOrder } from "./fk";
import { angleFromVector, clamp, normalizeAngle } from "./math";
import type { BonePose, FigurePose, FigureView } from "./pose-schema";

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface WorldLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** MediaPipe Pose 33-landmark indices. */
export const LANDMARK_INDEX = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const;

export const LANDMARK_COUNT = 33;

export interface LandmarksToPoseOptions {
  /** Bones whose landmarks fall below this visibility keep default angles. */
  minVisibility?: number;
}

const L = LANDMARK_INDEX;
const MIN_SCALE = 0.12;
/** Pelvis sits slightly below the bounding-box center for a standing figure. */
const NEUTRAL_PELVIS_OFFSET_Y = 0.03;
/** Nominal pelvis-to-neck length as a fraction of body height. */
const NOMINAL_TORSO_FRACTION = 0.35;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface BoneSpec {
  /** Landmark indices averaged to form the bone start / end. */
  from: readonly number[];
  to: readonly number[];
  /** Whether the bone length is foreshortened by its 3D vs 2D length. */
  foreshorten: boolean;
}

const HIPS = [L.leftHip, L.rightHip] as const;
const SHOULDERS = [L.leftShoulder, L.rightShoulder] as const;
const TORSO_SPEC: BoneSpec = { from: HIPS, to: SHOULDERS, foreshorten: true };

/** Landmark definition for every bone that is not part of the torso chain. */
const BONE_SPECS: Partial<Record<BoneId, BoneSpec>> = {
  neck: { from: SHOULDERS, to: [L.leftEar, L.rightEar], foreshorten: false },
  head: {
    from: [L.mouthLeft, L.mouthRight],
    to: [L.leftEye, L.rightEye],
    foreshorten: false,
  },
  upperArmL: { from: [L.leftShoulder], to: [L.leftElbow], foreshorten: true },
  forearmL: { from: [L.leftElbow], to: [L.leftWrist], foreshorten: true },
  handL: { from: [L.leftWrist], to: [L.leftPinky, L.leftIndex], foreshorten: true },
  thighL: { from: [L.leftHip], to: [L.leftKnee], foreshorten: true },
  shinL: { from: [L.leftKnee], to: [L.leftAnkle], foreshorten: true },
  footL: { from: [L.leftAnkle], to: [L.leftFootIndex], foreshorten: true },
  upperArmR: { from: [L.rightShoulder], to: [L.rightElbow], foreshorten: true },
  forearmR: { from: [L.rightElbow], to: [L.rightWrist], foreshorten: true },
  handR: { from: [L.rightWrist], to: [L.rightPinky, L.rightIndex], foreshorten: true },
  thighR: { from: [L.rightHip], to: [L.rightKnee], foreshorten: true },
  shinR: { from: [L.rightKnee], to: [L.rightAnkle], foreshorten: true },
  footR: { from: [L.rightAnkle], to: [L.rightFootIndex], foreshorten: true },
};

const TORSO_BONES = ["pelvis", "spineLower", "spineUpper"] as const satisfies readonly BoneId[];

function average(points: readonly Vec3[], indices: readonly number[]): Vec3 {
  const sum = indices.reduce(
    (acc, index) => {
      const p = points[index]!;
      return { x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z };
    },
    { x: 0, y: 0, z: 0 },
  );
  const n = indices.length;
  return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}

function isVisible(
  landmarks: readonly Landmark[],
  indices: readonly number[],
  minVisibility: number,
): boolean {
  return indices.every((i) => (landmarks[i]?.visibility ?? 1) >= minVisibility);
}

function distance3(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

/** World angle of the segment a -> b projected on the image plane. */
function worldAngle(a: Vec3, b: Vec3): number {
  return angleFromVector(b.x - a.x, b.y - a.y);
}

/** Projected / true length, a proxy for foreshortening in [MIN_SCALE, 1]. */
function foreshorteningScale(a: Vec3, b: Vec3): number {
  const full = distance3(a, b);
  if (full < 1e-9) return 1;
  return clamp(Math.hypot(b.x - a.x, b.y - a.y) / full, MIN_SCALE, 1);
}

function estimateView(geo: readonly Vec3[]): FigureView {
  const left = geo[L.leftShoulder]!;
  const right = geo[L.rightShoulder]!;
  const dx = left.x - right.x;
  const span = distance3(left, right);
  if (span < 1e-9) return "front";
  const frontal = Math.abs(dx) / span;
  if (frontal < 0.35) return "side";
  if (frontal < 0.85) return "threeQuarter";
  // Subject's left appears on the image right when facing the camera.
  return dx >= 0 ? "front" : "back";
}

/**
 * Convert MediaPipe pose landmarks into a `FigurePose`.
 *
 * - Image-plane directions (and foreshortening / depth) come from
 *   `worldLandmarks` when provided, otherwise from `landmarks`
 *   (x, y normalized to 0..1 with Y down; z smaller = closer to the camera).
 * - Root translation comes from `landmarks`: the hip center relative to the
 *   visible-landmark bounding-box center, in body heights.
 * - The spine is modeled as straight (hip center -> shoulder center).
 * - Layer order is derived from per-bone depth (far first).
 */
export function landmarksToPose(
  landmarks: readonly Landmark[],
  worldLandmarks?: readonly WorldLandmark[],
  options: LandmarksToPoseOptions = {},
): FigurePose {
  if (landmarks.length < LANDMARK_COUNT)
    throw new Error(`Expected ${LANDMARK_COUNT} landmarks, received ${landmarks.length}`);
  if (worldLandmarks && worldLandmarks.length < LANDMARK_COUNT)
    throw new Error(
      `Expected ${LANDMARK_COUNT} world landmarks, received ${worldLandmarks.length}`,
    );

  const minVisibility = options.minVisibility ?? 0.3;
  const geo: readonly Vec3[] = worldLandmarks ?? landmarks;
  const visibilitySource: readonly Landmark[] = landmarks;

  // Torso frame
  const hipCenter = average(geo, HIPS);
  const shoulderCenter = average(geo, SHOULDERS);
  const torsoVisible = isVisible(visibilitySource, [...HIPS, ...SHOULDERS], minVisibility);
  const torsoAngle = torsoVisible
    ? worldAngle(hipCenter, shoulderCenter)
    : BONE_REST_ANGLE.pelvis; // straight up
  const torsoScale = torsoVisible ? foreshorteningScale(hipCenter, shoulderCenter) : 1;
  const torsoDepth = -(hipCenter.z + shoulderCenter.z) / 2;

  const world: Partial<Record<BoneId, number>> = {};
  const bones = {} as Record<BoneId, BonePose>;

  const rootRotation = normalizeAngle(torsoAngle - BONE_REST_ANGLE.pelvis);
  for (const id of TORSO_BONES) {
    world[id] = torsoAngle;
    bones[id] = {
      angle: 0,
      scale: id === "pelvis" ? 1 : torsoScale,
      depth: clamp(torsoDepth, -1, 1),
    };
  }

  for (const id of BONE_IDS) {
    if (bones[id]) continue;
    const parentId = BONE_PARENT[id]!;
    const spec = BONE_SPECS[id] ?? TORSO_SPEC;
    const fallback = DEFAULT_POSE.bones[id];

    if (!isVisible(visibilitySource, [...spec.from, ...spec.to], minVisibility)) {
      // Keep the parent chain consistent: world angle follows the default relative pose.
      world[id] = (world[parentId] ?? 0) + BONE_REST_ANGLE[id] + fallback.angle;
      bones[id] = { ...fallback };
      continue;
    }

    const from = average(geo, spec.from);
    const to = average(geo, spec.to);
    const angleWorld = worldAngle(from, to);
    world[id] = angleWorld;

    bones[id] = {
      angle: normalizeAngle(angleWorld - (world[parentId] ?? 0) - BONE_REST_ANGLE[id]),
      scale: spec.foreshorten ? foreshorteningScale(from, to) : 1,
      depth: clamp(-(from.z + to.z) / 2, -1, 1),
    };
  }

  // Root translation from image coordinates (bounding-box relative).
  const visible = landmarks.filter((lm) => (lm.visibility ?? 1) >= minVisibility);
  const box = (visible.length > 0 ? visible : landmarks).reduce(
    (acc, lm) => ({
      minX: Math.min(acc.minX, lm.x),
      maxX: Math.max(acc.maxX, lm.x),
      minY: Math.min(acc.minY, lm.y),
      maxY: Math.max(acc.maxY, lm.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const imageHipCenter = average(landmarks, HIPS);
  const imageShoulderCenter = average(landmarks, SHOULDERS);
  const bodyHeight = Math.max(
    distance3(imageHipCenter, imageShoulderCenter) / NOMINAL_TORSO_FRACTION,
    1e-6,
  );
  const root = {
    x: (imageHipCenter.x - (box.minX + box.maxX) / 2) / bodyHeight,
    y: (imageHipCenter.y - (box.minY + box.maxY) / 2) / bodyHeight - NEUTRAL_PELVIS_OFFSET_Y,
    rotation: rootRotation,
  };

  const pose: FigurePose = {
    version: 1,
    view: estimateView(geo),
    root,
    bones,
    source: { landmarks3d: geo.slice(0, LANDMARK_COUNT).flatMap((p) => [p.x, p.y, p.z]) },
  };
  pose.layers = resolveLayerOrder(pose);
  return pose;
}
