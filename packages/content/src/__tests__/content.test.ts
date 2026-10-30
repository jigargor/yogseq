import { describe, expect, it } from "vitest";
import { DEFAULT_POSE } from "@yogseq/figure";
import {
  buildCatalog,
  loadPoses,
  loadSamples,
  resolveContentPaths,
  validatePoseSet,
} from "../catalog";
import { POSE_TYPES, POSITIONS, poseSchema, poseSourceSchema, type Pose } from "../index";

function samplePose(overrides: Partial<Pose> = {}): Pose {
  return {
    id: "mountain",
    slug: "mountain",
    nameEn: "Mountain Pose",
    nameSanskrit: "Tadasana",
    nameSanskritDiacritics: "Tāḍāsana",
    aliases: ["Tadasana", "Standing Tall"],
    position: "standing",
    types: ["balance"],
    level: "beginner",
    sidedness: "symmetric",
    rig: structuredClone(DEFAULT_POSE),
    props: [],
    cues: ["Root through both feet.", "Lengthen the spine.", "Relax the shoulders."],
    benefits: ["Improves posture"],
    cautions: ["Soften the knees"],
    related: { prep: [], counter: [], variations: [] },
    status: "published",
    version: 1,
    ...overrides,
  };
}

describe("taxonomy", () => {
  it("exposes the expected position and pose type ids", () => {
    expect(Object.keys(POSITIONS)).toContain("armBalance");
    expect(POSE_TYPES.forwardFold).toBe("Forward Fold");
  });
});

describe("poseSchema", () => {
  it("accepts a valid pose built on the default figure rig", () => {
    expect(poseSchema.safeParse(samplePose()).success).toBe(true);
  });

  it("rejects too few cues, bad slugs and unknown taxonomy ids", () => {
    expect(poseSchema.safeParse(samplePose({ cues: ["only one"] })).success).toBe(false);
    expect(poseSchema.safeParse(samplePose({ slug: "Not A Slug" })).success).toBe(false);
    expect(poseSchema.safeParse({ ...samplePose(), position: "floating" }).success).toBe(false);
  });

  it("rejects rigs that are missing bones", () => {
    const rig = structuredClone(DEFAULT_POSE) as unknown as { bones: Record<string, unknown> };
    delete rig.bones.head;
    expect(poseSchema.safeParse({ ...samplePose(), rig }).success).toBe(false);
  });

  it("lets authored files omit id, status and version", () => {
    const { id: _id, status: _status, version: _version, ...source } = samplePose();
    expect(poseSourceSchema.safeParse(source).success).toBe(true);
  });
});

describe("validatePoseSet", () => {
  it("flags duplicates and unknown related references", () => {
    const poses = [
      samplePose(),
      samplePose({
        id: "other",
        slug: "other",
        related: { prep: ["missing"], counter: [], variations: [] },
      }),
      samplePose({ id: "mountain", slug: "mountain-copy" }),
    ];
    const errors = validatePoseSet(poses);
    expect(errors.some((e) => e.includes('duplicate id "mountain"'))).toBe(true);
    expect(errors.some((e) => e.includes('unknown pose "missing"'))).toBe(true);
  });
});

describe("buildCatalog", () => {
  it("excludes drafts and sorts by English name", () => {
    const catalog = buildCatalog([
      samplePose({ id: "b", slug: "b", nameEn: "Boat" }),
      samplePose({ id: "a", slug: "a", nameEn: "Arrow" }),
      samplePose({ id: "d", slug: "d", nameEn: "Draft", status: "draft" }),
    ]);
    expect(catalog.poses.map((p) => p.nameEn)).toEqual(["Arrow", "Boat"]);
    expect(catalog.version).toBe(1);
  });
});

describe("authored content", () => {
  const paths = resolveContentPaths();
  const { items: poses, errors } = loadPoses(paths.posesDir);

  it("loads every pose file without validation errors", () => {
    expect(errors).toEqual([]);
    expect(validatePoseSet(poses)).toEqual([]);
  });

  it("ships a practical library of about 150 poses across all positions", () => {
    expect(poses.length).toBeGreaterThanOrEqual(140);
    const positions = new Set(poses.map((p) => p.position));
    for (const position of Object.keys(POSITIONS))
      expect(positions.has(position as Pose["position"])).toBe(true);
  });

  it("validates the sample sequences against the catalog", () => {
    const samples = loadSamples(paths.samplesDir, new Set(poses.map((p) => p.id)));
    expect(samples.errors).toEqual([]);
    expect(samples.items.length).toBe(3);
  });
});
