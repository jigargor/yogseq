import { describe, expect, it } from "vitest";
import { BONE_IDS } from "../bones";
import { forwardKinematics, segmentsById } from "../fk";
import { LANDMARK_INDEX as L, landmarksToPose, type Landmark } from "../landmarks";
import { figurePoseSchema } from "../pose-schema";

/** Front-facing standing subject in normalized image coordinates (Y down). */
function standingLandmarks(): Landmark[] {
  const points: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
  }));
  const set = (index: number, x: number, y: number, z = 0) => {
    points[index] = { x, y, z, visibility: 1 };
  };
  set(L.nose, 0.5, 0.17);
  set(L.leftEye, 0.52, 0.15);
  set(L.rightEye, 0.48, 0.15);
  set(L.leftEar, 0.54, 0.16);
  set(L.rightEar, 0.46, 0.16);
  set(L.mouthLeft, 0.51, 0.2);
  set(L.mouthRight, 0.49, 0.2);
  // subject's left is on the image right when facing the camera
  set(L.leftShoulder, 0.58, 0.28);
  set(L.rightShoulder, 0.42, 0.28);
  set(L.leftElbow, 0.6, 0.42);
  set(L.rightElbow, 0.4, 0.42);
  set(L.leftWrist, 0.61, 0.55);
  set(L.rightWrist, 0.39, 0.55);
  set(L.leftPinky, 0.62, 0.59);
  set(L.rightPinky, 0.38, 0.59);
  set(L.leftIndex, 0.61, 0.6);
  set(L.rightIndex, 0.39, 0.6);
  set(L.leftHip, 0.54, 0.54);
  set(L.rightHip, 0.46, 0.54);
  set(L.leftKnee, 0.54, 0.74);
  set(L.rightKnee, 0.46, 0.74);
  set(L.leftAnkle, 0.54, 0.93);
  set(L.rightAnkle, 0.46, 0.93);
  set(L.leftHeel, 0.54, 0.96);
  set(L.rightHeel, 0.46, 0.96);
  set(L.leftFootIndex, 0.56, 0.97);
  set(L.rightFootIndex, 0.44, 0.97);
  return points;
}

function direction(from: { x: number; y: number }, to: { x: number; y: number }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

describe("landmarksToPose", () => {
  it("returns a schema-valid pose with all 17 bones and layers", () => {
    const pose = landmarksToPose(standingLandmarks());
    expect(figurePoseSchema.safeParse(pose).success).toBe(true);
    expect(Object.keys(pose.bones).sort()).toEqual([...BONE_IDS].sort());
    expect(pose.layers).toHaveLength(17);
    expect(pose.version).toBe(1);
  });

  it("detects a front view for a subject facing the camera", () => {
    expect(landmarksToPose(standingLandmarks()).view).toBe("front");
  });

  it("detects back and side views from shoulder orientation", () => {
    const back = standingLandmarks().map((p) => ({ ...p, x: 1 - p.x }));
    expect(landmarksToPose(back).view).toBe("back");

    const side = standingLandmarks();
    side[L.leftShoulder] = { x: 0.5, y: 0.28, z: -0.08, visibility: 1 };
    side[L.rightShoulder] = { x: 0.5, y: 0.28, z: 0.08, visibility: 1 };
    expect(landmarksToPose(side).view).toBe("side");
  });

  it("produces a near-neutral pose for a standing subject", () => {
    const pose = landmarksToPose(standingLandmarks());
    expect(Math.abs(pose.root.rotation)).toBeLessThan(0.05);
    expect(Math.abs(pose.root.x)).toBeLessThan(0.05);
    expect(Math.abs(pose.bones.thighL.angle)).toBeLessThan(0.05);
    expect(Math.abs(pose.bones.shinR.angle)).toBeLessThan(0.05);
    expect(Math.abs(pose.bones.spineUpper.angle)).toBeLessThan(1e-9);
  });

  it("reproduces landmark bone directions through forward kinematics", () => {
    const landmarks = standingLandmarks();
    // raise the left arm up and out
    landmarks[L.leftElbow] = { x: 0.66, y: 0.2, z: 0, visibility: 1 };
    landmarks[L.leftWrist] = { x: 0.7, y: 0.08, z: 0, visibility: 1 };
    landmarks[L.leftPinky] = { x: 0.71, y: 0.05, z: 0, visibility: 1 };
    landmarks[L.leftIndex] = { x: 0.7, y: 0.04, z: 0, visibility: 1 };
    // bend the right knee
    landmarks[L.rightKnee] = { x: 0.4, y: 0.7, z: 0, visibility: 1 };

    const segments = segmentsById(forwardKinematics(landmarksToPose(landmarks)));
    const checks: [keyof typeof segments, number, number][] = [
      ["upperArmL", L.leftShoulder, L.leftElbow],
      ["forearmL", L.leftElbow, L.leftWrist],
      ["thighR", L.rightHip, L.rightKnee],
      ["shinR", L.rightKnee, L.rightAnkle],
    ];
    for (const [id, a, b] of checks) {
      const expected = direction(landmarks[a]!, landmarks[b]!);
      const actual = direction(segments[id].start, segments[id].end);
      expect(actual.x).toBeCloseTo(expected.x, 6);
      expect(actual.y).toBeCloseTo(expected.y, 6);
    }
  });

  it("leans the whole torso through root.rotation", () => {
    const landmarks = standingLandmarks();
    // shift both shoulders to the right: torso leans toward +X
    for (const index of [L.leftShoulder, L.rightShoulder])
      landmarks[index] = { ...landmarks[index]!, x: landmarks[index]!.x + 0.12 };
    const pose = landmarksToPose(landmarks);
    const segments = segmentsById(forwardKinematics(pose));
    expect(segments.spineUpper.end.x).toBeGreaterThan(segments.pelvis.start.x);
    expect(Math.abs(pose.root.rotation)).toBeGreaterThan(0.1);
  });

  it("computes foreshortening scale and depth from world landmarks", () => {
    const landmarks = standingLandmarks();
    const world = landmarks.map((p) => ({
      x: (p.x - 0.5) * 1.8,
      y: (p.y - 0.54) * 1.8,
      z: 0,
    }));
    // left upper arm pointing toward the camera: 0.2 down, 0.2 closer
    world[L.leftShoulder] = { x: 0.2, y: -0.4, z: 0 };
    world[L.leftElbow] = { x: 0.2, y: -0.2, z: -0.2 };

    const pose = landmarksToPose(landmarks, world);
    expect(pose.bones.upperArmL.scale).toBeCloseTo(0.2 / Math.hypot(0.2, 0.2), 6);
    expect(pose.bones.upperArmL.depth).toBeCloseTo(0.1, 6);
    expect(pose.bones.upperArmR.scale).toBeCloseTo(1, 6);
    // closer bones are drawn later (in front)
    const layers = pose.layers!;
    expect(layers.indexOf("upperArmL")).toBeGreaterThan(layers.indexOf("upperArmR"));
    expect(pose.source?.landmarks3d).toHaveLength(99);
  });

  it("falls back to default angles for low-visibility landmarks", () => {
    const landmarks = standingLandmarks();
    landmarks[L.leftWrist] = { x: 0.9, y: 0.1, z: 0, visibility: 0.05 };
    const pose = landmarksToPose(landmarks);
    expect(pose.bones.forearmL.angle).toBe(0);
    expect(pose.bones.forearmL.scale).toBe(1);
  });

  it("throws when fewer than 33 landmarks are provided", () => {
    expect(() => landmarksToPose(standingLandmarks().slice(0, 20))).toThrow(/33/);
  });
});
