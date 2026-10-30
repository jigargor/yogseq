import { describe, expect, it } from "vitest";
import { BONE_IDS, BONE_PARENT, DEFAULT_AVATAR } from "../bones";
import { createDefaultPose, DEFAULT_POSE } from "../default-pose";
import {
  forwardKinematics,
  resolveLayerOrder,
  segmentsById,
  torsoHullPoints,
} from "../fk";

describe("forwardKinematics", () => {
  const segments = forwardKinematics(DEFAULT_POSE);
  const seg = segmentsById(segments);

  it("returns one segment per bone, in order", () => {
    expect(segments.map((s) => s.boneId)).toEqual([...BONE_IDS]);
    expect(BONE_IDS).toHaveLength(17);
  });

  it("starts the pelvis at the root origin and points up", () => {
    expect(seg.pelvis.start).toEqual({ x: 0, y: 0 });
    expect(seg.pelvis.end.x).toBeCloseTo(0);
    expect(seg.pelvis.end.y).toBeCloseTo(-DEFAULT_AVATAR.lengths.pelvis);
  });

  it("chains child starts to parent ends (except lateral/hip attachments)", () => {
    for (const bone of ["spineLower", "spineUpper", "neck", "head", "forearmL", "shinR"] as const) {
      const parent = seg[BONE_PARENT[bone]!];
      expect(seg[bone].start.x).toBeCloseTo(parent.end.x);
      expect(seg[bone].start.y).toBeCloseTo(parent.end.y);
    }
  });

  it("stacks the head above the torso with the Y axis pointing down", () => {
    expect(seg.head.end.y).toBeLessThan(seg.neck.end.y);
    expect(seg.neck.end.y).toBeLessThan(seg.spineUpper.end.y);
    expect(seg.spineUpper.end.y).toBeLessThan(0);
  });

  it("hangs legs straight down from the hips", () => {
    const { thighL, shinL, thighR } = seg;
    expect(thighL.end.y).toBeCloseTo(DEFAULT_AVATAR.lengths.thighL);
    expect(shinL.end.y).toBeCloseTo(DEFAULT_AVATAR.lengths.thighL + DEFAULT_AVATAR.lengths.shinL);
    expect(thighL.start.x).toBeCloseTo(DEFAULT_AVATAR.hipHalfWidth);
    expect(thighR.start.x).toBeCloseTo(-DEFAULT_AVATAR.hipHalfWidth);
  });

  it("places the figure's left side on +X in front view", () => {
    expect(seg.upperArmL.start.x).toBeGreaterThan(0);
    expect(seg.upperArmR.start.x).toBeLessThan(0);
  });

  it("collapses lateral offsets in side view", () => {
    const side = { ...createDefaultPose(), view: "side" as const };
    const sideSeg = segmentsById(forwardKinematics(side));
    expect(Math.abs(sideSeg.thighL.start.x)).toBeLessThan(0.005);
  });

  it("applies bone angles relative to the parent", () => {
    const pose = createDefaultPose();
    pose.bones.upperArmL.angle = Math.PI / 2; // swing to the right
    const s = segmentsById(forwardKinematics(pose));
    expect(s.upperArmL.end.x - s.upperArmL.start.x).toBeCloseTo(DEFAULT_AVATAR.lengths.upperArmL);
    expect(s.upperArmL.end.y - s.upperArmL.start.y).toBeCloseTo(0);
    // forearm continues in the same direction at zero relative angle
    expect(s.forearmL.end.x).toBeCloseTo(
      s.upperArmL.end.x + DEFAULT_AVATAR.lengths.forearmL,
    );
  });

  it("applies scale as foreshortening", () => {
    const pose = createDefaultPose();
    pose.bones.thighL.scale = 0.5;
    const s = segmentsById(forwardKinematics(pose));
    expect(s.thighL.length).toBeCloseTo(DEFAULT_AVATAR.lengths.thighL * 0.5);
    expect(s.thighL.end.y).toBeCloseTo(DEFAULT_AVATAR.lengths.thighL * 0.5);
  });

  it("rotates the whole figure with root.rotation and translates with root.x/y", () => {
    const pose = createDefaultPose();
    pose.root = { x: 0.2, y: -0.1, rotation: Math.PI };
    const s = segmentsById(forwardKinematics(pose));
    expect(s.pelvis.start).toEqual({ x: 0.2, y: -0.1 });
    // upside down: head ends below the pelvis
    expect(s.head.end.y).toBeGreaterThan(s.pelvis.start.y);
  });

  it("carries depth from the pose", () => {
    const pose = createDefaultPose();
    pose.bones.handR.depth = -0.4;
    expect(segmentsById(forwardKinematics(pose)).handR.depth).toBe(-0.4);
  });
});

describe("resolveLayerOrder", () => {
  it("returns every bone once", () => {
    const order = resolveLayerOrder(DEFAULT_POSE);
    expect(new Set(order).size).toBe(17);
  });

  it("sorts by depth ascending (far first)", () => {
    const pose = createDefaultPose();
    pose.bones.upperArmL.depth = -1;
    pose.bones.upperArmR.depth = 1;
    const order = resolveLayerOrder(pose);
    expect(order[0]).toBe("upperArmL");
    expect(order[order.length - 1]).toBe("upperArmR");
  });

  it("honors explicit layers and appends missing bones", () => {
    const pose = createDefaultPose();
    pose.layers = ["head", "footL"];
    const order = resolveLayerOrder(pose);
    expect(order.slice(0, 2)).toEqual(["head", "footL"]);
    expect(order).toHaveLength(17);
  });
});

describe("torsoHullPoints", () => {
  it("builds a six-point symmetric hull in front view", () => {
    const pose = DEFAULT_POSE;
    const points = torsoHullPoints(forwardKinematics(pose), pose.view);
    expect(points).toHaveLength(6);
    const [hipL, , shoulderL, , , hipR] = points;
    expect(hipL!.x).toBeCloseTo(-hipR!.x);
    expect(shoulderL!.x).toBeGreaterThan(hipL!.x);
  });
});
