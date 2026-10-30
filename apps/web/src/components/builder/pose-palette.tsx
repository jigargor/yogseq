"use client";

import { useMemo } from "react";
import { debounce, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { PlusIcon, SearchIcon, StarIcon, XIcon } from "lucide-react";
import {
  LEVELS,
  LEVEL_IDS,
  POSE_TYPES,
  POSE_TYPE_IDS,
  POSITIONS,
  POSITION_IDS,
  type Pose,
} from "@yogseq/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { filterPoses } from "@/lib/poses/catalog";
import type { CatalogState } from "@/lib/poses/use-catalog";
import { useBuilderStore } from "@/lib/builder/store";
import { cn } from "@/lib/utils";
import { PoseThumbnail } from "./pose-thumbnail";

const SEARCH_DEBOUNCE_MS = 250;

const filterParsers = {
  q: parseAsString.withDefault(""),
  position: parseAsStringLiteral(POSITION_IDS),
  type: parseAsStringLiteral(POSE_TYPE_IDS),
  level: parseAsStringLiteral(LEVEL_IDS),
};

export interface PosePaletteProps {
  catalog: CatalogState;
  className?: string;
}

export function PosePalette({ catalog, className }: PosePaletteProps) {
  const [filters, setFilters] = useQueryStates(filterParsers, { history: "replace" });
  const recents = useBuilderStore((state) => state.recents);
  const favorites = useBuilderStore((state) => state.favorites);

  const hasFilters = Boolean(filters.q || filters.position || filters.type || filters.level);

  const results = useMemo(
    () =>
      filterPoses(catalog.poses, {
        q: filters.q,
        position: filters.position,
        type: filters.type,
        level: filters.level,
        index: catalog.index ?? undefined,
      }),
    [catalog.poses, catalog.index, filters.q, filters.position, filters.type, filters.level],
  );

  const recentPoses = useMemo(() => resolvePoses(recents, catalog.poseById), [recents, catalog.poseById]);
  const favoritePoses = useMemo(
    () => resolvePoses(favorites, catalog.poseById),
    [favorites, catalog.poseById],
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 px-4 pt-1">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            inputMode="search"
            placeholder="Search poses, Sanskrit, aliases…"
            aria-label="Search poses"
            className="pl-9"
            value={filters.q}
            onChange={(event) =>
              setFilters(
                { q: event.target.value || null },
                { limitUrlUpdates: debounce(SEARCH_DEBOUNCE_MS) },
              )
            }
          />
        </div>

        <FilterRow
          label="Position"
          options={POSITIONS}
          value={filters.position}
          onChange={(position) => setFilters({ position })}
        />
        <FilterRow
          label="Type"
          options={POSE_TYPES}
          value={filters.type}
          onChange={(type) => setFilters({ type })}
        />
        <FilterRow
          label="Level"
          options={LEVELS}
          value={filters.level}
          onChange={(level) => setFilters({ level })}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        {catalog.error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {catalog.error}
          </p>
        ) : null}

        {catalog.isLoading ? <PaletteSkeleton /> : null}

        {!hasFilters && favoritePoses.length > 0 ? (
          <QuickSection title="Favorites" poses={favoritePoses} />
        ) : null}
        {!hasFilters && recentPoses.length > 0 ? (
          <QuickSection title="Recent" poses={recentPoses} />
        ) : null}

        {!catalog.isLoading && !catalog.error ? (
          <section className="flex flex-col gap-2" aria-label="All poses">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {hasFilters ? `${results.length} result${results.length === 1 ? "" : "s"}` : "All poses"}
              </h3>
              {hasFilters ? (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setFilters({ q: null, position: null, type: null, level: null })}
                >
                  <XIcon />
                  Clear
                </Button>
              ) : null}
            </div>
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No poses match. Try a different search or clear filters.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {results.map((pose) => (
                  <PaletteCard key={pose.id} pose={pose} />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function resolvePoses(ids: readonly string[], poseById: ReadonlyMap<string, Pose>): Pose[] {
  return ids.flatMap((id) => poseById.get(id) ?? []);
}

interface FilterRowProps<TId extends string> {
  label: string;
  options: Readonly<Record<TId, string>>;
  value: TId | null;
  onChange: (value: TId | null) => void;
}

function FilterRow<TId extends string>({ label, options, value, onChange }: FilterRowProps<TId>) {
  return (
    <div role="group" aria-label={`Filter by ${label.toLowerCase()}`} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
      {(Object.keys(options) as TId[]).map((id) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(isActive ? null : id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {options[id]}
          </button>
        );
      })}
    </div>
  );
}

function QuickSection({ title, poses }: { title: string; poses: Pose[] }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {poses.map((pose) => (
          <PaletteCard key={pose.id} pose={pose} compact />
        ))}
      </div>
    </section>
  );
}

interface PaletteCardProps {
  pose: Pose;
  compact?: boolean;
}

function PaletteCard({ pose, compact = false }: PaletteCardProps) {
  const addPose = useBuilderStore((state) => state.addPose);
  const addBothSides = useBuilderStore((state) => state.addBothSides);
  const toggleFavorite = useBuilderStore((state) => state.toggleFavorite);
  const isFavorite = useBuilderStore((state) => state.favorites.includes(pose.id));
  const isAsymmetric = pose.sidedness === "asymmetric";

  return (
    <div
      className={cn(
        "group/card relative flex shrink-0 flex-col rounded-lg border bg-card text-card-foreground transition-colors hover:border-primary/50",
        compact && "w-24",
      )}
    >
      <button
        type="button"
        onClick={() => addPose(pose.id, isAsymmetric ? { side: "right" } : undefined)}
        aria-label={`Add ${pose.nameEn}`}
        className="flex min-h-11 flex-col items-center gap-1 rounded-lg p-2 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-accent"
      >
        <PoseThumbnail pose={pose} size={compact ? 56 : 80} />
        <span className="line-clamp-2 text-xs leading-tight font-medium">{pose.nameEn}</span>
        {!compact ? (
          <span className="line-clamp-1 text-[11px] text-muted-foreground italic">
            {pose.nameSanskritDiacritics}
          </span>
        ) : null}
      </button>

      <button
        type="button"
        onClick={() => toggleFavorite(pose.id)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? `Unfavorite ${pose.nameEn}` : `Favorite ${pose.nameEn}`}
        className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <StarIcon className={cn("size-3.5", isFavorite && "fill-primary text-primary")} />
      </button>

      {isAsymmetric && !compact ? (
        <button
          type="button"
          onClick={() => addBothSides(pose.id)}
          aria-label={`Add ${pose.nameEn} on both sides`}
          className="absolute top-1 left-1 flex h-7 items-center gap-0.5 rounded-full bg-muted px-2 text-[10px] font-semibold text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <PlusIcon className="size-3" />
          L+R
        </button>
      ) : null}
    </div>
  );
}

function PaletteSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2" aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-36 rounded-lg" />
      ))}
    </div>
  );
}
