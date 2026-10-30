import { z } from "zod";
import { LEVEL_IDS } from "./taxonomy";
import { slugSchema } from "./pose-schema";

export const SEQUENCE_ITEM_KINDS = ["pose", "section", "note"] as const;
export type SequenceItemKind = (typeof SEQUENCE_ITEM_KINDS)[number];

export const SEQUENCE_SIDES = ["left", "right"] as const;
export type SequenceSide = (typeof SEQUENCE_SIDES)[number];

export const sequenceItemSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(SEQUENCE_ITEM_KINDS),
    poseId: slugSchema.optional(),
    side: z.enum(SEQUENCE_SIDES).optional(),
    durationSec: z.number().int().nonnegative().optional(),
    breaths: z.number().int().positive().optional(),
    note: z.string().optional(),
    title: z.string().optional(),
  })
  .superRefine((item, ctx) => {
    const require = (field: "poseId" | "title" | "note"): void => {
      if (!item[field])
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${item.kind} items require ${field}`,
        });
    };
    if (item.kind === "pose") require("poseId");
    if (item.kind === "section") require("title");
    if (item.kind === "note") require("note");
  });

export type SequenceItem = z.infer<typeof sequenceItemSchema>;

export const sampleSequenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  level: z.enum(LEVEL_IDS),
  style: z.string().min(1),
  targetMinutes: z.number().positive(),
  tags: z.array(z.string()),
  items: z.array(sequenceItemSchema).min(1),
});

export type SampleSequence = z.infer<typeof sampleSequenceSchema>;
