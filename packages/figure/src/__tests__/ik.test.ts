import { describe, expect, it } from "vitest";
import { directionFromAngle } from "../math";
import { solveTwoBoneIK } from "../ik";

const origin = { x: 0, y: 0 };

function forwardEnd(angle1: number, angle2: number, l1: number, l2: number) {
  const d1 = directionFromAngle(angle1);
  const d2 = directionFromAngle(angle1 + angle2);
  return { x: d1.x * l1 + d2.x * l2, y: d1.y * l1 + d2.y * l2 };
}

describe("solveTwoBoneIK", () => {
  it.each([true, false])("reaches a reachable target (bendPositive=%s)", (bend) => {
    const targets = [
      { x: 0.1, y: 0.35 },
      { x: -0.25, y: 0.2 },
      { x: 0.3, y: -0.1 },
      { x: 0, y: 0.4 },
    ];
    for (const target of targets) {
      const result = solveTwoBoneIK(origin, target, 0.22, 0.22, bend);
      expect(result.reachable).toBe(true);
      const end = forwardEnd(result.angle1, result.angle2, 0.22, 0.22);
      expect(end.x).toBeCloseTo(target.x, 6);
      expect(end.y).toBeCloseTo(target.y, 6);
      expect(result.end.x).toBeCloseTo(target.x, 6);
      expect(result.end.y).toBeCloseTo(target.y, 6);
    }
  });

  it("works with unequal bone lengths", () => {
    const result = solveTwoBoneIK(origin, { x: 0.05, y: 0.2 }, 0.15, 0.13, true);
    const end = forwardEnd(result.angle1, result.angle2, 0.15, 0.13);
    expect(end.x).toBeCloseTo(0.05, 6);
    expect(end.y).toBeCloseTo(0.2, 6);
  });

  it("toggles the bend direction", () => {
    const target = { x: 0, y: 0.3 };
    const positive = solveTwoBoneIK(origin, target, 0.22, 0.22, true);
    const negative = solveTwoBoneIK(origin, target, 0.22, 0.22, false);
    expect(positive.joint.x).toBeGreaterThan(0);
    expect(negative.joint.x).toBeLessThan(0);
    expect(positive.joint.x).toBeCloseTo(-negative.joint.x, 9);
    expect(positive.joint.y).toBeCloseTo(negative.joint.y, 9);
    expect(positive.angle1).toBeCloseTo(-negative.angle1, 9);
    expect(positive.angle2).toBeCloseTo(-negative.angle2, 9);
  });

  it("straightens fully toward an out-of-reach target", () => {
    const result = solveTwoBoneIK(origin, { x: 2, y: 0 }, 0.22, 0.22, true);
    expect(result.reachable).toBe(false);
    expect(result.angle1).toBeCloseTo(Math.PI / 2, 6); // pointing right
    expect(result.angle2).toBeCloseTo(0, 6);
    expect(result.end.x).toBeCloseTo(0.44, 6);
    expect(result.end.y).toBeCloseTo(0, 6);
  });

  it("is straight (angle2 = 0) at exactly full extension", () => {
    const result = solveTwoBoneIK(origin, { x: 0, y: 0.44 }, 0.22, 0.22, false);
    expect(result.reachable).toBe(true);
    expect(result.angle2).toBeCloseTo(0, 6);
    expect(result.angle1).toBeCloseTo(0, 6);
  });

  it("does not produce NaN for a target on the origin", () => {
    const result = solveTwoBoneIK(origin, origin, 0.22, 0.22, true);
    for (const value of [result.angle1, result.angle2, result.joint.x, result.joint.y])
      expect(Number.isFinite(value)).toBe(true);
  });

  it("handles targets inside the minimum reach with unequal lengths", () => {
    const result = solveTwoBoneIK(origin, { x: 0, y: 0.01 }, 0.3, 0.1, true);
    expect(result.reachable).toBe(false);
    expect(Number.isFinite(result.angle1)).toBe(true);
    expect(Number.isFinite(result.angle2)).toBe(true);
  });
});
