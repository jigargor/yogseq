import type { SequenceItem } from "@yogseq/content";

/** "90" -> "1:30", "3600" -> "60:00". */
export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Human label for how long a pose is held ("1:30", "5 breaths"). */
export function formatItemHold(item: Pick<SequenceItem, "durationSec" | "breaths">): string | null {
  if (item.durationSec) return formatSeconds(item.durationSec);
  if (item.breaths) return `${item.breaths} ${item.breaths === 1 ? "breath" : "breaths"}`;
  return null;
}

export function totalDurationSeconds(items: readonly SequenceItem[]): number {
  return items.reduce((sum, item) => sum + (item.kind === "pose" ? (item.durationSec ?? 0) : 0), 0);
}
