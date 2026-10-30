/**
 * Shared 2D math helpers.
 *
 * Conventions:
 * - Y+ is down (SVG), X+ is right.
 * - Angles are radians. An angle `a` points along the unit vector
 *   `(sin a, cos a)`: 0 = straight down, PI/2 = right, PI = straight up.
 *   Increasing angles rotate counter-clockwise on screen (down -> right -> up).
 */

export interface Point {
  x: number;
  y: number;
}

export const TWO_PI = Math.PI * 2;

/** Wrap an angle into [-PI, PI]. */
export function normalizeAngle(angle: number): number {
  return angle - TWO_PI * Math.round(angle / TWO_PI);
}

/** Unit direction vector for an angle. */
export function directionFromAngle(angle: number): Point {
  return { x: Math.sin(angle), y: Math.cos(angle) };
}

/** Inverse of `directionFromAngle` for an arbitrary (dx, dy) vector. */
export function angleFromVector(dx: number, dy: number): number {
  return Math.atan2(dx, dy);
}

/**
 * Unit vector pointing to the figure's *left* side, perpendicular to a bone
 * whose world angle is `angle`. For an upright (angle = PI) bone this is +X.
 */
export function leftLateralFromAngle(angle: number): Point {
  return { x: -Math.cos(angle), y: Math.sin(angle) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
