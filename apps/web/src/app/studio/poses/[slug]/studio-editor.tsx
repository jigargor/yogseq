"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  FlipHorizontal2,
  ImageUp,
  Redo2,
  RotateCcw,
  Save,
  ScanLine,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type { Pose } from "@yogseq/content";
import {
  BONE_IDS,
  FIGURE_VIEWS,
  Figure,
  mirrorPose,
  resolveLayerOrder,
  type BoneId,
  type FigurePose,
  type FigureView,
} from "@yogseq/figure";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetadataForm, metadataFromPose, metadataToPatch, type PoseMetadata } from "./metadata-form";
import { detectPoseFromImage, loadImage } from "./pose-detect";
import { RigCanvas } from "./rig-canvas";
import {
  boneTip,
  dragIk,
  inferBend,
  isIkEndBone,
  moveLayer,
  roundRig,
  setBoneValue,
  type DragMode,
  type IkEndBone,
} from "./rig-ops";
import { useHistory } from "./use-history";

interface StudioEditorProps {
  pose: Pose;
  canWrite: boolean;
}

const VIEW_LABELS = {
  front: "Front",
  side: "Side",
  back: "Back",
  threeQuarter: "3/4",
} as const satisfies Record<FigureView, string>;

const SCALE_RANGE = { min: 0.12, max: 1.5 } as const;
const COALESCE_WINDOW_MS = 800;
const DEG = 180 / Math.PI;

