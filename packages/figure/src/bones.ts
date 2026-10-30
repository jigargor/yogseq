/**
 * Skeleton definition: 17 bones, hierarchy, mirror pairs, and avatar defaults.
 *
 * Pose angles are *relative* to the parent's world angle plus the bone's rest
 * angle (see `BONE_REST_ANGLE`), so an all-zero pose is a neutral standing
 * figure (arms and legs hanging, spine upright, feet pointing outward/right).
 */

export const BONE_IDS = [
  "pelvis",
  "spineLower",
  "spineUpper",
  "neck",
  "head",
  "upperArmL",
  "forearmL",
  "handL",
  "thighL",
  "shinL",
  "footL",
  "upperArmR",
  "forearmR",
  "handR",
  "thighR",
  "shinR",
  "footR",
] as const;

export type BoneId = (typeof BONE_IDS)[number];

export type BoneSide = "left" | "right" | "center";

/** Parent of each bone. Parents always precede children in `BONE_IDS`. */
export const BONE_PARENT = {
  pelvis: null,
  spineLower: "pelvis",
  spineUpper: "spineLower",
  neck: "spineUpper",
  head: "neck",
  upperArmL: "spineUpper",
  forearmL: "upperArmL",
  handL: "forearmL",
  thighL: "pelvis",
  shinL: "thighL",
  footL: "shinL",
  upperArmR: "spineUpper",
  forearmR: "upperArmR",
  handR: "forearmR",
  thighR: "pelvis",
  shinR: "thighR",
  footR: "shinR",
} as const satisfies Record<BoneId, BoneId | null>;

export const BONE_SIDE = {
  pelvis: "center",
  spineLower: "center",
  spineUpper: "center",
  neck: "center",
  head: "center",
  upperArmL: "left",
  forearmL: "left",
  handL: "left",
  thighL: "left",
  shinL: "left",
  footL: "left",
  upperArmR: "right",
  forearmR: "right",
  handR: "right",
  thighR: "right",
  shinR: "right",
  footR: "right",
} as const satisfies Record<BoneId, BoneSide>;

/** Left/right counterpart pairs, as `[left, right]`. */
export const MIRROR_PAIRS = [
  ["upperArmL", "upperArmR"],
  ["forearmL", "forearmR"],
  ["handL", "handR"],
  ["thighL", "thighR"],
  ["shinL", "shinR"],
  ["footL", "footR"],
] as const satisfies readonly (readonly [BoneId, BoneId])[];

/** Counterpart of each bone (center bones map to themselves). */
export const MIRROR_MAP = {
  pelvis: "pelvis",
  spineLower: "spineLower",
  spineUpper: "spineUpper",
  neck: "neck",
  head: "head",
  upperArmL: "upperArmR",
  forearmL: "forearmR",
  handL: "handR",
  thighL: "thighR",
  shinL: "shinR",
  footL: "footR",
  upperArmR: "upperArmL",
  forearmR: "forearmL",
  handR: "handL",
  thighR: "thighL",
  shinR: "shinL",
  footR: "footL",
} as const satisfies Record<BoneId, BoneId>;

/**
 * Rest angle of each bone relative to its parent's world angle.
 * Angle convention: 0 = down, PI/2 = right, PI = up.
 * The pelvis bone points up along the spine; limbs hang down (PI relative to
 * the upward torso); feet point right (PI/2 relative to the shin).
 */
export const BONE_REST_ANGLE = {
  pelvis: Math.PI,
  spineLower: 0,
  spineUpper: 0,
  neck: 0,
  head: 0,
  upperArmL: Math.PI,
  forearmL: 0,
  handL: 0,
  thighL: Math.PI,
  shinL: 0,
  footL: Math.PI / 2,
  upperArmR: Math.PI,
  forearmR: 0,
  handR: 0,
  thighR: Math.PI,
  shinR: 0,
  footR: Math.PI / 2,
} as const satisfies Record<BoneId, number>;

/** Which end of the parent bone a child is attached to. */
export const BONE_ATTACH_END = {
  pelvis: "start",
  spineLower: "end",
  spineUpper: "end",
  neck: "end",
  head: "end",
  upperArmL: "end",
  forearmL: "end",
  handL: "end",
  thighL: "start",
  shinL: "end",
  footL: "end",
  upperArmR: "end",
  forearmR: "end",
  handR: "end",
  thighR: "start",
  shinR: "end",
  footR: "end",
} as const satisfies Record<BoneId, "start" | "end">;

/** Bones that attach with a lateral offset (shoulder / hip width). */
export const BONE_LATERAL_ATTACH = {
  pelvis: null,
  spineLower: null,
  spineUpper: null,
  neck: null,
  head: null,
  upperArmL: "shoulder",
  forearmL: null,
  handL: null,
  thighL: "hip",
  shinL: null,
  footL: null,
  upperArmR: "shoulder",
  forearmR: null,
  handR: null,
  thighR: "hip",
  shinR: null,
  footR: null,
} as const satisfies Record<BoneId, "shoulder" | "hip" | null>;

export interface AvatarColors {
  skin: string;
  skinFar: string;
  clothing: string;
  clothingFar: string;
}

export interface AvatarHull {
  /** Half-widths of the torso hull at hip, waist and shoulder (unit height). */
  hip: number;
  waist: number;
  shoulder: number;
}

export interface Avatar {
  /** Bone lengths, normalized to a unit height of 1.0. */
  lengths: Record<BoneId, number>;
  /** Stroke widths, normalized to a unit height of 1.0. */
  widths: Record<BoneId, number>;
  headRadius: number;
  /** Lateral offset of the arm joints from the spine, per side. */
  shoulderHalfWidth: number;
  /** Lateral offset of the leg joints from the pelvis, per side. */
  hipHalfWidth: number;
  hull: AvatarHull;
  colors: AvatarColors;
}

export const DEFAULT_AVATAR: Avatar = {
  lengths: {
    pelvis: 0.03,
    spineLower: 0.16,
    spineUpper: 0.16,
    neck: 0.04,
    head: 0.12,
    upperArmL: 0.15,
    forearmL: 0.13,
    handL: 0.05,
    thighL: 0.22,
    shinL: 0.22,
    footL: 0.08,
    upperArmR: 0.15,
    forearmR: 0.13,
    handR: 0.05,
    thighR: 0.22,
    shinR: 0.22,
    footR: 0.08,
  },
  widths: {
    pelvis: 0.08,
    spineLower: 0.08,
    spineUpper: 0.08,
    neck: 0.035,
    head: 0.12,
    upperArmL: 0.05,
    forearmL: 0.05,
    handL: 0.035,
    thighL: 0.05,
    shinL: 0.05,
    footL: 0.04,
    upperArmR: 0.05,
    forearmR: 0.05,
    handR: 0.035,
    thighR: 0.05,
    shinR: 0.05,
    footR: 0.04,
  },
  headRadius: 0.06,
  shoulderHalfWidth: 0.085,
  hipHalfWidth: 0.035,
  hull: { hip: 0.07, waist: 0.055, shoulder: 0.095 },
  colors: {
    skin: "#e2b08c",
    skinFar: "#c28f6c",
    clothing: "#4f6f8f",
    clothingFar: "#3d5873",
  },
};
