/**
 * Tiny authoring DSL for figure rigs.
 *
 * Poses are described with *world* angles in degrees using the figure
 * convention (0 = down, 90 = right / forward, 180 = up, 270 = left / back),
 * which is far more intuitive than the parent-relative radians stored in
 * `FigurePose`. `buildRig` converts to relative radians, solves optional
 * two-bone IK limbs, then grounds + centers the figure.
 *
 * Side views face right (forward = +x). In front views the figure's left limbs
 * are on the screen's right.
 */
import {
  BONE_IDS,
  BONE_PARENT,
  BONE_REST_ANGLE,
  DEFAULT_AVATAR,
  type BoneId,
} from "../packages/figure/src/bones";
import { forwardKinematics, segmentsById } from "../packages/figure/src/fk";
import { solveTwoBoneIK } from "../packages/figure/src/ik";
import { normalizeAngle } from "../packages/figure/src/math";
import type { BonePose, FigurePose, FigureView } from "../packages/figure/src/pose-schema";

export type Deg = number;

/** Limb target solved with two-bone IK. Coordinates: +x forward/right, up is positive. */
export interface LimbIK {
  /** Target x relative to the limb's root joint, on the floor (plus `up`). */
  floor?: number;
  /** Target absolute x (pelvis frame) and height above the floor. */
  at?: [x: number, up: number];
  /** Target relative to the root joint: [dx, dyUp]. */
  rel?: [dx: number, dyUp: number];
  /** Height above the floor for `floor` mode. */
  up?: number;
  /** Target the end of another bone (e.g. a hand grabbing ootR). Resolved after legs. */
  grab?: BoneId;
  /** Offset [dx, dyUp] applied to a grab target. */
  grabOff?: [number, number];
  /** Which way the middle joint bends (+1 toward +x for a downward limb). */
  bend?: 1 | -1;
  /** World angle of the end bone (foot / hand). */
  end?: Deg;
}

export interface RigSpec {
  v?: FigureView;
  /** Pelvis height above the ankle-level floor, used by IK targets (default 0.44). */
  hip?: number;
  pelvis?: Deg;
  lower?: Deg;
  upper?: Deg;
  neck?: Deg;
  head?: Deg;
  tL?: Deg;
  sL?: Deg;
  fL?: Deg;
  tR?: Deg;
  sR?: Deg;
  fR?: Deg;
  aL?: Deg;
  eL?: Deg;
  hL?: Deg;
  aR?: Deg;
  eR?: Deg;
  hR?: Deg;
  legL?: LimbIK;
  legR?: LimbIK;
  armL?: LimbIK;
  armR?: LimbIK;
  /** Per-bone length multipliers (foreshortening). */
  sc?: Partial<Record<BoneId, number>>;
  /** Per-bone depth overrides. */
  dp?: Partial<Record<BoneId, number>>;
  /** Which side is the far (back-drawn) side in side / 3-4 views. Default "R". */
  far?: "L" | "R" | "none";
  /** Disable automatic grounding / centering. */
  raw?: boolean;
}

const D2R = Math.PI / 180;
const GROUND_Y = DEFAULT_AVATAR.lengths.thighL + DEFAULT_AVATAR.lengths.shinL + 0.02;
const round = (n: number): number => Math.round(n * 10000) / 10000;

function worldAngles(spec: RigSpec, view: FigureView): Record<BoneId, number> {
  const front = view === "front" || view === "back";
  const pelvis = spec.pelvis ?? 180;
  const lower = spec.lower ?? pelvis;
  const upper = spec.upper ?? lower;
  const neck = spec.neck ?? upper;
  const head = spec.head ?? neck;
  const tL = spec.tL ?? 0;
  const tR = spec.tR ?? 0;
  const sL = spec.sL ?? tL;
  const sR = spec.sR ?? tR;
  const fL = spec.fL ?? sL + 90;
  const fR = spec.fR ?? (front ? sR - 90 : sR + 90);
  const aL = spec.aL ?? (front ? 6 : 0);
  const aR = spec.aR ?? (front ? -6 : 0);
  const eL = spec.eL ?? aL;
  const eR = spec.eR ?? aR;
  const hL = spec.hL ?? eL;
  const hR = spec.hR ?? eR;
  return {
    pelvis,
    spineLower: lower,
    spineUpper: upper,
    neck,
    head,
    thighL: tL,
    shinL: sL,
    footL: fL,
    thighR: tR,
    shinR: sR,
    footR: fR,
    upperArmL: aL,
    forearmL: eL,
    handL: hL,
    upperArmR: aR,
    forearmR: eR,
    handR: hR,
  } as Record<BoneId, number>;
}

