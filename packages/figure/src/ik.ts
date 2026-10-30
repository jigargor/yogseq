import { clamp, directionFromAngle, normalizeAngle, type Point } from "./math";

export interface TwoBoneIKResult {
  /** World angle of the first bone (see `math.ts` for the convention). */
  angle1: number;
  /** Angle of the second bone *relative* to the first bone. */
  angle2: number;
  /** Solved middle joint (elbow / knee). */
  joint: Point;
  /** Solved end effector (wrist / ankle); equals `target` when reachable. */
  end: Point;
  /** False when the target is outside the reachable annulus (result is clamped). */
  reachable: boolean;
}

const EPSILON = 1e-9;

/**
 * Analytic two-bone IK (arms and legs).
 *
 * `bendPositive` picks which side the middle joint bends toward: the joint is
 * placed at `base + alpha` (true) or `base - alpha` (false), where `base` is
 * the direction origin -> target. Because positive angles rotate from down
 * toward right, a leg pointing straight down with `bendPositive = true` bends
 * its knee toward +X.
 *
 * Unreachable targets are clamped: too far gives a fully straight limb toward
 * the target; too close gives a fully folded limb.
 */
export function solveTwoBoneIK(
  origin: Point,
  target: Point,
  length1: number,
  length2: number,
  bendPositive: boolean,
): TwoBoneIKResult {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const rawDistance = Math.hypot(dx, dy);

  const minReach = Math.abs(length1 - length2);
  const maxReach = length1 + length2;
  const distance = clamp(rawDistance, Math.max(minReach, EPSILON), Math.max(maxReach, EPSILON));
  const reachable = rawDistance <= maxReach + EPSILON && rawDistance >= minReach - EPSILON;

  const base = rawDistance > EPSILON ? Math.atan2(dx, dy) : 0;

  const denominator = 2 * length1 * distance;
  const cosAlpha =
    denominator > EPSILON
      ? clamp((length1 * length1 + distance * distance - length2 * length2) / denominator, -1, 1)
      : 1;
  const alpha = Math.acos(cosAlpha);

  const angle1 = normalizeAngle(base + (bendPositive ? alpha : -alpha));
  const dir1 = directionFromAngle(angle1);
  const joint: Point = { x: origin.x + dir1.x * length1, y: origin.y + dir1.y * length1 };

  const reach = directionFromAngle(base);
  const effectiveTarget: Point = {
    x: origin.x + reach.x * distance,
    y: origin.y + reach.y * distance,
  };
  const world2 = Math.atan2(effectiveTarget.x - joint.x, effectiveTarget.y - joint.y);
  const angle2 = normalizeAngle(world2 - angle1);

  const dir2 = directionFromAngle(angle1 + angle2);
  const end: Point = { x: joint.x + dir2.x * length2, y: joint.y + dir2.y * length2 };

  return { angle1, angle2, joint, end, reachable };
}