export function StudioEditor({ pose, canWrite }: StudioEditorProps) {
  const history = useHistory<FigurePose>(pose.rig);
  const rig = history.present;

  const [metadata, setMetadata] = useState<PoseMetadata>(() => metadataFromPose(pose));
  const [savedJson, setSavedJson] = useState(() => serialize(pose, metadataFromPose(pose), pose.rig));
  const [mode, setMode] = useState<DragMode>("fk");
  const [selected, setSelected] = useState<BoneId>("forearmL");
  const [bend, setBend] = useState<Partial<Record<IkEndBone, boolean>>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoOpacity, setPhotoOpacity] = useState(0.3);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const lastEditRef = useRef<{ key: string; time: number } | null>(null);

  const currentJson = useMemo(() => serialize(pose, metadata, rig), [pose, metadata, rig]);
  const isDirty = currentJson !== savedJson;

  /** Slider edits within a short window on the same control share one undo step. */
  function editCoalesced(key: string, updater: (previous: FigurePose) => FigurePose) {
    const now = Date.now();
    const last = lastEditRef.current;
    if (!last || last.key !== key || now - last.time > COALESCE_WINDOW_MS) history.checkpoint();
    lastEditRef.current = { key, time: now };
    history.replace(updater);
  }

  function commitRig(next: FigurePose) {
    lastEditRef.current = null;
    history.commit(next);
  }

  const handleUndo = useCallback(() => {
    lastEditRef.current = null;
    setBend({});
    history.undo();
  }, [history]);

  const handleRedo = useCallback(() => {
    lastEditRef.current = null;
    setBend({});
    history.redo();
  }, [history]);

  const handleSave = useCallback(async () => {
    const patch = metadataToPatch(metadata);
    if (patch.cues.length < 3 || patch.cues.length > 6) {
      toast.error("A pose needs 3 to 6 cues.");
      return;
    }
    if (patch.types.length === 0) {
      toast.error("Select at least one pose type.");
      return;
    }

    setIsSaving(true);
    try {
      const body = { ...pose, ...patch, rig: roundRig(rig) };
      const response = await fetch(`/api/studio/poses/${pose.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pose: body }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; path?: string };
      if (!response.ok) {
        toast.error(result.error ?? `Save failed (${response.status})`);
        return;
      }
      setSavedJson(serialize(pose, metadata, rig));
      toast.success(`Saved ${result.path ?? `content/poses/${pose.slug}.json`}`, {
        description: "Run `pnpm content:build` to refresh the published catalog.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [metadata, pose, rig]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && target.getAttribute("type") !== "range")
        return;
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
      } else if (key === "y") {
        event.preventDefault();
        handleRedo();
      } else if (key === "s" && canWrite) {
        event.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canWrite, handleRedo, handleSave, handleUndo]);

  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

  function handleMirror() {
    setBend({});
    commitRig(mirrorPose(rig));
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
  }

  async function handleDetect() {
    if (!photoUrl) return;
    setIsDetecting(true);
    const toastId = toast.loading("Loading pose model and detecting…");
    try {
      const image = await loadImage(photoUrl);
      const detected = await detectPoseFromImage(image);
      setBend({});
      commitRig({ ...detected, props: rig.props });
      toast.success("Pose applied to the rig", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pose detection failed", { id: toastId });
    } finally {
      setIsDetecting(false);
    }
  }

  function handleFlipBend() {
    if (!isIkEndBone(selected)) return;
    const next = !(bend[selected] ?? inferBend(rig, selected));
    setBend((previous) => ({ ...previous, [selected]: next }));
    commitRig(dragIk(rig, selected, boneTip(rig, selected), next));
  }

  const selectedBone = rig.bones[selected];
  const layerOrder = resolveLayerOrder(rig);
  const frontToBack = [...layerOrder].reverse();
  const effectiveBend = isIkEndBone(selected) ? (bend[selected] ?? inferBend(rig, selected)) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleUndo} disabled={!history.canUndo} aria-label="Undo">
            <Undo2 />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRedo} disabled={!history.canRedo} aria-label="Redo">
            <Redo2 />
          </Button>
          <Button variant="outline" onClick={handleMirror}>
            <FlipHorizontal2 /> Mirror
          </Button>
          <ToggleGroup
            type="single"
            variant="outline"
            value={mode}
            onValueChange={(value) => value && setMode(value as DragMode)}
            aria-label="Drag mode"
          >
            <ToggleGroupItem value="fk">FK</ToggleGroupItem>
            <ToggleGroupItem value="ik">IK</ToggleGroupItem>
          </ToggleGroup>
          <Button className="ml-auto" onClick={() => void handleSave()} disabled={!canWrite || isSaving}>
            <Save /> {isSaving ? "Saving…" : isDirty ? "Save*" : "Save"}
          </Button>
        </div>

        <ToggleGroup
          type="single"
          variant="outline"
          value={rig.view}
          onValueChange={(value) => value && commitRig({ ...rig, view: value as FigureView })}
          aria-label="View"
        >
          {FIGURE_VIEWS.map((view) => (
            <ToggleGroupItem key={view} value={view}>
              {VIEW_LABELS[view]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <RigCanvas
          rig={rig}
          mode={mode}
          selected={selected}
          bend={bend}
          photoUrl={photoUrl}
          photoOpacity={photoOpacity}
          onSelect={setSelected}
          onCheckpoint={() => {
            lastEditRef.current = null;
            history.checkpoint();
          }}
          onRigChange={history.replace}
          onBendResolved={(endBone, value) =>
            setBend((previous) => (previous[endBone] === value ? previous : { ...previous, [endBone]: value }))
          }
        />
        <p className="text-muted-foreground text-xs">
          Drag a handle to pose the figure. <strong>FK</strong> rotates a bone about its joint;{" "}
          <strong>IK</strong> (amber handles) moves a wrist or ankle and solves the elbow or knee.
          The blue handle moves the whole figure. Ctrl/⌘+Z undoes, Ctrl/⌘+S saves.
        </p>

        <Previews rig={rig} />
      </section>

      <section>
        <Tabs defaultValue="rig">
          <TabsList>
            <TabsTrigger value="rig">Rig</TabsTrigger>
            <TabsTrigger value="layers">Layers</TabsTrigger>
            <TabsTrigger value="photo">Photo</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="rig" className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label>Selected bone</Label>
              <Select value={selected} onValueChange={(value) => setSelected(value as BoneId)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BONE_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SliderField
              label="Angle (relative to parent)"
              suffix="°"
              value={Math.round(selectedBone.angle * DEG)}
              min={-180}
              max={180}
              step={1}
              onChange={(degrees) =>
                editCoalesced(`angle:${selected}`, (previous) =>
                  setBoneValue(previous, selected, { angle: degrees / DEG }),
                )
              }
            />
            <SliderField
              label="Foreshortening (bone length scale)"
              value={Number((selectedBone.scale ?? 1).toFixed(2))}
              min={SCALE_RANGE.min}
              max={SCALE_RANGE.max}
              step={0.01}
              onChange={(scale) =>
                editCoalesced(`scale:${selected}`, (previous) => setBoneValue(previous, selected, { scale }))
              }
            />
            <SliderField
              label="Depth (higher = closer to viewer)"
              value={Number((selectedBone.depth ?? 0).toFixed(2))}
              min={-1}
              max={1}
              step={0.05}
              onChange={(depth) =>
                editCoalesced(`depth:${selected}`, (previous) => setBoneValue(previous, selected, { depth }))
              }
            />
            <SliderField
              label="Whole-body rotation"
              suffix="°"
              value={Math.round(rig.root.rotation * DEG)}
              min={-180}
              max={180}
              step={1}
              onChange={(degrees) =>
                editCoalesced("root-rotation", (previous) => ({
                  ...previous,
                  root: { ...previous.root, rotation: degrees / DEG },
                }))
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  commitRig(setBoneValue(rig, selected, { angle: pose.rig.bones[selected].angle, scale: pose.rig.bones[selected].scale, depth: pose.rig.bones[selected].depth }))
                }
              >
                <RotateCcw /> Reset bone to saved
              </Button>
              {effectiveBend !== null ? (
                <Button variant="outline" size="sm" onClick={handleFlipBend}>
                  Flip bend ({effectiveBend ? "+" : "−"})
                </Button>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="layers" className="pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">Front of the figure is at the top.</p>
              <Button
                variant="outline"
                size="sm"
                disabled={!rig.layers}
                onClick={() => commitRig({ ...rig, layers: undefined })}
              >
                Use depth order
              </Button>
            </div>
            <ol className="flex flex-col gap-1">
              {frontToBack.map((id, index) => (
                <li
                  key={id}
                  className={`flex items-center justify-between rounded-md border px-2 py-1 text-sm ${id === selected ? "border-primary bg-accent" : ""}`}
                >
                  <button type="button" className="flex-1 text-left" onClick={() => setSelected(id)}>
                    {id}
                  </button>
                  <div className="flex gap-1">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Bring ${id} forward`}
                      disabled={index === 0}
                      onClick={() => commitRig({ ...rig, layers: moveLayer(layerOrder, id, "front") })}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Send ${id} backward`}
                      disabled={index === frontToBack.length - 1}
                      onClick={() => commitRig({ ...rig, layers: moveLayer(layerOrder, id, "back") })}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </TabsContent>

          <TabsContent value="photo" className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reference-photo">Reference photo</Label>
              <input
                id="reference-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="file:bg-secondary text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5"
              />
              <p className="text-muted-foreground text-xs">
                Photos stay in your browser. Detection downloads the MediaPipe model from a CDN the
                first time.
              </p>
            </div>
            <SliderField
              label="Overlay opacity"
              value={Number(photoOpacity.toFixed(2))}
              min={0.05}
              max={1}
              step={0.05}
              onChange={setPhotoOpacity}
            />
            <div className="flex gap-2">
              <Button onClick={() => void handleDetect()} disabled={!photoUrl || isDetecting}>
                <ScanLine /> {isDetecting ? "Detecting…" : "Detect pose from photo"}
              </Button>
              <Button variant="outline" disabled={!photoUrl} onClick={() => setPhotoUrl(null)}>
                <ImageUp /> Clear photo
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="details" className="pt-4">
            <MetadataForm value={metadata} onChange={setMetadata} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function serialize(pose: Pose, metadata: PoseMetadata, rig: FigurePose): string {
  return JSON.stringify({ ...pose, ...metadataToPatch(metadata), rig: roundRig(rig) });
}

interface PreviewsProps {
  rig: FigurePose;
}

const PREVIEW_SIZES = [48, 240] as const;

function Previews({ rig }: PreviewsProps) {
  return (
    <div className="flex flex-col gap-3">
      <Separator />
      <h2 className="text-sm font-medium">Live previews</h2>
      <div className="flex flex-wrap items-end gap-6">
        {PREVIEW_SIZES.map((size) => (
          <div key={size} className="flex items-end gap-3">
            <figure className="flex flex-col items-center gap-1">
              <Figure pose={rig} skin="solid" size={size} />
              <figcaption className="text-muted-foreground text-xs">{size}px solid</figcaption>
            </figure>
            <figure className="flex flex-col items-center gap-1">
              <Figure pose={rig} skin="line" size={size} className="text-foreground" />
              <figcaption className="text-muted-foreground text-xs">{size}px line</figcaption>
            </figure>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function SliderField({ label, value, min, max, step, suffix = "", onChange }: SliderFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-primary w-full"
      />
    </div>
  );
}
