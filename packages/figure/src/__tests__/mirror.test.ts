import { describe, expect, it } from "vitest";
import { BONE_IDS, MIRROR_MAP } from "../bones";
import { createDefaultPose, DEFAULT_POSE } from "../default-pose";
import { forwardKinematics, segmentsById } from "../fk";
import { mirrorPose } from "../mirror";
import type { FigurePose } from "../pose-schema";

function asymmetricPose(): FigurePose {
  const pose = createDefaultPose();
  pose.view = "threeQuarter";
  pose.root = { x: 0.1, y: -0.05, rotation: 0.3 };
  pose.bones.upperArmL.angle = 2.4;
  pose.bones.forearmL.angle = -0.7;
  pose.bones.thighR.angle = 0.6;
  pose.bones.shinR.angle = -1.1;
  pose.bones.footR.angle = 0.2;
  pose.bones.spineUpper.angle = -0.25;
  pose.bones.head.angle = 0.15;
  pose.bones.handL.depth = 0.5;
  pose.layers = ["upperArmL", "head", "thighR"];
  pose.props = [{ kind: "block", x: 0.2, y: 0.4, rotation: 0.1, attachedTo: "footL" }];
  return pose;
}

describe("mirrorPose", () => {
  it("is an involution (mirroring twice restores world geometry)", () => {
    const pose = asymmetricPose();
    const twice = mirrorPose(mirrorPose(pose));
    const a = forwardKinematics(pose);
    const b = forwardKinematics(twice);
    a.forEach((seg, i) => {
      expect(b[i]!.end.x).toBeCloseTo(seg.end.x, 9);
      expect(b[i]!.end.y).toBeCloseTo(seg.end.y, 9);
    });
    expect(twice.layers).toEqual(pose.layers);
    expect(twice.props).toEqual(pose.props);
  });

  it("negates x of every joint and swaps left/right bones", () => {
    const pose = asymmetricPose();
    const mirrored = mirrorPose(pose);
    const original = segmentsById(forwardKinematics(pose));
    const flipped = segmentsById(forwardKinematics(mirrored));
    for (const id of BONE_IDS) {
      const source = original[MIRROR_MAP[id]];
      expect(flipped[id].start.x).toBeCloseTo(-source.start.x, 9);
      expect(flipped[id].start.y).toBeCloseTo(source.start.y, 9);
      expect(flipped[id].end.x).toBeCloseTo(-source.end.x, 9);
      expect(flipped[id].end.y).toBeCloseTo(source.end.y, 9);
    }
  });

  it("negates root x and rotation, and keeps y", () => {
    const mirrored = mirrorPose(asymmetricPose());
    expect(mirrored.root).toEqual({ x: -0.1, y: -0.05, rotation: -0.3 });
  });

  it("maps layers, props and keeps depth/scale on the swapped bone", () => {
    const mirrored = mirrorPose(asymmetricPose());
    expect(mirrored.layers).toEqual(["upperArmR", "head", "thighL"]);
    expect(mirrored.props?.[0]).toMatchObject({ x: -0.2, y: 0.4, rotation: -0.1, attachedTo: "footR" });
    expect(mirrored.bones.handR.depth).toBe(0.5);
  });

  it("leaves the symmetric default pose geometrically unchanged", () => {
    const mirrored = mirrorPose(DEFAULT_POSE);
    const a = forwardKinematics(DEFAULT_POSE);
    const b = forwardKinematics(mirrored);
    a.forEach((seg, i) => {
      expect(b[i]!.end.x).toBeCloseTo(seg.end.x, 9);
      expect(b[i]!.end.y).toBeCloseTo(seg.end.y, 9);
    });
  });

  it("does not mutate the input", () => {
    const pose = asymmetricPose();
    const snapshot = structuredClone(pose);
    mirrorPose(pose);
    expect(pose).toEqual(snapshot);
  });
});
