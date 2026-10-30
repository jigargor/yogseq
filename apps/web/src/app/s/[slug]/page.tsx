import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { LEVELS, type LevelId, type SequenceItem } from "@yogseq/content";
import { Figure } from "@yogseq/figure";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { ForkButton } from "@/components/share/fork-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPoseMap } from "@/lib/catalog";
import { formatItemHold } from "@/lib/format";
import { readSequenceItems } from "@/lib/sequences";
import { getSharedSequence } from "@/lib/shared-sequence";

interface SharePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { slug } = await params;
  const sequence = await getSharedSequence(slug);
  if (!sequence) return { title: "Sequence not found", robots: { index: false } };

  const poseCount = readSequenceItems(sequence).filter((item) => item.kind === "pose").length;
  const description =
    sequence.description ?? `A ${poseCount}-pose yoga sequence built with Yogseq.`;
  return {
    title: sequence.title,
    description,
    // Unlisted links should not be indexed; only fully public sequences are.
    robots: sequence.visibility === "public" ? undefined : { index: false, follow: false },
    openGraph: { title: sequence.title, description, type: "article" },
    twitter: { card: "summary_large_image", title: sequence.title, description },
  };
}

export default async function SharedSequencePage({ params }: SharePageProps) {
  const { slug } = await params;
  const sequence = await getSharedSequence(slug);
  if (!sequence) notFound();

  const items = readSequenceItems(sequence);
  const poseCount = items.filter((item) => item.kind === "pose").length;
  const levelLabel =
    sequence.level && sequence.level in LEVELS ? LEVELS[sequence.level as LevelId] : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{sequence.title}</h1>
            <p className="text-muted-foreground text-sm">
              {[
                `${poseCount} ${poseCount === 1 ? "pose" : "poses"}`,
                sequence.targetMinutes ? `${sequence.targetMinutes} min` : null,
                levelLabel,
                sequence.style,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {sequence.description ? <p className="max-w-prose">{sequence.description}</p> : null}
            {sequence.tags && sequence.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {sequence.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <ForkButton shareSlug={slug} />
            <Button asChild variant="outline">
              <Link href={`/s/${slug}/print`}>
                <Printer /> Print
              </Link>
            </Button>
          </div>
        </header>

        <SequenceItems items={items} />

        <p className="text-muted-foreground text-xs">
          Practice mindfully and within your limits. See the{" "}
          <Link href="/disclaimer" className="underline underline-offset-4">
            medical disclaimer
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function SequenceItems({ items }: { items: SequenceItem[] }) {
  const poses = getPoseMap();

  return (
    <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => {
        if (item.kind === "section")
          return (
            <li key={item.id} className="col-span-full border-b pt-4 pb-1">
              <h2 className="text-lg font-semibold">{item.title}</h2>
            </li>
          );

        if (item.kind === "note")
          return (
            <li
              key={item.id}
              className="bg-muted text-muted-foreground col-span-full rounded-md px-3 py-2 text-sm"
            >
              {item.note}
            </li>
          );

        const pose = item.poseId ? poses.get(item.poseId) : undefined;
        const hold = formatItemHold(item);
        return (
          <li key={item.id} className="bg-card flex flex-col items-center gap-1 rounded-lg border p-3">
            {pose ? (
              <Figure
                pose={pose.rig}
                skin="solid"
                size={120}
                side={item.side === "left" ? "left" : "right"}
                showMat
              />
            ) : (
              <div className="bg-muted text-muted-foreground flex h-[168px] w-[120px] items-center justify-center rounded text-xs">
                Pose unavailable
              </div>
            )}
            <p className="text-center text-sm font-medium">{pose?.nameEn ?? item.poseId}</p>
            {pose ? (
              <p className="text-muted-foreground text-center text-xs italic">
                {pose.nameSanskritDiacritics}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              {[item.side ? `${item.side} side` : null, hold].filter(Boolean).join(" · ")}
            </p>
            {item.note ? <p className="text-center text-xs">{item.note}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
