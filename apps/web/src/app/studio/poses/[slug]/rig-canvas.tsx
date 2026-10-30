"use client";

import { useRef, type PointerEvent } from "react";
import {
  BONE_IDS,
  FIGURE_VIEWBOX_HEIGHT,
  FIGURE_VIEWBOX_WIDTH,
  Figure,
  forwardKinematics,
  segmentsById,
  type BoneId,
  type FigurePose,
} from "@yogseq/figure";
import {
  clientToViewPoint,
  dragFk,
  dragIk,
  fromViewPoint,
  inferBend,
  isIkEndBone,
  toViewPoint,
  type DragMode,
  type IkEndBone,
} from "./rig-ops";

interface RigCanvasProps {
  rig: FigurePose;
  mode: DragMode;
  selected: BoneId;
  /** Explicit bend choice per IK chain; undefined = infer from the current pose. */
  bend: Partial<Record<IkEndBone, boolean>>;
  photoUrl: string | null;
  photoOpacity: number;
  onSelect: (boneId: BoneId) => void;
  /** Called once when a drag actually changes something (create an undo step). */
  onCheckpoint: () => void;
  onRigChange: (updater: (previous: FigurePose) => FigurePose) => void;
  onBendResolved: (endBone: IkEndBone, bendPositive: boolean) => void;
}

type DragTarget = BoneId | "root";

interface DragState {
  target: DragTarget;
  hasMoved: boolean;
  bendPositive: boolean;
}

const HANDLE_RADIUS = 4.5;
const HIT_RADIUS = 10;

export function RigCanvas({
  rig,
  mode,
  selected,
  bend,
  photoUrl,
  photoOpacity,
  onSelect,
  onCheckpoint,
  onRigChange,
  onBendResolved,
}: RigCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const segments = segmentsById(forwardKinematics(rig));
  const root = toViewPoint(segments.pelvis.start);

  function toUnitPoint(event: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    return fromViewPoint(clientToViewPoint(event.clientX, event.clientY, rect));
  }

  function handlePointerDown(event: PointerEvent<SVGElement>, target: DragTarget) {
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);

    let bendPositive = true;
    if (target !== "root") {
      onSelect(target);
      if (mode === "ik" && isIkEndBone(target)) {
        bendPositive = bend[target] ?? inferBend(rig, target);
        onBendResolved(target, bendPositive);
      }
    }
    dragRef.current = { target, hasMoved: false, bendPositive };
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toUnitPoint(event);

    if (!drag.hasMoved) {
      drag.hasMoved = true;
      onCheckpoint();
    }

    const { target, bendPositive } = drag;
    onRigChange((previous) => {
      if (target === "root") return { ...previous, root: { ...previous.root, x: point.x, y: point.y } };
      if (mode === "ik" && isIkEndBone(target)) return dragIk(previous, target, point, bendPositive);
      return dragFk(previous, target, point);
    });
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    svgRef.current?.releasePointerCapture(event.pointerId);
  }

  const selectedSegment = segments[selected];
  const selectedStart = toViewPoint(selectedSegment.start);
  const selectedEnd = toViewPoint(selectedSegment.end);

  return (
    <div className="bg-card relative aspect-[200/280] w-full max-w-[480px] touch-none overflow-hidden rounded-lg border">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL, not optimisable
        <img
          src={photoUrl}
          alt="Reference"
          className="absolute inset-0 h-full w-full object-contain"
          style={{ opacity: photoOpacity }}
          draggable={false}
        />
      ) : null}

      <Figure
        pose={rig}
        skin="solid"
        showMat
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${FIGURE_VIEWBOX_WIDTH} ${FIGURE_VIEWBOX_HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Rig editor"
      >
        <line
          x1={selectedStart.x}
          y1={selectedStart.y}
          x2={selectedEnd.x}
          y2={selectedEnd.y}
          stroke="var(--primary)"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.7}
          pointerEvents="none"
        />

        <Handle
          cx={root.x}
          cy={root.y}
          kind="root"
          isSelected={false}
          onPointerDown={(event) => handlePointerDown(event, "root")}
          label="Move whole figure"
        />

        {BONE_IDS.map((boneId) => {
          const tip = toViewPoint(segments[boneId].end);
          const isIk = mode === "ik" && isIkEndBone(boneId);
          return (
            <Handle
              key={boneId}
              cx={tip.x}
              cy={tip.y}
              kind={isIk ? "ik" : "fk"}
              isSelected={boneId === selected}
              onPointerDown={(event) => handlePointerDown(event, boneId)}
              label={`${isIk ? "IK" : "FK"} handle: ${boneId}`}
            />
          );
        })}
      </svg>
    </div>
  );
}

interface HandleProps {
  cx: number;
  cy: number;
  kind: "fk" | "ik" | "root";
  isSelected: boolean;
  label: string;
  onPointerDown: (event: PointerEvent<SVGElement>) => void;
}

const HANDLE_FILL = {
  fk: "#ffffff",
  ik: "#f59e0b",
  root: "#3b82f6",
} as const satisfies Record<HandleProps["kind"], string>;

function Handle({ cx, cy, kind, isSelected, label, onPointerDown }: HandleProps) {
  return (
    <g onPointerDown={onPointerDown} className="cursor-grab active:cursor-grabbing">
      <title>{label}</title>
      <circle cx={cx} cy={cy} r={HIT_RADIUS} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={HANDLE_RADIUS}
        fill={HANDLE_FILL[kind]}
        stroke={isSelected ? "var(--primary)" : "#1f2937"}
        strokeWidth={isSelected ? 2.5 : 1.25}
      />
    </g>
  );
}
