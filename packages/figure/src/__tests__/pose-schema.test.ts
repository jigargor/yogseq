import { describe, expect, it } from "vitest";
import { BONE_IDS } from "../bones";
import { DEFAULT_POSE } from "../default-pose";
import { figurePoseSchema, parseFigurePose, safeParseFigurePose } from "../pose-schema";

function clone() {
  return structuredClone(DEFAULT_POSE) as unknown as Record<string, any>;
}

describe("figurePoseSchema", () => {
  it("accepts the default pose", () => {
    expect(figurePoseSchema.safeParse(DEFAULT_POSE).success).toBe(true);
    expect(parseFigurePose(DEFAULT_POSE)).toEqual(DEFAULT_POSE);
  });

  it("accepts optional layers, props and source", () => {
    const pose = {
      ...clone(),
      layers: ["head", "footL"],
      props: [{ kind: "block", x: 0.1, y: 0.4, attachedTo: "handL" }],
      source: { landmarks3d: [0, 1, 2] },
    };
    expect(safeParseFigurePose(pose).success).toBe(true);
  });

  it("accepts bones with only an angle", () => {
    const pose = clone();
    pose.bones.head = { angle: 0.2 };
    expect(safeParseFigurePose(pose).success).toBe(true);
  });

  it.each(["front", "side", "back", "threeQuarter"])("accepts view %s", (view) => {
    expect(safeParseFigurePose({ ...clone(), view }).success).toBe(true);
  });

  it("rejects unknown views and versions", () => {
    expect(safeParseFigurePose({ ...clone(), view: "top" }).success).toBe(false);
    expect(safeParseFigurePose({ ...clone(), version: 2 }).success).toBe(false);
  });

  it("rejects missing bones", () => {
    const pose = clone();
    delete pose.bones.footR;
    expect(safeParseFigurePose(pose).success).toBe(false);
  });

  it("rejects unknown bone ids in bones and layers", () => {
    const withUnknown = clone();
    withUnknown.bones.tail = { angle: 0 };
    expect(safeParseFigurePose(withUnknown).success).toBe(false);
    expect(safeParseFigurePose({ ...clone(), layers: ["tail"] }).success).toBe(false);
  });

  it("rejects non-numeric angles and non-positive scale", () => {
    const badAngle = clone();
    badAngle.bones.neck = { angle: "0" };
    expect(safeParseFigurePose(badAngle).success).toBe(false);

    const badScale = clone();
    badScale.bones.neck = { angle: 0, scale: 0 };
    expect(safeParseFigurePose(badScale).success).toBe(false);
  });

  it("rejects an invalid root", () => {
    const pose = clone();
    pose.root = { x: 0, y: 0 };
    expect(safeParseFigurePose(pose).success).toBe(false);
  });

  it("parseFigurePose throws on invalid input", () => {
    expect(() => parseFigurePose({})).toThrow();
  });

  it("defines all 17 bones in the default pose", () => {
    expect(Object.keys(DEFAULT_POSE.bones).sort()).toEqual([...BONE_IDS].sort());
  });
});
