"use client";

import { useCallback, useMemo, useState } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

const MAX_HISTORY = 100;

export interface History<T> {
  present: T;
  canUndo: boolean;
  canRedo: boolean;
  /** Push a new undoable state. */
  commit: (next: T) => void;
  /** Snapshot the current state as an undo step (call once at the start of a gesture). */
  checkpoint: () => void;
  /** Update the present state without adding an undo step. */
  replace: (updater: (previous: T) => T) => void;
  undo: () => void;
  redo: () => void;
  reset: (next: T) => void;
}

/** Minimal undo/redo store. Gestures: `checkpoint()` once, then `replace()` repeatedly. */
export function useHistory<T>(initial: T): History<T> {
  const [state, setState] = useState<HistoryState<T>>({ past: [], present: initial, future: [] });

  const commit = useCallback((next: T) => {
    setState((s) => ({ past: [...s.past, s.present].slice(-MAX_HISTORY), present: next, future: [] }));
  }, []);

  const checkpoint = useCallback(() => {
    setState((s) => ({ past: [...s.past, s.present].slice(-MAX_HISTORY), present: s.present, future: [] }));
  }, []);

  const replace = useCallback((updater: (previous: T) => T) => {
    setState((s) => ({ ...s, present: updater(s.present) }));
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      const previous = s.past[s.past.length - 1];
      if (previous === undefined) return s;
      return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      const next = s.future[0];
      if (next === undefined) return s;
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) };
    });
  }, []);

  const reset = useCallback((next: T) => setState({ past: [], present: next, future: [] }), []);

  return useMemo(
    () => ({
      present: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      commit,
      checkpoint,
      replace,
      undo,
      redo,
      reset,
    }),
    [state, commit, checkpoint, replace, undo, redo, reset],
  );
}
