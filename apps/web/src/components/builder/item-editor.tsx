"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import type { Pose, SequenceItem, SequenceSide } from "@yogseq/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBuilderStore } from "@/lib/builder/store";
import { PoseThumbnail } from "./pose-thumbnail";
import { SIDE_LABELS } from "./sequence-canvas";

const OPPOSITE_SIDE: Record<SequenceSide, SequenceSide> = { left: "right", right: "left" };

export interface ItemEditorProps {
  poseById: ReadonlyMap<string, Pose>;
  /** Bottom sheet on mobile, right-hand sheet on desktop. */
  isDesktop: boolean;
}

export function ItemEditor({ poseById, isDesktop }: ItemEditorProps) {
  const selectedItemId = useBuilderStore((state) => state.selectedItemId);
  const item = useBuilderStore((state) =>
    state.selectedItemId
      ? state.document.items.find((entry) => entry.id === state.selectedItemId)
      : undefined,
  );
  const selectItem = useBuilderStore((state) => state.selectItem);
  const isOpen = Boolean(selectedItemId && item);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && selectItem(null)}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={isDesktop ? "sm:max-w-md" : "max-h-[85dvh] rounded-t-2xl"}
      >
        {item ? (
          <ItemEditorBody
            key={item.id}
            item={item}
            pose={item.poseId ? poseById.get(item.poseId) : undefined}
            onClose={() => selectItem(null)}
          />
        ) : (
          <SheetHeader>
            <SheetTitle>Edit item</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ItemEditorBodyProps {
  item: SequenceItem;
  pose?: Pose;
  onClose: () => void;
}

function ItemEditorBody({ item, pose, onClose }: ItemEditorBodyProps) {
  const updateItem = useBuilderStore((state) => state.updateItem);
  const removeItem = useBuilderStore((state) => state.removeItem);
  const addPose = useBuilderStore((state) => state.addPose);
  const hasOppositeSide = useBuilderStore((state) =>
    item.kind === "pose" && item.side
      ? state.document.items.some(
          (entry) =>
            entry.id !== item.id &&
            entry.kind === "pose" &&
            entry.poseId === item.poseId &&
            entry.side === OPPOSITE_SIDE[item.side!],
        )
      : true,
  );

  const isPose = item.kind === "pose";
  const isAsymmetric = pose?.sidedness === "asymmetric";

  function setNumber(field: "durationSec" | "breaths", raw: string) {
    const value = raw === "" ? undefined : Math.max(0, Math.floor(Number(raw)));
    updateItem(item.id, { [field]: value === 0 && field === "breaths" ? undefined : value });
  }

  function addOtherSide() {
    if (!item.side || !item.poseId) return;
    addPose(item.poseId, {
      side: OPPOSITE_SIDE[item.side],
      durationSec: item.durationSec,
      breaths: item.breaths,
      afterId: item.id,
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {isPose ? (pose?.nameEn ?? "Pose") : item.kind === "section" ? "Section" : "Note"}
        </SheetTitle>
        <SheetDescription>
          {isPose && pose ? pose.nameSanskritDiacritics : "Edit this item in your sequence."}
        </SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4">
        {isPose && pose ? (
          <div className="flex justify-center rounded-lg bg-muted/40 py-3">
            <PoseThumbnail pose={pose} size={112} side={item.side} />
          </div>
        ) : null}

        {item.kind === "section" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              value={item.title ?? ""}
              onChange={(event) => updateItem(item.id, { title: event.target.value })}
            />
          </div>
        ) : null}

        {item.kind === "note" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-note">Note</Label>
            <Textarea
              id="item-note"
              rows={4}
              value={item.note ?? ""}
              onChange={(event) => updateItem(item.id, { note: event.target.value })}
            />
          </div>
        ) : null}

        {isPose && isAsymmetric ? (
          <div className="flex flex-col gap-2">
            <Label>Side</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={item.side ?? "both"}
              onValueChange={(value) => {
                if (!value) return;
                updateItem(item.id, { side: value === "both" ? undefined : (value as SequenceSide) });
              }}
              className="w-full"
            >
              {(Object.keys(SIDE_LABELS) as (keyof typeof SIDE_LABELS)[]).map((key) => (
                <ToggleGroupItem key={key} value={key} className="flex-1">
                  {SIDE_LABELS[key]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {item.side && !hasOppositeSide ? (
              <Button variant="secondary" size="sm" onClick={addOtherSide}>
                <PlusIcon />
                Add {SIDE_LABELS[OPPOSITE_SIDE[item.side]].toLowerCase()} side too
              </Button>
            ) : null}
          </div>
        ) : null}

        {isPose ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="item-duration">Duration (sec)</Label>
                <Input
                  id="item-duration"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5}
                  value={item.durationSec ?? ""}
                  onChange={(event) => setNumber("durationSec", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="item-breaths">Breaths</Label>
                <Input
                  id="item-breaths"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={item.breaths ?? ""}
                  onChange={(event) => setNumber("breaths", event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="item-pose-note">Note</Label>
              <Textarea
                id="item-pose-note"
                rows={3}
                placeholder="Teaching cue, modification, prop…"
                value={item.note ?? ""}
                onChange={(event) => updateItem(item.id, { note: event.target.value })}
              />
            </div>
          </>
        ) : null}
      </div>

      <SheetFooter className="flex-row justify-between">
        <Button
          variant="destructive"
          onClick={() => {
            removeItem(item.id);
            onClose();
          }}
        >
          <Trash2Icon />
          Delete
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </SheetFooter>
    </>
  );
}
