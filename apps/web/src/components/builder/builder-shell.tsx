"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "zustand";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { toast } from "sonner";
import {
  FilePlusIcon,
  LayoutGridIcon,
  ListIcon,
  PlayIcon,
  PlusIcon,
  Redo2Icon,
  SaveIcon,
  Share2Icon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/auth/user-menu";
import { saveDocumentToCloud, shareDocument } from "@/lib/builder/cloud";
import { loadCloudSequenceDocument, loadSampleDocument } from "@/lib/builder/load-remote";
import { useBuilderStore } from "@/lib/builder/store";
import { useCatalog } from "@/lib/poses/use-catalog";
import { ORG_HOME_URL, ORG_NAME, PRODUCT_NAME } from "@/lib/org";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { BuilderSkeleton } from "./builder-skeleton";
import { ItemEditor } from "./item-editor";
import { OutlineView } from "./outline-view";
import { PosePalette } from "./pose-palette";
import { SequenceCanvas } from "./sequence-canvas";
import { StatsStrip } from "./stats-strip";
import { TeachMode } from "./teach-mode";

const VIEW_MODES = ["grid", "outline"] as const;

export function BuilderShell() {
  const hydrated = useBuilderStore((state) => state.hydrated);
  const hydrateFromDexie = useBuilderStore((state) => state.hydrateFromDexie);
  const loadDocument = useBuilderStore((state) => state.loadDocument);
  const [sampleId] = useQueryState("sample", parseAsString);
  const [sequenceId] = useQueryState("sequence", parseAsString);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const remoteLoaded = useRef(false);

  useEffect(() => {
    void hydrateFromDexie();
  }, [hydrateFromDexie]);

  useEffect(() => {
    if (!hydrated || remoteLoaded.current) return;
    remoteLoaded.current = true;

    async function loadRemote() {
      if (sequenceId) {
        const loaded = await loadCloudSequenceDocument(sequenceId);
        if (loaded) {
          loadDocument(loaded.document);
          setCloudId(loaded.cloudId);
          return;
        }
        toast.error("Could not load that sequence.");
      }
      if (sampleId) {
        const document = await loadSampleDocument(sampleId);
        if (document) {
          loadDocument(document);
          setCloudId(null);
          return;
        }
        toast.error("Could not load that sample sequence.");
      }
    }

    void loadRemote();
  }, [hydrated, loadDocument, sampleId, sequenceId]);

  if (!hydrated) return <BuilderSkeleton />;
  return <BuilderWorkspace cloudId={cloudId} onCloudIdChange={setCloudId} />;
}

interface BuilderWorkspaceProps {
  cloudId: string | null;
  onCloudIdChange: (id: string | null) => void;
}

function BuilderWorkspace({ cloudId, onCloudIdChange }: BuilderWorkspaceProps) {
  const catalog = useCatalog();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEW_MODES).withDefault("grid").withOptions({ history: "replace" }),
  );
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isTeaching, setIsTeaching] = useState(false);

  const items = useBuilderStore((state) => state.document.items);
  const hasPoses = items.some((item) => item.kind === "pose");

  useUndoRedoShortcuts();

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <TopBar
        view={view}
        onViewChange={(next) => void setView(next)}
        onTeach={() => setIsTeaching(true)}
        canTeach={hasPoses}
        cloudId={cloudId}
        onCloudIdChange={onCloudIdChange}
      />

      <div className="flex min-h-0 flex-1">
        {isDesktop ? (
          <aside className="flex w-80 shrink-0 flex-col gap-3 border-r pt-3" aria-label="Pose library">
            <PosePalette catalog={catalog} />
          </aside>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {view === "outline" ? (
              <OutlineView poseById={catalog.poseById} className="mx-auto max-w-2xl" />
            ) : (
              <SequenceCanvas
                poseById={catalog.poseById}
                isCatalogLoading={catalog.isLoading}
                onRequestAddPoses={() => setIsPaletteOpen(true)}
              />
            )}
          </div>

          <div className="flex items-center gap-3 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <StatsStrip poseById={catalog.poseById} className="flex-1" />
            {!isDesktop ? (
              <Button size="lg" onClick={() => setIsPaletteOpen(true)} className="shrink-0">
                <PlusIcon />
                Add poses
              </Button>
            ) : null}
          </div>
        </main>
      </div>

      {!isDesktop ? (
        <Sheet open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
          <SheetContent side="bottom" className="h-[85dvh] gap-2 rounded-t-2xl">
            <SheetHeader className="pb-0">
              <SheetTitle>Add poses</SheetTitle>
              <SheetDescription className="sr-only">
                Search and tap poses to add them to your sequence.
              </SheetDescription>
            </SheetHeader>
            <PosePalette catalog={catalog} />
          </SheetContent>
        </Sheet>
      ) : null}

      <ItemEditor poseById={catalog.poseById} isDesktop={isDesktop} />

      {isTeaching ? (
        <TeachMode
          items={items}
          poseById={catalog.poseById}
          onExit={() => setIsTeaching(false)}
        />
      ) : null}
    </div>
  );
}

