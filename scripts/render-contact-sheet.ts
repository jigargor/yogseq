/**
 * Dev helper: renders the pose catalog to static HTML contact sheets so rigs
 * can be eyeballed. Output goes to the OS temp dir (not the repo).
 *
 *   pnpm --filter @yogseq/content exec tsx ../../scripts/render-contact-sheet.ts
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_AVATAR } from "../packages/figure/src/bones";
import {
  forwardKinematics,
  resolveLayerOrder,
  segmentsById,
  torsoHullPoints,
} from "../packages/figure/src/fk";
import type { FigurePose } from "../packages/figure/src/pose-schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const poseDir = join(root, "content", "poses");
const outDir = join(tmpdir(), "yogseq-sheets");
mkdirSync(outDir, { recursive: true });

const U = 232;
const GROUND = 240;
const originY = GROUND - (0.22 + 0.22 + 0.02) * U;

function svgFor(pose: FigurePose): string {
  const segs = forwardKinematics(pose);
  const by = segmentsById(segs);
  const px = (x: number): number => 100 + x * U;
  const py = (y: number): number => originY + y * U;
  const parts: string[] = [
    `<line x1="10" x2="190" y1="${GROUND + 3}" y2="${GROUND + 3}" stroke="#999" stroke-width="3"/>`,
  ];
  const hull = torsoHullPoints(segs, pose.view, DEFAULT_AVATAR, 0.02)
    .map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`)
    .join(" ");
  const order = resolveLayerOrder(pose);
  let torsoDone = false;
  for (const id of order) {
    const s = by[id];
    if (!torsoDone && (id === "pelvis" || id === "spineLower" || id === "spineUpper")) {
      torsoDone = true;
      parts.push(
        `<polygon points="${hull}" fill="#4f6f8f" stroke="#4f6f8f" stroke-width="9" stroke-linejoin="round"/>`,
      );
    }
    if (id === "pelvis" || id === "spineLower" || id === "spineUpper") continue;
    const far = (s.depth ?? 0) < -0.05;
    if (id === "head") {
      parts.push(
        `<circle cx="${px((s.start.x + s.end.x) / 2)}" cy="${py((s.start.y + s.end.y) / 2)}" r="${0.06 * U}" fill="#e2b08c"/>`,
      );
      continue;
    }
    const color = far ? "#c28f6c" : "#e2b08c";
    parts.push(
      `<line x1="${px(s.start.x)}" y1="${py(s.start.y)}" x2="${px(s.end.x)}" y2="${py(s.end.y)}" stroke="${color}" stroke-width="${s.width * U}" stroke-linecap="round"/>`,
    );
  }
  return `<svg viewBox="0 0 200 280" width="140" height="196">${parts.join("")}</svg>`;
}

const poses = readdirSync(poseDir)
  .filter((f) => f.endsWith(".json"))
  .map(
    (f) =>
      JSON.parse(readFileSync(join(poseDir, f), "utf8")) as {
        slug: string;
        position: string;
        rig: FigurePose;
        nameEn: string;
      },
  );

const order = ["standing", "kneeling", "seated", "supine", "prone", "inversion", "armBalance"];
poses.sort((a, b) => order.indexOf(a.position) - order.indexOf(b.position));
const PER_PAGE = 24;
for (let page = 0; page * PER_PAGE < poses.length; page++) {
  const cells = poses
    .slice(page * PER_PAGE, (page + 1) * PER_PAGE)
    .map((p) => `<div class="c">${svgFor(p.rig)}<div>${p.slug}</div></div>`)
    .join("");
  writeFileSync(
    join(outDir, `sheet-${page + 1}.html`),
    `<!doctype html><meta charset="utf-8"><style>body{margin:8px;font:12px sans-serif;background:#fff}.g{display:grid;grid-template-columns:repeat(6,150px);gap:4px}.c{text-align:center;border:1px solid #eee;font-size:11px}</style><div class="g">${cells}</div>`,
  );
}
console.log(outDir, Math.ceil(poses.length / PER_PAGE));
