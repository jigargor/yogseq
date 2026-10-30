/**
 * Content build CLI.
 *
 *   pnpm --filter @yogseq/content build
 *
 * Reads `content/poses/*.json`, validates every pose, and writes the public
 * catalog to `apps/web/public/catalog/poses.json`. Exits non-zero on any
 * validation failure.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import {
  buildCatalog,
  loadPoses,
  loadSamples,
  resolveContentPaths,
  validatePoseSet,
} from "./catalog";

function main(): void {
  const paths = resolveContentPaths();
  const rel = (path: string): string => relative(paths.root, path).replaceAll("\\", "/");

  const { items: poses, errors } = loadPoses(paths.posesDir);
  errors.push(...validatePoseSet(poses));

  const poseIds = new Set(poses.map((pose) => pose.id));
  const samples = loadSamples(paths.samplesDir, poseIds);
  errors.push(...samples.errors);

  if (poses.length === 0) errors.push(`no poses found in ${rel(paths.posesDir)}`);

  if (errors.length > 0) {
    console.error(`content build failed with ${errors.length} error(s):\n`);
    for (const message of errors) console.error(`  - ${message.replaceAll("\n", "\n    ")}`);
    process.exit(1);
  }

  const catalog = buildCatalog(poses);
  mkdirSync(dirname(paths.outFile), { recursive: true });
  writeFileSync(paths.outFile, `${JSON.stringify(catalog)}\n`);
  writeFileSync(
    paths.samplesOutFile,
    `${JSON.stringify({ version: catalog.version, generatedAt: catalog.generatedAt, samples: samples.items })}\n`,
  );

  const drafts = poses.length - catalog.poses.length;
  console.log(
    `content: ${catalog.poses.length} published poses` +
      `${drafts > 0 ? ` (${drafts} drafts skipped)` : ""}, ${samples.items.length} sample sequences -> ${rel(paths.outFile)} + ${rel(paths.samplesOutFile)}`,
  );
}

main();