function toPose(w: Record<BoneId, number>, spec: RigSpec, view: FigureView): FigurePose {
  const bones = {} as Record<BoneId, BonePose>;
  const far = spec.far ?? "R";
  const sideView = view === "side" || view === "threeQuarter";
  for (const id of BONE_IDS) {
    const parent = BONE_PARENT[id];
    const parentWorld = parent ? w[parent] * D2R : 0;
    const rel = normalizeAngle(w[id] * D2R - parentWorld - BONE_REST_ANGLE[id]);
    const bone: BonePose = { angle: round(rel) };
    const frontFoot = (view === "front" || view === "back") && (id === "footL" || id === "footR");
    const scale = spec.sc?.[id] ?? (frontFoot ? 0.45 : undefined);
    if (scale !== undefined) bone.scale = scale;
    const isFar = sideView && far !== "none" && id.endsWith(far);
    const depth = spec.dp?.[id] ?? (isFar ? -0.1 : undefined);
    if (depth !== undefined) bone.depth = depth;
    bones[id] = bone;
  }
  return { version: 1, view, root: { x: 0, y: 0, rotation: 0 }, bones };
}

export function buildRig(spec: RigSpec = {}): FigurePose {
  const view = spec.v ?? "side";
  const front = view === "front" || view === "back";
  const hip = spec.hip ?? 0.44;
  const w = worldAngles(spec, view);
  let pose = toPose(w, spec, view);

  const limbs: {
    key: "legL" | "legR" | "armL" | "armR";
    ids: [BoneId, BoneId, BoneId];
    arm: boolean;
  }[] = [
    { key: "legL", ids: ["thighL", "shinL", "footL"], arm: false },
    { key: "legR", ids: ["thighR", "shinR", "footR"], arm: false },
    { key: "armL", ids: ["upperArmL", "forearmL", "handL"], arm: true },
    { key: "armR", ids: ["upperArmR", "forearmR", "handR"], arm: true },
  ];

  const solveLimb = (
    limb: (typeof limbs)[number],
    ik: LimbIK,
    seg: ReturnType<typeof segmentsById>,
  ): void => {
    const [b1, b2, b3] = limb.ids;
    const origin = seg[b1].start;
    let target: { x: number; y: number };
    if (ik.grab) {
      const g = seg[ik.grab].end;
      target = { x: g.x + (ik.grabOff?.[0] ?? 0), y: g.y - (ik.grabOff?.[1] ?? 0) };
    } else if (ik.floor !== undefined) target = { x: origin.x + ik.floor, y: hip - (ik.up ?? 0) };
    else if (ik.at) target = { x: ik.at[0], y: hip - ik.at[1] };
    else if (ik.rel) target = { x: origin.x + ik.rel[0], y: origin.y - ik.rel[1] };
    else throw new Error(`limb ${limb.key} needs floor|at|rel|grab`);
    const isL = b1.endsWith("L");
    const bend = ik.bend ?? (limb.arm ? (front ? (isL ? 1 : -1) : -1) : 1);
    const len1 = DEFAULT_AVATAR.lengths[b1] * (spec.sc?.[b1] ?? 1);
    const len2 = DEFAULT_AVATAR.lengths[b2] * (spec.sc?.[b2] ?? 1);
    const r = solveTwoBoneIK(origin, target, len1, len2, bend === 1);
    w[b1] = r.angle1 / D2R;
    w[b2] = (r.angle1 + r.angle2) / D2R;
    if (ik.end !== undefined) w[b3] = ik.end;
    else if (limb.arm) w[b3] = w[b2];
    else w[b3] = front ? (isL ? w[b2] + 90 : w[b2] - 90) : w[b2] + 90;
  };

  for (const phase of [false, true]) {
    const active = limbs.filter((l) => l.arm === phase && spec[l.key]);
    if (active.length === 0) continue;
    const seg = segmentsById(forwardKinematics(pose));
    for (const limb of active) solveLimb(limb, spec[limb.key]!, seg);
    pose = toPose(w, spec, view);
  }
  if (!spec.raw) {
    const segs = forwardKinematics(pose);
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const s of segs) {
      const half = s.width / 2;
      if (s.boneId === "head") {
        const cx = (s.start.x + s.end.x) / 2;
        const cy = (s.start.y + s.end.y) / 2;
        maxY = Math.max(maxY, cy + DEFAULT_AVATAR.headRadius);
        minX = Math.min(minX, cx - DEFAULT_AVATAR.headRadius);
        maxX = Math.max(maxX, cx + DEFAULT_AVATAR.headRadius);
        continue;
      }
      maxY = Math.max(maxY, s.start.y + half, s.end.y + half);
      minX = Math.min(minX, s.start.x - half, s.end.x - half);
      maxX = Math.max(maxX, s.start.x + half, s.end.x + half);
    }
    pose.root = { x: round(-(minX + maxX) / 2), y: round(GROUND_Y - maxY), rotation: 0 };
  }
  return pose;
}
