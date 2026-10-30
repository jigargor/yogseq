import { create } from "zustand";
import { temporal } from "zundo";
import { nanoid } from "nanoid";
import { arrayMove } from "@dnd-kit/sortable";
import type { Pose, PositionId, SequenceItem, SequenceSide } from "@yogseq/content";
import { loadLatestDraft, saveDraft } from "./db";
import {
  DEFAULT_DOCUMENT_TITLE,
  DEFAULT_POSE_DURATION_SEC,
  type BuilderDocument,
} from "./types";

export const MAX_RECENTS = 12;
export const SECONDS_PER_BREATH = 5;
const AUTOSAVE_DELAY_MS = 600;
const COALESCE_WINDOW_MS = 1200;
const HISTORY_LIMIT = 100;
const PREFS_STORAGE_KEY = "yogseq:builder-prefs";

export interface AddPoseOptions {
  side?: SequenceSide;
  durationSec?: number;
  breaths?: number;
  /** Insert after this item id instead of appending. */
  afterId?: string;
}

export type ItemPatch = Partial<Omit<SequenceItem, "id" | "kind">>;

export interface BuilderState {
  document: BuilderDocument;
  selectedItemId: string | null;
  recents: string[];
  favorites: string[];
  hydrated: boolean;
  savedAt: number | null;

  setTitle: (title: string) => void;
  addPose: (poseId: string, options?: AddPoseOptions) => string;
  addBothSides: (poseId: string, options?: Omit<AddPoseOptions, "side">) => void;
  addSection: (title: string) => string;
  addNote: (text: string) => string;
  removeItem: (id: string) => void;
  reorderItems: (activeId: string, overId: string) => void;
  updateItem: (id: string, patch: ItemPatch) => void;
  selectItem: (id: string | null) => void;
  toggleFavorite: (poseId: string) => void;
  pushRecent: (poseId: string) => void;
  newDocument: () => void;
  loadDocument: (document: BuilderDocument) => void;
  replaceDocument: (document: BuilderDocument) => void;
  hydrateFromDexie: () => Promise<void>;
  persistToDexie: () => Promise<void>;
}

interface StoredPrefs {
  recents: string[];
  favorites: string[];
}

export function createEmptyDocument(): BuilderDocument {
  return {
    id: nanoid(),
    title: DEFAULT_DOCUMENT_TITLE,
    description: "",
    level: "beginner",
    style: "vinyasa",
    targetMinutes: 30,
    tags: [],
    items: [],
    updatedAt: Date.now(),
  };
}

function touch(document: BuilderDocument, patch: Partial<BuilderDocument>): BuilderDocument {
  return { ...document, ...patch, updatedAt: Date.now() };
}

function createPoseItem(poseId: string, options: AddPoseOptions = {}): SequenceItem {
  const item: SequenceItem = {
    id: nanoid(10),
    kind: "pose",
    poseId,
    durationSec: options.durationSec ?? DEFAULT_POSE_DURATION_SEC,
  };
  if (options.side) item.side = options.side;
  if (options.breaths) item.breaths = options.breaths;
  return item;
}

function insertItems(
  items: SequenceItem[],
  added: SequenceItem[],
  afterId?: string,
): SequenceItem[] {
  const afterIndex = afterId ? items.findIndex((item) => item.id === afterId) : -1;
  if (afterIndex === -1) return [...items, ...added];
  return [...items.slice(0, afterIndex + 1), ...added, ...items.slice(afterIndex + 1)];
}

function pushUnique(list: string[], id: string, max: number): string[] {
  return [id, ...list.filter((entry) => entry !== id)].slice(0, max);
}

function readPrefs(): StoredPrefs {
  if (typeof window === "undefined") return { recents: [], favorites: [] };
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredPrefs>) : {};
    return {
      recents: Array.isArray(parsed.recents) ? parsed.recents : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
    };
  } catch {
    return { recents: [], favorites: [] };
  }
}

function writePrefs(prefs: StoredPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be unavailable (private mode); preferences are best-effort.
  }
}

/**
 * Rapid edits to the same field (typing a title, a duration) share a coalesce key so they
 * collapse into one undo step. Discrete actions leave it unset and always record history.
 */
let pendingCoalesceKey: string | null = null;
let lastCoalesce: { key: string; at: number } | null = null;

function coalesce(key: string): void {
  pendingCoalesceKey = key;
}

let hydratePromise: Promise<void> | null = null;

