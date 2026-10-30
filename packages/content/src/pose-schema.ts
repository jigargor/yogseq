import { z } from "zod";
import { figurePoseSchema, type FigurePose } from "@yogseq/figure";
import {
  LEVEL_IDS,
  POSE_TYPE_IDS,
  POSITION_IDS,
  PROP_IDS,
  SIDEDNESS_IDS,
  type LevelId,
  type PoseTypeId,
  type PositionId,
  type PropId,
  type SidednessId,
} from "./taxonomy";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .regex(SLUG_PATTERN, "slug must be lowercase letters, digits and single dashes");

export const POSE_STATUSES = ["draft", "published"] as const;
export type PoseStatus = (typeof POSE_STATUSES)[number];

/** `figurePoseSchema` re-typed so inferred content types keep the exact `FigurePose` shape. */
const rigSchema = figurePoseSchema as unknown as z.ZodType<FigurePose>;

const nonEmpty = z.string().trim().min(1);

export const relatedPosesSchema = z.object({
  /** Slugs of poses that prepare the body for this one. */
  prep: z.array(slugSchema),
  /** Slugs of poses that counter or release this one. */
  counter: z.array(slugSchema),
  /** Slugs of variations or progressions. */
  variations: z.array(slugSchema),
});

export const poseSchema = z.object({
  /** Stable identifier; defaults to the slug. */
  id: nonEmpty,
  slug: slugSchema,
  nameEn: nonEmpty,
  nameSanskrit: nonEmpty,
  nameSanskritDiacritics: nonEmpty,
  aliases: z.array(nonEmpty),
  position: z.enum(POSITION_IDS),
  types: z.array(z.enum(POSE_TYPE_IDS)).min(1),
  level: z.enum(LEVEL_IDS),
  sidedness: z.enum(SIDEDNESS_IDS),
  rig: rigSchema,
  props: z.array(z.enum(PROP_IDS)),
  cues: z.array(nonEmpty).min(3).max(6),
  benefits: z.array(nonEmpty),
  cautions: z.array(nonEmpty),
  related: relatedPosesSchema,
  status: z.enum(POSE_STATUSES),
  version: z.number().int().positive(),
});

/** Shape accepted from authored JSON: id, status and version may be omitted. */
export const poseSourceSchema = poseSchema.partial({ id: true, status: true, version: true });

export const poseCatalogSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  poses: z.array(poseSchema),
});

export interface Pose {
  id: string;
  slug: string;
  nameEn: string;
  nameSanskrit: string;
  nameSanskritDiacritics: string;
  aliases: string[];
  position: PositionId;
  types: PoseTypeId[];
  level: LevelId;
  sidedness: SidednessId;
  rig: FigurePose;
  props: PropId[];
  cues: string[];
  benefits: string[];
  cautions: string[];
  related: { prep: string[]; counter: string[]; variations: string[] };
  status: PoseStatus;
  version: number;
}

export type PoseSource = z.input<typeof poseSourceSchema>;
export type RelatedPoses = z.infer<typeof relatedPosesSchema>;

export interface PoseCatalog {
  version: number;
  generatedAt: string;
  poses: Pose[];
}

/** Bump when the shape of `poses.json` changes in a breaking way. */
export const CATALOG_VERSION = 1;
