import { parseAsBoolean, parseAsInteger } from "nuqs/server";

/** URL-driven print options shared by the print page (server) and its controls (client). */
export const printOptionParsers = {
  figuresPerRow: parseAsInteger.withDefault(4),
  cues: parseAsBoolean.withDefault(false),
  sanskrit: parseAsBoolean.withDefault(true),
  outlineOnly: parseAsBoolean.withDefault(false),
};

export const MIN_FIGURES_PER_ROW = 2;
export const MAX_FIGURES_PER_ROW = 6;

export interface PrintOptions {
  figuresPerRow: number;
  cues: boolean;
  sanskrit: boolean;
  outlineOnly: boolean;
}

export function clampFiguresPerRow(value: number): number {
  return Math.min(MAX_FIGURES_PER_ROW, Math.max(MIN_FIGURES_PER_ROW, value));
}
