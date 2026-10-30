import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSearchParamsCache } from "nuqs/server";
import { Figure } from "@yogseq/figure";
import { PrintControls } from "@/components/share/print-controls";
import { getPoseMap } from "@/lib/catalog";
import { formatItemHold, formatSeconds, totalDurationSeconds } from "@/lib/format";
import { clampFiguresPerRow, printOptionParsers } from "@/lib/print-options";
import { readSequenceItems } from "@/lib/sequences";
import { getSharedSequence } from "@/lib/shared-sequence";

interface PrintPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const searchParamsCache = createSearchParamsCache(printOptionParsers);

/** Page width in px used to size figures so a row always fits on A4/Letter. */
const PRINT_ROW_WIDTH = 680;

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sequence = await getSharedSequence(slug);
  return {
    title: sequence ? `${sequence.title} — print` : "Print sequence",
    robots: { index: false, follow: false },
  };
}

export default async function PrintSequencePage({ params, searchParams }: PrintPageProps) {
  const { slug } = await params;
  const sequence = await getSharedSequence(slug);
  if (!sequence) notFound();

  const options = searchParamsCache.parse(await searchParams);
  const figuresPerRow = clampFiguresPerRow(options.figuresPerRow);
  const figureWidth = Math.floor(PRINT_ROW_WIDTH / figuresPerRow) - 20;

  const items = readSequenceItems(sequence);
  const poses = getPoseMap();
  const totalSeconds = totalDurationSeconds(items);

  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 bg-white px-4 py-6 text-black print:max-w-none print:p-0">
      <style>{`
        @page { margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .print-item { break-inside: avoid; }
          .print-section { break-after: avoid; }
        }
      `}</style>

      <PrintControls backHref={`/s/${slug}`} />

      <header className="mb-4 border-b border-black/20 pb-2">
        <h1 className="text-2xl font-bold">{sequence.title}</h1>
        <p className="text-sm text-black/70">
          {[
            sequence.style,
            sequence.targetMinutes ? `${sequence.targetMinutes} min` : null,
            totalSeconds > 0 ? `Timed holds: ${formatSeconds(totalSeconds)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {sequence.description ? <p className="mt-1 text-sm">{sequence.description}</p> : null}
      </header>

      <ol className="grid gap-x-2 gap-y-4" style={{ gridTemplateColumns: `repeat(${figuresPerRow}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          if (item.kind === "section")
            return (
              <li
                key={item.id}
                className="print-section col-span-full border-b border-black/30 pt-2 text-lg font-semibold"
              >
                {item.title}
              </li>
            );

          if (item.kind === "note")
            return (
              <li key={item.id} className="col-span-full text-sm italic text-black/70">
                {item.note}
              </li>
            );

          const pose = item.poseId ? poses.get(item.poseId) : undefined;
          const hold = formatItemHold(item);
          const cues = options.cues && pose ? pose.cues.slice(0, 3) : [];

          return (
            <li key={item.id} className="print-item flex flex-col items-center gap-0.5 text-center">
              {pose ? (
                <Figure
                  pose={pose.rig}
                  skin={options.outlineOnly ? "line" : "solid"}
                  size={figureWidth}
                  side={item.side === "left" ? "left" : "right"}
                  showMat
                  className="text-black"
                />
              ) : null}
              <p className="text-sm leading-tight font-medium">{pose?.nameEn ?? item.poseId}</p>
              {options.sanskrit && pose ? (
                <p className="text-xs italic text-black/70">{pose.nameSanskritDiacritics}</p>
              ) : null}
              <p className="text-xs text-black/70">
                {[item.side ? `${item.side} side` : null, hold].filter(Boolean).join(" · ")}
              </p>
              {item.note ? <p className="text-xs">{item.note}</p> : null}
              {cues.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-left text-[11px] leading-snug text-black/80">
                  {cues.map((cue) => (
                    <li key={cue}>{cue}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>

      <footer className="mt-6 border-t border-black/20 pt-2 text-[10px] text-black/60">
        Created with Yogseq. Practice within your limits; this is not medical advice.
      </footer>
    </main>
  );
}
