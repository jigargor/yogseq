"use client";

import { memo, useMemo } from "react";
import { Figure, mirrorPose, type FigurePose } from "@yogseq/figure";
import type { Pose } from "@yogseq/content";
import { cn } from "@/lib/utils";

/** Catalog rigs are authored for the left side; the right side is a mirror image. */
const AUTHORED_SIDE = "left";
const LINE_SKIN_MAX_SIZE = 48;

export interface PoseThumbnailProps {
  pose: Pick<Pose, "rig">;
  size?: number;
  side?: "left" | "right" | "both";
  className?: string;
}

export const PoseThumbnail = memo(function PoseThumbnail({
  pose,
  size = 96,
  side,
  className,
}: PoseThumbnailProps) {
  const rig = useMemo<FigurePose>(
    () => (side && side !== "both" && side !== AUTHORED_SIDE ? mirrorPose(pose.rig) : pose.rig),
    [pose.rig, side],
  );

  return (
    <Figure
      pose={rig}
      size={size}
      skin={size <= LINE_SKIN_MAX_SIZE ? "line" : "solid"}
      className={cn("shrink-0 text-foreground", className)}
    />
  );
});
