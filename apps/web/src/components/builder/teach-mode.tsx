"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import type { Pose, SequenceItem } from "@yogseq/content";
import { Button } from "@/components/ui/button";
import { itemDurationSec } from "@/lib/builder/store";
import { PoseThumbnail } from "./pose-thumbnail";
import { SIDE_LABELS } from "./sequence-canvas";

export interface TeachModeProps {
  items: readonly SequenceItem[];
  poseById: ReadonlyMap<string, Pose>;
  onExit: () => void;
}

interface TeachStep {
  item: SequenceItem;
  pose: Pose;
  sectionTitle?: string;
  notes: string[];
}

export function buildTeachSteps(
  items: readonly SequenceItem[],
  poseById: ReadonlyMap<string, Pose>,
): TeachStep[] {
  const steps: TeachStep[] = [];
  let sectionTitle: string | undefined;
  let pendingNotes: string[] = [];

  for (const item of items) {
    if (item.kind === "section") sectionTitle = item.title;
    else if (item.kind === "note") {
      if (item.note) pendingNotes.push(item.note);
    } else {
      const pose = item.poseId ? poseById.get(item.poseId) : undefined;
      if (!pose) continue;
      steps.push({ item, pose, sectionTitle, notes: pendingNotes });
      pendingNotes = [];
    }
  }
  return steps;
}

export function TeachMode({ items, poseById, onExit }: TeachModeProps) {
  const steps = useMemo(() => buildTeachSteps(items, poseById), [items, poseById]);
  const [index, setIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const lastIndex = steps.length - 1;
  const step = steps[Math.min(index, lastIndex)];

  useWakeLock();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onExit();
      else if (event.key === "ArrowRight") setIndex((value) => Math.min(value + 1, lastIndex));
      else if (event.key === "ArrowLeft") setIndex((value) => Math.max(value - 1, 0));
      else if (event.key === " ") {
        event.preventDefault();
        setIsRunning((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastIndex, onExit]);

  if (!step)
    return (
      <TeachFrame onExit={onExit}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted-foreground">Add at least one pose to teach this sequence.</p>
          <Button onClick={onExit}>Back to builder</Button>
        </div>
      </TeachFrame>
    );

  const isLast = index >= lastIndex;

  return (
    <TeachFrame onExit={onExit} progress={`${index + 1} / ${steps.length}`}>
      <TeachStage
        key={step.item.id}
        step={step}
        isRunning={isRunning}
        isLast={isLast}
        onToggleRunning={() => setIsRunning((value) => !value)}
        onFinished={() => {
          if (isLast) setIsRunning(false);
          else setIndex((value) => value + 1);
        }}
      />

      <nav className="flex items-center justify-between gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={index === 0}
          onClick={() => setIndex((value) => Math.max(value - 1, 0))}
        >
          <ChevronLeftIcon />
          Previous
        </Button>
        {isLast ? (
          <Button size="lg" className="flex-1" onClick={onExit}>
            Finish
          </Button>
        ) : (
          <Button size="lg" className="flex-1" onClick={() => setIndex((value) => value + 1)}>
            Next
            <ChevronRightIcon />
          </Button>
        )}
      </nav>
    </TeachFrame>
  );
}

interface TeachFrameProps {
  children: React.ReactNode;
  onExit: () => void;
  progress?: string;
}

function TeachFrame({ children, onExit, progress }: TeachFrameProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Teach mode"
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
    >
      <header className="flex items-center justify-between gap-3 border-b p-3">
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {progress ?? "Teach mode"}
        </span>
        <Button variant="ghost" size="sm" onClick={onExit}>
          <XIcon />
          Exit
        </Button>
      </header>
      {children}
    </div>
  );
}

interface TeachStageProps {
  step: TeachStep;
  isRunning: boolean;
  isLast: boolean;
  onToggleRunning: () => void;
  onFinished: () => void;
}

/** Keyed by item id so the countdown resets whenever the step changes. */
function TeachStage({ step, isRunning, isLast, onToggleRunning, onFinished }: TeachStageProps) {
  const { item, pose } = step;
  const totalSec = itemDurationSec(item);
  const [remaining, setRemaining] = useState(totalSec);
  const hasTimer = totalSec > 0;

  useEffect(() => {
    if (!isRunning || !hasTimer || remaining <= 0) return;
    const timer = setInterval(() => setRemaining((value) => Math.max(value - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [isRunning, hasTimer, remaining]);

  useEffect(() => {
    if (isRunning && hasTimer && remaining === 0) onFinished();
  }, [isRunning, hasTimer, remaining, onFinished]);

  const isAsymmetric = pose.sidedness === "asymmetric";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto p-4 text-center">
      <div className="flex flex-col items-center gap-1">
        {step.sectionTitle ? (
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {step.sectionTitle}
          </span>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{pose.nameEn}</h2>
        <p className="text-muted-foreground italic">{pose.nameSanskritDiacritics}</p>
        {isAsymmetric ? (
          <span className="mt-1 rounded-full bg-secondary px-3 py-0.5 text-xs font-medium text-secondary-foreground">
            {SIDE_LABELS[item.side ?? "both"]}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <PoseThumbnail
          pose={pose}
          size={300}
          side={item.side}
          className="h-auto max-h-[40dvh] w-auto max-w-full"
        />
      </div>

      {hasTimer ? (
        <div className="flex items-center gap-4">
          <span className="text-5xl font-semibold tabular-nums" aria-live="off">
            {formatClock(remaining)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              onClick={onToggleRunning}
              aria-label={isRunning ? "Pause timer" : "Start timer"}
            >
              {isRunning ? <PauseIcon /> : <PlayIcon />}
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={() => setRemaining(totalSec)}
              aria-label="Reset timer"
            >
              <RotateCcwIcon />
            </Button>
          </div>
        </div>
      ) : null}

      {isLast && hasTimer && remaining === 0 ? (
        <p className="text-sm font-medium text-primary">Sequence complete</p>
      ) : null}

      <div className="flex w-full max-w-xl flex-col gap-3 text-left">
        {step.notes.map((text, noteIndex) => (
          <p key={noteIndex} className="rounded-md border border-dashed bg-muted/40 p-3 text-sm italic">
            {text}
          </p>
        ))}
        {item.note ? <p className="rounded-md bg-muted p-3 text-sm">{item.note}</p> : null}
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-base">
          {pose.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function formatClock(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Keep the screen awake while teaching, when the Wake Lock API is available. */
function useWakeLock(): void {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let isActive = true;

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (!isActive) void sentinel.release();
      } catch {
        // Denied (e.g. low battery or hidden tab); teaching still works.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      isActive = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void sentinel?.release();
    };
  }, []);
}
