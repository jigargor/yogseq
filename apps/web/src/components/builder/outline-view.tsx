"use client";

import type { Pose } from "@yogseq/content";
import { formatDuration, itemDurationSec, poseNumbers, useBuilderStore } from "@/lib/builder/store";
import { cn } from "@/lib/utils";
import { SIDE_LABELS } from "./sequence-canvas";
import { PoseThumbnail } from "./pose-thumbnail";

export interface OutlineViewProps {
  poseById: ReadonlyMap<string, Pose>;
  className?: string;
}

export function OutlineView({ poseById, className }: OutlineViewProps) {
  const items = useBuilderStore((state) => state.document.items);
  const selectedItemId = useBuilderStore((state) => state.selectedItemId);
  const selectItem = useBuilderStore((state) => state.selectItem);

  if (items.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">Nothing in the sequence yet.</p>;

  const numbers = poseNumbers(items);

  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((item) => {
        const isSelected = item.id === selectedItemId;

        if (item.kind === "section")
          return (
            <li key={item.id} className="mt-4 first:mt-0">
              <button
                type="button"
                onClick={() => selectItem(item.id)}
                className={cn(
                  "w-full border-b py-1 text-left text-xs font-semibold tracking-wide uppercase outline-none focus-visible:underline",
                  isSelected && "border-primary text-primary",
                )}
              >
                {item.title}
              </button>
            </li>
          );

        if (item.kind === "note")
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectItem(item.id)}
                className={cn(
                  "w-full py-1.5 pl-9 text-left text-sm text-muted-foreground italic outline-none focus-visible:underline",
                  isSelected && "text-foreground",
                )}
              >
                {item.note}
              </button>
            </li>
          );

        const pose = item.poseId ? poseById.get(item.poseId) : undefined;
        const durationSec = itemDurationSec(item);
        const isAsymmetric = pose?.sidedness === "asymmetric";

        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => selectItem(item.id)}
              className={cn(
                "flex min-h-10 w-full items-center gap-3 rounded-md px-1 py-1 text-left text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
                isSelected && "bg-accent",
              )}
            >
              <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {numbers.get(item.id)}.
              </span>
              {pose ? <PoseThumbnail pose={pose} size={28} side={item.side} /> : <span className="w-7" />}
              <span className="min-w-0 flex-1 truncate font-medium">
                {pose?.nameEn ?? "Unknown pose"}
                {isAsymmetric ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {SIDE_LABELS[item.side ?? "both"]}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {durationSec > 0 ? formatDuration(durationSec) : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
