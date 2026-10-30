import type { Pose } from "@yogseq/content";
import { getPoseBySlug } from "@/lib/catalog";

/**
 * Pose Studio persistence helpers (server only).
 *
 * Writes go to `content/poses/<slug>.json` at the *monorepo root*. We locate
 * the root by walking up from `process.cwd()` until `pnpm-workspace.yaml`
 * appears, so it works whether Next runs from `apps/web` or from the root.
 */

export function isStudioWriteAllowed(): boolean {
  return process.env.NODE_ENV === "development" || process.env.ALLOW_STUDIO_WRITE === "1";
}

async function findMonorepoRoot(): Promise<string> {
  const [{ access }, path] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);

  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    try {
      await access(path.join(dir, "pnpm-workspace.yaml"));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  // Fallback: apps/web -> monorepo root.
  return path.resolve(process.cwd(), "..", "..");
}

export async function getPosesDir(): Promise<string> {
  const [root, path] = await Promise.all([findMonorepoRoot(), import("node:path")]);
  return path.join(root, "content", "poses");
}

export async function readPoseFile(slug: string): Promise<unknown | null> {
  try {
    const [{ readFile }, path, dir] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
      getPosesDir(),
    ]);
    const raw = await readFile(path.join(dir, `${slug}.json`), "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function writePoseFile(slug: string, pose: unknown): Promise<string> {
  const [{ mkdir, writeFile }, path, dir] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
    getPosesDir(),
  ]);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${slug}.json`);
  await writeFile(file, `${JSON.stringify(pose, null, 2)}\n`, "utf8");
  return file;
}

/** Latest authored pose: the content file when writable (dev), else the built catalog. */
export async function loadPoseForStudio(slug: string): Promise<Pose | null> {
  if (isStudioWriteAllowed()) {
    const fromFile = (await readPoseFile(slug)) as Partial<Pose> | null;
    if (fromFile) {
      const fallback = getPoseBySlug(slug);
      return {
        status: "draft",
        version: 1,
        id: slug,
        ...fallback,
        ...fromFile,
      } as Pose;
    }
  }
  return getPoseBySlug(slug) ?? null;
}
