"use client";

import { nanoid } from "nanoid";
import type { SampleSequence } from "@yogseq/content";
import type { BuilderDocument } from "./types";

interface SamplesCatalog {
  samples: SampleSequence[];
}

interface CloudSequence {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  style: string | null;
  targetMinutes: number | null;
  tags: string[];
  items: BuilderDocument["items"];
}

export async function loadSampleDocument(sampleId: string): Promise<BuilderDocument | null> {
  const response = await fetch("/catalog/samples.json");
  if (!response.ok) return null;
  const data = (await response.json()) as SamplesCatalog;
  const sample = data.samples.find((entry) => entry.id === sampleId);
  if (!sample) return null;
  return {
    id: nanoid(),
    title: sample.title,
    description: sample.description ?? "",
    level: (sample.level as BuilderDocument["level"]) || "beginner",
    style: sample.style ?? "vinyasa",
    targetMinutes: sample.targetMinutes ?? 30,
    tags: sample.tags ?? [],
    items: sample.items,
    updatedAt: Date.now(),
  };
}

export async function loadCloudSequenceDocument(
  sequenceId: string,
): Promise<{ document: BuilderDocument; cloudId: string } | null> {
  const response = await fetch(`/api/sequences/${sequenceId}`);
  if (!response.ok) return null;
  const body = (await response.json()) as { sequence: CloudSequence };
  const sequence = body.sequence;
  if (!sequence?.id) return null;
  return {
    cloudId: sequence.id,
    document: {
      id: sequence.id,
      title: sequence.title,
      description: sequence.description ?? "",
      level: (sequence.level as BuilderDocument["level"]) || "beginner",
      style: sequence.style ?? "vinyasa",
      targetMinutes: sequence.targetMinutes ?? 30,
      tags: sequence.tags ?? [],
      items: sequence.items ?? [],
      updatedAt: Date.now(),
    },
  };
}