interface TopBarProps {
  view: (typeof VIEW_MODES)[number];
  onViewChange: (view: (typeof VIEW_MODES)[number]) => void;
  onTeach: () => void;
  canTeach: boolean;
  cloudId: string | null;
  onCloudIdChange: (id: string | null) => void;
}

function TopBar({
  view,
  onViewChange,
  onTeach,
  canTeach,
  cloudId,
  onCloudIdChange,
}: TopBarProps) {
  const router = useRouter();
  const document = useBuilderStore((state) => state.document);
  const setTitle = useBuilderStore((state) => state.setTitle);
  const newDocument = useBuilderStore((state) => state.newDocument);
  const hasItems = document.items.length > 0;
  const savedAt = useBuilderStore((state) => state.savedAt);
  const [isPending, startTransition] = useTransition();

  const canUndo = useStore(useBuilderStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useBuilderStore.temporal, (state) => state.futureStates.length > 0);

  function handleNew() {
    if (hasItems && !window.confirm("Start a new sequence? The current one stays saved as a draft."))
      return;
    newDocument();
    onCloudIdChange(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveDocumentToCloud(document, cloudId);
      if (!result.ok) {
        if (result.code === "unauthorized") {
          toast.error("Sign in to save to the cloud.", {
            action: { label: "Sign in", onClick: () => router.push("/sign-in") },
          });
          return;
        }
        toast.error(result.error);
        return;
      }
      onCloudIdChange(result.id);
      toast.success("Saved to your library.");
    });
  }

  function handleShare() {
    startTransition(async () => {
      const result = await shareDocument(document, cloudId);
      if (!result.ok) {
        if (result.code === "unauthorized") {
          toast.error("Sign in to share a link.", {
            action: { label: "Sign in", onClick: () => router.push("/sign-in") },
          });
          return;
        }
        toast.error(result.error);
        return;
      }
      onCloudIdChange(result.id);
      const url = `${window.location.origin}/s/${result.shareSlug}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied.", { description: url });
      } catch {
        toast.success("Share link ready.", { description: url });
      }
    });
  }

  return (
    <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <div className="hidden shrink-0 items-baseline gap-1.5 sm:flex">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {PRODUCT_NAME}
        </Link>
        <a
          href={ORG_HOME_URL}
          className="text-muted-foreground hidden text-[10px] underline-offset-2 hover:underline xl:inline"
          rel="noopener noreferrer"
          target="_blank"
        >
          by {ORG_NAME}
        </a>
      </div>

      <Input
        value={document.title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Sequence title"
        placeholder="Untitled sequence"
        className="h-9 min-w-0 flex-1 basis-40 border-transparent bg-transparent text-base font-semibold shadow-none hover:border-input focus-visible:border-ring sm:max-w-sm md:text-base"
      />

      <span className="hidden text-xs text-muted-foreground xl:block" aria-live="polite">
        {cloudId ? "Synced" : savedAt ? "Saved on this device" : ""}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <IconButton label="New sequence" onClick={handleNew}>
          <FilePlusIcon />
        </IconButton>
        <IconButton
          label="Undo"
          disabled={!canUndo}
          onClick={() => useBuilderStore.temporal.getState().undo()}
        >
          <Undo2Icon />
        </IconButton>
        <IconButton
          label="Redo"
          disabled={!canRedo}
          onClick={() => useBuilderStore.temporal.getState().redo()}
        >
          <Redo2Icon />
        </IconButton>

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={view}
          onValueChange={(value) => value && onViewChange(value as (typeof VIEW_MODES)[number])}
          aria-label="View mode"
          className="mx-1"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGridIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="outline" aria-label="Outline view">
            <ListIcon />
          </ToggleGroupItem>
        </ToggleGroup>

        <Button size="sm" onClick={onTeach} disabled={!canTeach}>
          <PlayIcon />
          <span className="hidden sm:inline">Teach</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className={cn("hidden md:inline-flex")}
          onClick={handleSave}
          disabled={isPending}
        >
          <SaveIcon />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="hidden md:inline-flex"
          onClick={handleShare}
          disabled={isPending}
        >
          <Share2Icon />
          Share
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function IconButton({ label, onClick, disabled, children }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function useUndoRedoShortcuts(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      event.preventDefault();
      const temporal = useBuilderStore.temporal.getState();
      if (event.shiftKey) temporal.redo();
      else temporal.undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
