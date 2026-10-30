import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { BookOpen, Plus, Search } from "lucide-react";
import type { Sequence } from "@yogseq/db";
import { MigrateDrafts } from "@/components/library/migrate-drafts";
import { SequenceActions } from "@/components/library/sequence-actions";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { listSequences, readSequenceItems } from "@/lib/sequences";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "My library",
  robots: { index: false },
};

interface LibraryPageProps {
  searchParams: Promise<{ q?: string | string[]; tag?: string | string[] }>;
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function matchesQuery(sequence: Sequence, query: string): boolean {
  if (!query) return true;
  const haystack = [sequence.title, sequence.description, sequence.style, ...(sequence.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

function libraryHref(query: string, tag: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (tag) params.set("tag", tag);
  const search = params.toString();
  return search ? `/library?${search}` : "/library";
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/library");

  const params = await searchParams;
  const query = firstValue(params.q);
  const activeTag = firstValue(params.tag).toLowerCase();

  let all: Sequence[] = [];
  let loadError = false;
  try {
    all = await listSequences(user.id);
  } catch (error) {
    console.error("[library] failed to load sequences", error);
    loadError = true;
  }

  const allTags = [...new Set(all.flatMap((sequence) => sequence.tags ?? []))].sort();
  const visible = all.filter(
    (sequence) =>
      matchesQuery(sequence, query) && (!activeTag || (sequence.tags ?? []).includes(activeTag)),
  );
  const isFiltering = query.length > 0 || activeTag.length > 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My library</h1>
            <p className="text-muted-foreground text-sm">
              Sequences saved to your account ({all.length}).
            </p>
          </div>
          <Button asChild>
            <Link href="/builder">
              <Plus /> New sequence
            </Link>
          </Button>
        </div>

        <MigrateDrafts />

        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription>
              We couldn&apos;t load your library right now. Please try again in a moment.
            </AlertDescription>
          </Alert>
        ) : null}

        {all.length > 0 ? (
          <div className="flex flex-col gap-3">
            <form action="/library" className="flex gap-2">
              {activeTag ? <input type="hidden" name="tag" value={activeTag} /> : null}
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Search title, style or tag"
                  className="pl-8"
                  aria-label="Search sequences"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            {allTags.length > 0 ? (
              <div className="flex flex-wrap gap-2" aria-label="Filter by tag">
                <Link href={libraryHref(query, "")}>
                  <Badge variant={activeTag ? "outline" : "default"}>All</Badge>
                </Link>
                {allTags.map((tag) => (
                  <Link key={tag} href={libraryHref(query, tag)}>
                    <Badge variant={tag === activeTag ? "default" : "outline"}>{tag}</Badge>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {visible.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {visible.map((sequence) => (
              <li key={sequence.id}>
                <SequenceCard sequence={sequence} />
              </li>
            ))}
          </ul>
        ) : loadError ? null : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen />
              </EmptyMedia>
              <EmptyTitle>{isFiltering ? "No matching sequences" : "Your library is empty"}</EmptyTitle>
              <EmptyDescription>
                {isFiltering
                  ? "Try a different search or clear the tag filter."
                  : "Build a sequence and save it here to access it from any device."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={isFiltering ? "/library" : "/builder"}>
                  {isFiltering ? "Clear filters" : "Start a sequence"}
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function SequenceCard({ sequence }: { sequence: Sequence }) {
  const poseCount = readSequenceItems(sequence).filter((item) => item.kind === "pose").length;
  const details = [
    `${poseCount} ${poseCount === 1 ? "pose" : "poses"}`,
    sequence.targetMinutes ? `${sequence.targetMinutes} min` : null,
    sequence.level,
    sequence.style,
  ].filter(Boolean);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{sequence.title}</CardTitle>
        <p className="text-muted-foreground text-xs">
          {details.join(" · ")} · Updated {format(sequence.updatedAt, "MMM d, yyyy")}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sequence.description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">{sequence.description}</p>
        ) : null}
        {sequence.tags && sequence.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {sequence.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <SequenceActions id={sequence.id} title={sequence.title} shareSlug={sequence.shareSlug} />
      </CardContent>
    </Card>
  );
}
