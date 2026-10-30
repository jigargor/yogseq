/**
 * Node-only helpers that load, validate and assemble the pose catalog from
 * `content/poses/*.json`. Kept out of `index.ts` so the package entry stays
 * safe to import from browser code.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  CATALOG_VERSION,
  poseSchema,
  poseSourceSchema,
  type Pose,
  type PoseCatalog,
} from "./pose-schema";
import { sampleSequenceSchema, type SampleSequence } from "./sequence-schema";

export interface ContentPaths {
  root: string;
  posesDir: string;
  samplesDir: string;
  outFile: string;
  samplesOutFile: string;
}

/** Walk up from `start` until a `pnpm-workspace.yaml` is found. */
function findWorkspaceRoot(start: string): string | undefined {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** Resolve repo paths from `YOGSEQ_ROOT`, the current working directory, or this file's location. */
export function resolveContentPaths(cwd: string = process.cwd()): ContentPaths {
  const fallback = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const root = process.env.YOGSEQ_ROOT
    ? resolve(process.env.YOGSEQ_ROOT)
    : (findWorkspaceRoot(cwd) ?? fallback);
  return {
    root,
    posesDir: join(root, "content", "poses"),
    samplesDir: join(root, "content", "samples"),
    outFile: join(root, "apps", "web", "public", "catalog", "poses.json"),
    samplesOutFile: join(root, "apps", "web", "public", "catalog", "samples.json"),
  };
}

export interface LoadResult<T> {
  items: T[];
  errors: string[];
}

function readJsonFiles(dir: string): { file: string; data: unknown; error?: string }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((file) => {
      try {
        return { file, data: JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown };
      } catch (error) {
        return { file, data: undefined, error: `invalid JSON (${(error as Error).message})` };
      }
    });
}

/** Read and validate every pose file. Missing ids default to the slug. */
export function loadPoses(posesDir: string): LoadResult<Pose> {
  const errors: string[] = [];
  const items: Pose[] = [];

  for (const { file, data, error } of readJsonFiles(posesDir)) {
    if (error) {
      errors.push(`${file}: ${error}`);
      continue;
    }
    const parsed = poseSourceSchema.safeParse(data);
    if (!parsed.success) {
      errors.push(`${file}:\n${z.prettifyError(parsed.error)}`);
      continue;
    }
    const source = parsed.data;
    const pose: Pose = {
      ...source,
      id: source.id ?? source.slug,
      status: source.status ?? "draft",
      version: source.version ?? 1,
    };
    if (file !== `${pose.slug}.json`)
      errors.push(`${file}: file name must match slug "${pose.slug}"`);
    items.push(pose);
  }
  return { items, errors };
}

/** Cross-file checks: unique ids/slugs and resolvable related references. */
export function validatePoseSet(poses: readonly Pose[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const pose of poses) {
    if (ids.has(pose.id)) errors.push(`duplicate id "${pose.id}"`);
    if (slugs.has(pose.slug)) errors.push(`duplicate slug "${pose.slug}"`);
    ids.add(pose.id);
    slugs.add(pose.slug);
  }
  for (const pose of poses)
    for (const [kind, list] of Object.entries(pose.related))
      for (const ref of list) {
        if (ref === pose.slug) errors.push(`${pose.slug}: related.${kind} references itself`);
        else if (!slugs.has(ref))
          errors.push(`${pose.slug}: related.${kind} references unknown pose "${ref}"`);
      }
  return errors;
}

export function loadSamples(
  samplesDir: string,
  poseIds: ReadonlySet<string>,
): LoadResult<SampleSequence> {
  const errors: string[] = [];
  const items: SampleSequence[] = [];
  for (const { file, data, error } of readJsonFiles(samplesDir)) {
    if (error) {
      errors.push(`samples/${file}: ${error}`);
      continue;
    }
    const parsed = sampleSequenceSchema.safeParse(data);
    if (!parsed.success) {
      errors.push(`samples/${file}:\n${z.prettifyError(parsed.error)}`);
      continue;
    }
    for (const item of parsed.data.items)
      if (item.poseId && !poseIds.has(item.poseId))
        errors.push(`samples/${file}: item ${item.id} references unknown pose "${item.poseId}"`);
    items.push(parsed.data);
  }
  return { items, errors };
}

/** Assemble the published catalog (drafts are excluded), sorted by English name. */
export function buildCatalog(poses: readonly Pose[], now: Date = new Date()): PoseCatalog {
  const published = poses
    .filter((pose) => pose.status === "published")
    .map((pose) => poseSchema.parse(pose))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  return { version: CATALOG_VERSION, generatedAt: now.toISOString(), poses: published };
}
