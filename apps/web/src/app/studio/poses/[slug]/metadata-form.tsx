"use client";

import {
  LEVELS,
  POSE_TYPES,
  POSITIONS,
  POSE_STATUSES,
  SIDEDNESS,
  type LevelId,
  type Pose,
  type PoseStatus,
  type PoseTypeId,
  type PositionId,
  type SidednessId,
} from "@yogseq/content";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Editable pose metadata; list fields are kept as text while typing. */
export interface PoseMetadata {
  nameEn: string;
  nameSanskrit: string;
  nameSanskritDiacritics: string;
  aliases: string;
  position: PositionId;
  types: PoseTypeId[];
  level: LevelId;
  sidedness: SidednessId;
  status: PoseStatus;
  cues: string;
  benefits: string;
  cautions: string;
}

export function metadataFromPose(pose: Pose): PoseMetadata {
  return {
    nameEn: pose.nameEn,
    nameSanskrit: pose.nameSanskrit,
    nameSanskritDiacritics: pose.nameSanskritDiacritics,
    aliases: pose.aliases.join(", "),
    position: pose.position,
    types: pose.types,
    level: pose.level,
    sidedness: pose.sidedness,
    status: pose.status,
    cues: pose.cues.join("\n"),
    benefits: pose.benefits.join("\n"),
    cautions: pose.cautions.join("\n"),
  };
}

function splitList(value: string, separator: RegExp): string[] {
  return value
    .split(separator)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function metadataToPatch(metadata: PoseMetadata) {
  return {
    nameEn: metadata.nameEn.trim(),
    nameSanskrit: metadata.nameSanskrit.trim(),
    nameSanskritDiacritics: metadata.nameSanskritDiacritics.trim(),
    aliases: splitList(metadata.aliases, /,/),
    position: metadata.position,
    types: metadata.types,
    level: metadata.level,
    sidedness: metadata.sidedness,
    status: metadata.status,
    cues: splitList(metadata.cues, /\n/),
    benefits: splitList(metadata.benefits, /\n/),
    cautions: splitList(metadata.cautions, /\n/),
  };
}

interface MetadataFormProps {
  value: PoseMetadata;
  onChange: (next: PoseMetadata) => void;
}

export function MetadataForm({ value, onChange }: MetadataFormProps) {
  function patch<K extends keyof PoseMetadata>(key: K, next: PoseMetadata[K]) {
    onChange({ ...value, [key]: next });
  }

  function toggleType(type: PoseTypeId) {
    const types = value.types.includes(type)
      ? value.types.filter((existing) => existing !== type)
      : [...value.types, type];
    patch("types", types);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="English name" value={value.nameEn} onChange={(v) => patch("nameEn", v)} />
        <TextField
          label="Sanskrit"
          value={value.nameSanskrit}
          onChange={(v) => patch("nameSanskrit", v)}
        />
        <TextField
          label="Sanskrit (diacritics)"
          value={value.nameSanskritDiacritics}
          onChange={(v) => patch("nameSanskritDiacritics", v)}
        />
        <TextField
          label="Aliases (comma separated)"
          value={value.aliases}
          onChange={(v) => patch("aliases", v)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Position"
          value={value.position}
          options={POSITIONS}
          onChange={(v) => patch("position", v)}
        />
        <SelectField
          label="Level"
          value={value.level}
          options={LEVELS}
          onChange={(v) => patch("level", v)}
        />
        <SelectField
          label="Sidedness"
          value={value.sidedness}
          options={SIDEDNESS}
          onChange={(v) => patch("sidedness", v)}
        />
        <SelectField
          label="Status"
          value={value.status}
          options={Object.fromEntries(POSE_STATUSES.map((status) => [status, status])) as Record<PoseStatus, string>}
          onChange={(v) => patch("status", v)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Types</Label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(POSE_TYPES) as PoseTypeId[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              aria-pressed={value.types.includes(type)}
            >
              <Badge variant={value.types.includes(type) ? "default" : "outline"}>
                {POSE_TYPES[type]}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <ListField label="Cues (3–6, one per line)" value={value.cues} onChange={(v) => patch("cues", v)} />
      <ListField label="Benefits (one per line)" value={value.benefits} onChange={(v) => patch("benefits", v)} />
      <ListField label="Cautions (one per line)" value={value.cautions} onChange={(v) => patch("cautions", v)} />
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function TextField({ label, value, onChange }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ListField({ label, value, onChange }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

interface SelectFieldProps<K extends string> {
  label: string;
  value: K;
  options: Record<K, string>;
  onChange: (value: K) => void;
}

function SelectField<K extends string>({ label, value, options, onChange }: SelectFieldProps<K>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as K)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(options) as K[]).map((key) => (
            <SelectItem key={key} value={key}>
              {options[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
