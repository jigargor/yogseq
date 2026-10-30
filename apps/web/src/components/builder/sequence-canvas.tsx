"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, HeadingIcon, LayersIcon, StickyNoteIcon } from "lucide-react";
import type { Pose, SequenceItem } from "@yogseq/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, itemDurationSec, poseNumbers, useBuilderStore } from "@/lib/builder/store";
import { cn } from "@/lib/utils";
import { PoseThumbnail } from "./pose-thumbnail";

export const SIDE_LABELS = {
  left: "Left",
  right: "Right",
  both: "Both sides",
} as const;

export interface SequenceCanvasProps {
  poseById: ReadonlyMap<string, Pose>;
  isCatalogLoading: boolean;
  /** Called on empty-state CTA; used on mobile to open the palette sheet. */
  onRequestAddPoses?: () => void;
  className?: string;
}

export function SequenceCanvas({
  poseById,
  isCatalogLoading,
  onRequestAddPoses,
  className,
}: SequenceCanvasProps) {
  const items = useBuilderStore((state) => state.document.items);
  const selectedItemId = useBuilderStore((state) => state.selectedItemId);
  const reorderItems = useBuilderStore((state) => state.reorderItems);
  const selectItem = useBuilderStore((state) => state.selectItem);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) reorderItems(String(active.id), String(over.id));
  }

  if (items.length === 0)
    return (
      <div className={cn("flex flex-1 flex-col gap-4", className)}>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayersIcon />
            </EmptyMedia>
            <EmptyTitle>Start your sequence</EmptyTitle>
            <EmptyDescription>
              Tap a pose in the library to add it here. Drag to reorder, tap a card to set side,
              duration, and notes.
            </EmptyDescription>
          </EmptyHeader>
          {onRequestAddPoses ? (
            <Button onClick={onRequestAddPoses} className="lg:hidden">
              Add poses
            </Button>
          ) : null}
        </Empty>
        <AddTextRow />
      </div>
    );

  const numbers = poseNumbers(items);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {items.map((item) => (
              <SortableCell
                key={item.id}
                item={item}
                number={numbers.get(item.id)}
                pose={item.poseId ? poseById.get(item.poseId) : undefined}
                isLoading={isCatalogLoading}
                isSelected={item.id === selectedItemId}
                onSelect={() => selectItem(item.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <AddTextRow />
    </div>
  );
}

interface SortableCellProps {
  item: SequenceItem;
  number?: number;
  pose?: Pose;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableCell({ item, number, pose, isLoading, isSelected, onSelect }: SortableCellProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label="Drag to reorder"
      className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative min-w-0",
        item.kind !== "pose" && "col-span-full",
        isDragging && "z-10 opacity-80",
      )}
    >
      {item.kind === "pose" ? (
        <PoseCell
          item={item}
          number={number}
          pose={pose}
          isLoading={isLoading}
          isSelected={isSelected}
          onSelect={onSelect}
          handle={handle}
        />
      ) : item.kind === "section" ? (
        <div
          className={cn(
            "flex items-center gap-2 border-b pb-1",
            isSelected && "border-primary",
          )}
        >
          {handle}
          <button
            type="button"
            onClick={onSelect}
            className="flex min-h-8 min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:underline"
          >
            <HeadingIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-semibold tracking-tight">{item.title}</span>
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 p-2",
            isSelected && "border-primary",
          )}
        >
          {handle}
          <button
            type="button"
            onClick={onSelect}
            className="flex min-h-8 min-w-0 flex-1 items-start gap-2 text-left text-sm outline-none focus-visible:underline"
          >
            <StickyNoteIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="whitespace-pre-wrap text-muted-foreground">{item.note}</span>
          </button>
        </div>
      )}
    </li>
  );
}

interface PoseCellProps {
  item: SequenceItem;
  number?: number;
  pose?: Pose;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: () => void;
  handle: React.ReactNode;
}

function PoseCell({ item, number, pose, isLoading, isSelected, onSelect, handle }: PoseCellProps) {
  const durationSec = itemDurationSec(item);
  const isAsymmetric = pose?.sidedness === "asymmetric";
  const sideKey = item.side ?? "both";

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card text-card-foreground shadow-xs transition-colors",
        isSelected && "border-primary ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-1 p-1">
        {handle}
        {number !== undefined ? (
          <span className="pr-2 text-xs font-medium text-muted-foreground tabular-nums">
            {number}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onSelect}
        aria-label={pose ? `Edit ${pose.nameEn}` : "Edit pose"}
        className="flex flex-col items-center gap-2 rounded-b-xl px-2 pb-3 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {pose ? (
          <PoseThumbnail pose={pose} size={104} side={item.side} />
        ) : (
          <Skeleton className="h-[146px] w-[104px]" aria-hidden />
        )}
        <span className="flex min-w-0 flex-col">
          <span className="line-clamp-2 text-sm leading-tight font-medium">
            {pose?.nameEn ?? (isLoading ? "Loading…" : "Unknown pose")}
          </span>
          {pose ? (
            <span className="truncate text-xs text-muted-foreground italic">
              {pose.nameSanskritDiacritics}
            </span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center justify-center gap-1">
          {isAsymmetric ? (
            <Badge variant={item.side ? "secondary" : "outline"}>{SIDE_LABELS[sideKey]}</Badge>
          ) : null}
          {durationSec > 0 ? <Badge variant="outline">{formatDuration(durationSec)}</Badge> : null}
          {item.breaths ? <Badge variant="outline">{item.breaths} breaths</Badge> : null}
        </span>
      </button>
    </div>
  );
}

function AddTextRow() {
  return (
    <div className="flex flex-wrap gap-2">
      <AddTextPopover
        kind="section"
        label="Add section"
        icon={<HeadingIcon />}
        placeholder="e.g. Warm-up"
      />
      <AddTextPopover
        kind="note"
        label="Add note"
        icon={<StickyNoteIcon />}
        placeholder="e.g. Hold each side for 5 breaths"
      />
    </div>
  );
}

interface AddTextPopoverProps {
  kind: "section" | "note";
  label: string;
  icon: React.ReactNode;
  placeholder: string;
}

function AddTextPopover({ kind, label, icon, placeholder }: AddTextPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const addSection = useBuilderStore((state) => state.addSection);
  const addNote = useBuilderStore((state) => state.addNote);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (kind === "section") addSection(value);
    else addNote(value);
    setText("");
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          {icon}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            aria-label={label}
          />
          <Button type="submit" size="sm" disabled={!text.trim()}>
            Add
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
