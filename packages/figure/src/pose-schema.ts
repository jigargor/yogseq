import { z } from "zod";
import { BONE_IDS, type BoneId } from "./bones";

export const FIGURE_VIEWS = ["front", "side", "back", "threeQuarter"] as const;
export type FigureView = (typeof FIGURE_VIEWS)[number];

export const FIGURE_PROP_KINDS = ["mat", "block", "strap", "bolster", "chair", "wall"] as const;
export type FigurePropKind = (typeof FIGURE_PROP_KINDS)[number];

export interface BonePose {
  /** Radians, relative to parent world angle + bone rest angle. */
  angle: number;
  /** Length multiplier used for foreshortening (default 1). */
  scale?: number;
  /** Draw depth; higher = closer to the viewer (default 0). */
  depth?: number;
}

export interface FigureProp {
  kind: FigurePropKind;
  /** Position in unit-height coordinates relative to the pelvis origin. */
  x: number;
  y: number;
  rotation?: number;
  length?: number;
  attachedTo?: BoneId;
}

export interface FigurePose {
  version: 1;
  view: FigureView;
  /** Pelvis translation (unit height) and whole-body rotation (radians). */
  root: { x: number; y: number; rotation: number };
  bones: Record<BoneId, BonePose>;
  /** Optional explicit back-to-front draw order. */
  layers?: BoneId[];
  props?: FigureProp[];
  source?: { landmarks3d?: number[] };
}

const boneIdSchema = z.enum(BONE_IDS);

const bonePoseSchema = z.object({
  angle: z.number(),
  scale: z.number().positive().optional(),
  depth: z.number().optional(),
});

const figurePropSchema = z.object({
  kind: z.enum(FIGURE_PROP_KINDS),
  x: z.number(),
  y: z.number(),
  rotation: z.number().optional(),
  length: z.number().positive().optional(),
  attachedTo: boneIdSchema.optional(),
});

export const figurePoseSchema = z.object({
  version: z.literal(1),
  view: z.enum(FIGURE_VIEWS),
  root: z.object({
    x: z.number(),
    y: z.number(),
    rotation: z.number(),
  }),
  bones: z.record(boneIdSchema, bonePoseSchema),
  layers: z.array(boneIdSchema).optional(),
  props: z.array(figurePropSchema).optional(),
  source: z.object({ landmarks3d: z.array(z.number()).optional() }).optional(),
});

export function parseFigurePose(input: unknown): FigurePose {
  return figurePoseSchema.parse(input) as FigurePose;
}

export function safeParseFigurePose(input: unknown) {
  return figurePoseSchema.safeParse(input);
}
