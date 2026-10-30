"use client";

import { useMemo } from "react";
import { ClockIcon, ListOrderedIcon } from "lucide-react";
import { POSITIONS, type Pose, type PositionId } from "@yogseq/content";
import { Badge } from "@/components/ui/badge";
import {
  formatDuration,
  poseCount,
  positionMix,
  totalDurationSec,
  useBuilderStore,
} from "@/lib/builder/store";
import { cn } from "@/lib/utils";

export interface StatsStripProps {
  poseById: ReadonlyMap<string, Pose>;
  className?: string;
}

export function StatsStrip({ poseById, className }: StatsStripProps) {
  const items = useBuilderStore((state) => state.document.items);

  const stats = useMemo(
    () => ({
      duration: totalDurationSec(items),
      count: poseCount(items),
      mix: Object.entries(positionMix(items, poseById)) as [PositionId, number][],
    }),
    [items, poseById],
  );

  return (
    <div className={cn("flex min-w-0 items-center gap-3 text-sm", className)}>
      <span className="flex shrink-0 items-center gap-1.5 font-medium">
        <ClockIcon className="size-4 text-muted-foreground" />
        {stats.duration > 0 ? formatDuration(stats.duration) : "0 min"}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 font-medium">
        <ListOrderedIcon className="size-4 text-muted-foreground" />
        {stats.count} {stats.count === 1 ? "pose" : "poses"}
      </span>
      <div className="hidden min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] sm:flex">
        {stats.mix
          .sort(([, a], [, b]) => b - a)
          .map(([position, count]) => (
            <Badge key={position} variant="secondary" className="shrink-0">
              {POSITIONS[position]} {count}
            </Badge>
          ))}
      </div>
    </div>
  );
}
