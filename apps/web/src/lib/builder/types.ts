import type { LevelId, SequenceItem } from "@yogseq/content";

export interface BuilderDocument {
  id: string;
  title: string;
  description: string;
  level: LevelId;
  style: string;
  targetMinutes: number;
  tags: string[];
  items: SequenceItem[];
  /** Epoch milliseconds of the last local edit. */
  updatedAt: number;
}

export const DEFAULT_POSE_DURATION_SEC = 30;
export const DEFAULT_DOCUMENT_TITLE = "Untitled sequence";