export const useBuilderStore = create<BuilderState>()(
  temporal(
    (set, get) => ({
      document: createEmptyDocument(),
      selectedItemId: null,
      recents: [],
      favorites: [],
      hydrated: false,
      savedAt: null,

      setTitle: (title) => {
        coalesce("title");
        set((state) => ({ document: touch(state.document, { title }) }));
      },

      addPose: (poseId, options) => {
        const item = createPoseItem(poseId, options);
        set((state) => ({
          document: touch(state.document, {
            items: insertItems(state.document.items, [item], options?.afterId),
          }),
          recents: pushUnique(state.recents, poseId, MAX_RECENTS),
        }));
        writePrefs({ recents: get().recents, favorites: get().favorites });
        return item.id;
      },

      addBothSides: (poseId, options) => {
        const added = (["left", "right"] as const).map((side) =>
          createPoseItem(poseId, { ...options, side }),
        );
        set((state) => ({
          document: touch(state.document, {
            items: insertItems(state.document.items, added, options?.afterId),
          }),
          recents: pushUnique(state.recents, poseId, MAX_RECENTS),
        }));
        writePrefs({ recents: get().recents, favorites: get().favorites });
      },

      addSection: (title) => {
        const item: SequenceItem = { id: nanoid(10), kind: "section", title };
        set((state) => ({
          document: touch(state.document, { items: [...state.document.items, item] }),
        }));
        return item.id;
      },

      addNote: (text) => {
        const item: SequenceItem = { id: nanoid(10), kind: "note", note: text };
        set((state) => ({
          document: touch(state.document, { items: [...state.document.items, item] }),
        }));
        return item.id;
      },

      removeItem: (id) =>
        set((state) => ({
          document: touch(state.document, {
            items: state.document.items.filter((item) => item.id !== id),
          }),
          selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        })),

      reorderItems: (activeId, overId) =>
        set((state) => {
          const { items } = state.document;
          const from = items.findIndex((item) => item.id === activeId);
          const to = items.findIndex((item) => item.id === overId);
          if (from === -1 || to === -1 || from === to) return state;
          return { document: touch(state.document, { items: arrayMove(items, from, to) }) };
        }),

      updateItem: (id, patch) => {
        coalesce(`item:${id}:${Object.keys(patch).join(",")}`);
        set((state) => ({
          document: touch(state.document, {
            items: state.document.items.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }),
        }));
      },

      selectItem: (id) => set({ selectedItemId: id }),

      toggleFavorite: (poseId) => {
        set((state) => ({
          favorites: state.favorites.includes(poseId)
            ? state.favorites.filter((entry) => entry !== poseId)
            : [poseId, ...state.favorites],
        }));
        writePrefs({ recents: get().recents, favorites: get().favorites });
      },

      pushRecent: (poseId) => {
        set((state) => ({ recents: pushUnique(state.recents, poseId, MAX_RECENTS) }));
        writePrefs({ recents: get().recents, favorites: get().favorites });
      },

      newDocument: () => {
        set({ document: createEmptyDocument(), selectedItemId: null });
        useBuilderStore.temporal.getState().clear();
      },

      loadDocument: (document) => {
        set({ document, selectedItemId: null });
        useBuilderStore.temporal.getState().clear();
      },

      replaceDocument: (document) =>
        set((state) => ({
          document: touch(document, { id: state.document.id }),
          selectedItemId: null,
        })),

      hydrateFromDexie: () => {
        if (hydratePromise) return hydratePromise;
        hydratePromise = (async () => {
          const prefs = readPrefs();
          let draft: BuilderDocument | undefined;
          try {
            draft = await loadLatestDraft();
          } catch (error) {
            console.warn("[yogseq] could not read drafts", error);
          }
          const temporalState = useBuilderStore.temporal.getState();
          temporalState.pause();
          set((state) => ({
            document: draft ?? state.document,
            recents: prefs.recents,
            favorites: prefs.favorites,
            hydrated: true,
          }));
          temporalState.clear();
          temporalState.resume();
          startAutosave();
        })();
        return hydratePromise;
      },

      persistToDexie: async () => {
        try {
          await saveDraft(get().document);
          set({ savedAt: Date.now() });
        } catch (error) {
          console.warn("[yogseq] autosave failed", error);
        }
      },
    }),
    {
      limit: HISTORY_LIMIT,
      partialize: (state) => ({ document: state.document }),
      equality: (past, current) => past.document === current.document,
      handleSet: (handleSet) => (pastState, replace, currentState, deltaState) => {
        const key = pendingCoalesceKey;
        pendingCoalesceKey = null;
        const now = Date.now();
        if (key && lastCoalesce?.key === key && now - lastCoalesce.at < COALESCE_WINDOW_MS) {
          lastCoalesce.at = now;
          return;
        }
        lastCoalesce = key ? { key, at: now } : null;
        (handleSet as unknown as (...args: unknown[]) => void)(
          pastState,
          replace,
          currentState,
          deltaState,
        );
      },
    },
  ),
);

let autosaveStarted = false;

function startAutosave(): void {
  if (autosaveStarted || typeof window === "undefined") return;
  autosaveStarted = true;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = (): void => {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
    void useBuilderStore.getState().persistToDexie();
  };

  useBuilderStore.subscribe((state, previous) => {
    if (!state.hydrated || !previous.hydrated || state.document === previous.document) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

/* -------------------------------- stats helpers -------------------------------- */

/** Duration of a single item; falls back to an estimate from breaths. */
export function itemDurationSec(item: SequenceItem): number {
  if (item.kind !== "pose") return 0;
  if (item.durationSec !== undefined) return item.durationSec;
  return item.breaths ? item.breaths * SECONDS_PER_BREATH : 0;
}

export function totalDurationSec(items: readonly SequenceItem[]): number {
  return items.reduce((total, item) => total + itemDurationSec(item), 0);
}

export function poseCount(items: readonly SequenceItem[]): number {
  return items.filter((item) => item.kind === "pose").length;
}

/** 1-based numbering of pose items (sections and notes are not numbered). */
export function poseNumbers(items: readonly SequenceItem[]): Map<string, number> {
  const numbers = new Map<string, number>();
  for (const item of items) if (item.kind === "pose") numbers.set(item.id, numbers.size + 1);
  return numbers;
}

export function positionMix(
  items: readonly SequenceItem[],
  poseById: ReadonlyMap<string, Pose>,
): Partial<Record<PositionId, number>> {
  const mix: Partial<Record<PositionId, number>> = {};
  for (const item of items) {
    const pose = item.kind === "pose" && item.poseId ? poseById.get(item.poseId) : undefined;
    if (pose) mix[pose.position] = (mix[pose.position] ?? 0) + 1;
  }
  return mix;
}

export function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.round(totalSec % 60);
  if (minutes === 0) return `${seconds}s`;
  return seconds === 0 ? `${minutes} min` : `${minutes}m ${seconds}s`;
}
