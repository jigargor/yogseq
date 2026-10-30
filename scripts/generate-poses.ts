/**
 * Generates `content/poses/*.json` (the ~150 pose catalog) and
 * `content/samples/*.json` (sample sequences).
 *
 * Run from the repo root:
 *   pnpm content:generate
 *
 * Rigs are authored with world angles in `pose-dsl.ts`; this script converts
 * them to validated `FigurePose` objects and writes one JSON file per pose.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { figurePoseSchema } from "../packages/figure/src/pose-schema";
import { buildRig } from "./pose-dsl";
import type { PoseDef } from "./pose-types";
import { standing } from "./poses/standing";
import { kneeling } from "./poses/kneeling";
import { seated } from "./poses/seated";
import { supine } from "./poses/supine";
import { proneAndSupport } from "./poses/prone";
import { armBalances, inversions } from "./poses/inversions";
import { buildSamples } from "./samples";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const poseDir = join(root, "content", "poses");
const sampleDir = join(root, "content", "samples");

const defs: PoseDef[] = [
  ...standing,
  ...kneeling,
  ...seated,
  ...supine,
  ...proneAndSupport,
  ...inversions,
  ...armBalances,
];

function fail(message: string): never {
  console.error(`generate-poses: ${message}`);
  process.exit(1);
}

const slugs = new Set<string>();
for (const def of defs) {
  if (slugs.has(def.slug)) fail(`duplicate slug "${def.slug}"`);
  slugs.add(def.slug);
}

// Validate related references up front so authoring typos are easy to find.
for (const def of defs)
  for (const [kind, list] of Object.entries(def.related))
    for (const ref of list)
      if (!slugs.has(ref)) fail(`"${def.slug}".related.${kind} references unknown slug "${ref}"`);

mkdirSync(poseDir, { recursive: true });
for (const file of readdirSync(poseDir)) if (file.endsWith(".json")) rmSync(join(poseDir, file));

for (const def of defs) {
  const rig = buildRig(def.rig);
  const parsed = figurePoseSchema.safeParse(rig);
  if (!parsed.success) fail(`rig for "${def.slug}" is invalid: ${parsed.error.message}`);
  if (def.cues.length < 3 || def.cues.length > 6) fail(`"${def.slug}" needs 3-6 cues`);
  if (def.aliases.length < 2 || def.aliases.length > 5) fail(`"${def.slug}" needs 2-5 aliases`);

  const out = {
    id: def.slug,
    slug: def.slug,
    nameEn: def.nameEn,
    nameSanskrit: def.nameSanskrit,
    nameSanskritDiacritics: def.nameSanskritDiacritics,
    aliases: def.aliases,
    position: def.position,
    types: def.types,
    level: def.level,
    sidedness: def.sidedness,
    rig,
    props: def.props,
    cues: def.cues,
    benefits: def.benefits,
    cautions: def.cautions,
    related: def.related,
    status: "published",
    version: 1,
  };
  writeFileSync(join(poseDir, `${def.slug}.json`), `${JSON.stringify(out, null, 2)}\n`);
}

mkdirSync(sampleDir, { recursive: true });
for (const file of readdirSync(sampleDir))
  if (file.endsWith(".json")) rmSync(join(sampleDir, file));
for (const sample of buildSamples(slugs)) {
  const total = sample.items.reduce((sum, item) => sum + (item.durationSec ?? 0), 0);
  writeFileSync(join(sampleDir, `${sample.id}.json`), `${JSON.stringify(sample, null, 2)}\n`);
  console.log(`  sample ${sample.id}: ${sample.items.length} items, ${Math.round(total / 60)} min`);
}

const counts: Record<string, number> = {};
for (const def of defs) counts[def.position] = (counts[def.position] ?? 0) + 1;
console.log(`Generated ${defs.length} poses`, counts);
