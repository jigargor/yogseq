import type { Metadata } from "next";
import Link from "next/link";
import { Figure } from "@yogseq/figure";
import { LEVELS } from "@yogseq/content";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPublishedPoses } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Pose Studio",
  robots: { index: false, follow: false },
};

interface StudioPosesPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function StudioPosesPage({ searchParams }: StudioPosesPageProps) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim().toLowerCase() ?? "";

  const poses = listPublishedPoses().filter(
    (pose) =>
      !query ||
      [pose.nameEn, pose.nameSanskrit, pose.slug, ...pose.aliases]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <Alert className="mb-6">
        <AlertDescription>
          Pose Studio — v1 writes to content/poses via local API
        </AlertDescription>
      </Alert>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Pose Studio <span className="text-muted-foreground text-base">({poses.length})</span>
        </h1>
        <form action="/studio/poses" className="flex gap-2">
          <Input name="q" defaultValue={query} placeholder="Filter poses" aria-label="Filter poses" />
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {poses.map((pose) => (
          <li key={pose.slug}>
            <Link
              href={`/studio/poses/${pose.slug}`}
              className="bg-card hover:bg-accent flex h-full flex-col items-center gap-1 rounded-lg border p-3 transition-colors"
            >
              <Figure pose={pose.rig} skin="solid" size={72} />
              <span className="text-center text-sm font-medium">{pose.nameEn}</span>
              <Badge variant="secondary">{LEVELS[pose.level]}</Badge>
              <span className="text-primary text-xs">Edit</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
