import type { ReactElement } from "react";
import { DEFAULT_AVATAR, type Avatar, type BoneId } from "./bones";
import {
  forwardKinematics,
  resolveLayerOrder,
  segmentsById,
  torsoHullPoints,
  type FkSegment,
} from "./fk";
import type { Point } from "./math";
import type { FigurePose } from "./pose-schema";

export type FigureSkin = "solid" | "line";
export type FigureSide = "left" | "right";

export interface FigureProps {
  pose: FigurePose;
  skin?: FigureSkin;
  /** Rendered width in CSS pixels; height follows the 200:280 aspect ratio. */
  size?: number;
  /** Which side faces the viewer in side / three-quarter views (the other side is "far"). */
  side?: FigureSide;
  avatar?: Avatar;
  className?: string;
  showMat?: boolean;
}

export const FIGURE_VIEWBOX_WIDTH = 200;
export const FIGURE_VIEWBOX_HEIGHT = 280;
/** Pixels (in viewBox units) per unit of normalized figure height. */
export const FIGURE_UNIT = 232;
/** Y coordinate of the floor / bottom of the feet in a standing pose. */
export const FIGURE_GROUND_Y = 240;

const TORSO_BONES: ReadonlySet<BoneId> = new Set(["pelvis", "spineLower", "spineUpper"]);
const FAR_DEPTH_THRESHOLD = -0.05;
const LINE_STROKE_WIDTH = 2.5;

type DrawItem = BoneId | "torso";

export function Figure({
  pose,
  skin = "solid",
  size = 200,
  side,
  avatar = DEFAULT_AVATAR,
  className,
  showMat = false,
}: FigureProps): ReactElement {
  const segments = forwardKinematics(pose, avatar);
  const byId = segmentsById(segments);
  const originY =
    FIGURE_GROUND_Y -
    (avatar.lengths.thighL + avatar.lengths.shinL + avatar.widths.footL / 2) * FIGURE_UNIT;
  const toView = (p: Point): Point => ({
    x: FIGURE_VIEWBOX_WIDTH / 2 + p.x * FIGURE_UNIT,
    y: originY + p.y * FIGURE_UNIT,
  });

  const isSolid = skin === "solid";
  const drawList = buildDrawList(resolveLayerOrder(pose));

  const elements = drawList.map((item) => {
    if (item === "torso") {
      const hull = torsoHullPoints(segments, pose.view, avatar, isSolid ? 0.02 : 0)
        .map(toView)
        .map((p) => `${round(p.x)},${round(p.y)}`)
        .join(" ");
      return (
        <polygon
          key="torso"
          points={hull}
          fill={isSolid ? avatar.colors.clothing : "none"}
          stroke={isSolid ? avatar.colors.clothing : "currentColor"}
          strokeWidth={isSolid ? 0.04 * FIGURE_UNIT : LINE_STROKE_WIDTH}
          strokeLinejoin="round"
        />
      );
    }

    const segment = byId[item];
    const far = isFarSegment(segment, pose, side);
    const start = toView(segment.start);
    const end = toView(segment.end);

    if (item === "head") {
      const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      return (
        <circle
          key="head"
          cx={round(center.x)}
          cy={round(center.y)}
          r={avatar.headRadius * FIGURE_UNIT}
          fill={isSolid ? avatar.colors.skin : "none"}
          stroke={isSolid ? "none" : "currentColor"}
          strokeWidth={LINE_STROKE_WIDTH}
        />
      );
    }

    return (
      <line
        key={item}
        x1={round(start.x)}
        y1={round(start.y)}
        x2={round(end.x)}
        y2={round(end.y)}
        stroke={isSolid ? (far ? avatar.colors.skinFar : avatar.colors.skin) : "currentColor"}
        strokeOpacity={!isSolid && far ? 0.55 : 1}
        strokeWidth={isSolid ? segment.width * FIGURE_UNIT : LINE_STROKE_WIDTH}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${FIGURE_VIEWBOX_WIDTH} ${FIGURE_VIEWBOX_HEIGHT}`}
      width={size}
      height={(size * FIGURE_VIEWBOX_HEIGHT) / FIGURE_VIEWBOX_WIDTH}
      className={className}
      role="img"
      aria-label="Yoga pose figure"
    >
      {showMat ? (
        <line
          x1={20}
          y1={FIGURE_GROUND_Y + 3}
          x2={180}
          y2={FIGURE_GROUND_Y + 3}
          stroke={isSolid ? "#6b7280" : "currentColor"}
          strokeOpacity={isSolid ? 1 : 0.6}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ) : null}
      {elements}
    </svg>
  );
}

/** Collapse pelvis/spine bones into a single "torso" hull at the earliest layer. */
function buildDrawList(order: readonly BoneId[]): DrawItem[] {
  const items: DrawItem[] = [];
  let torsoAdded = false;
  for (const id of order) {
    if (!TORSO_BONES.has(id)) {
      items.push(id);
      continue;
    }
    if (torsoAdded) continue;
    torsoAdded = true;
    items.push("torso");
  }
  return items;
}

function isFarSegment(segment: FkSegment, pose: FigurePose, side?: FigureSide): boolean {
  if (segment.side === "center") return false;
  const sideAware = pose.view === "side" || pose.view === "threeQuarter";
  if (side && sideAware) return segment.side !== side;
  return segment.depth < FAR_DEPTH_THRESHOLD;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
