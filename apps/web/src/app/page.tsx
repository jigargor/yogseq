import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CloudOff,
  FileText,
  Layers,
  Printer,
  Share2,
  Smartphone,
} from "lucide-react";
import { Figure } from "@yogseq/figure";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPoseMap } from "@/lib/catalog";

export const metadata: Metadata = {
  title: { absolute: "Yogseq — Free yoga sequence builder for teachers" },
  description:
    "Build, print and share yoga class sequences with clean figures. Free for teachers, works offline, no watermarks.",
};

const HERO_POSE_SLUGS = ["mountain", "warrior-2", "triangle", "tree", "downward-dog"] as const;

interface Feature {
  icon: typeof Layers;
  title: string;
  description: string;
}

const FEATURES: readonly Feature[] = [
  {
    icon: Printer,
    title: "Print without paywalls or watermarks",
    description:
      "Class-ready handouts with the figures per row, cues and Sanskrit names you choose. Use your browser's print or save as PDF.",
  },
  {
    icon: Layers,
    title: "A fast, drag-and-drop builder",
    description:
      "Search 150+ poses, drop them into sections, set timings, and rearrange in seconds. No account needed to start.",
  },
  {
    icon: CloudOff,
    title: "Works offline in the studio",
    description:
      "Installable as an app. Drafts save on your device, so spotty studio Wi-Fi never loses your plan.",
  },
  {
    icon: Share2,
    title: "Share a link, or copy a colleague's",
    description:
      "Publish a read-only link to any sequence. Anyone signed in can copy it to their own library and make it theirs.",
  },
  {
    icon: FileText,
    title: "Your sequences stay yours",
    description:
      "Sign in with a magic link — no password. Delete your account and every sequence any time.",
  },
  {
    icon: Smartphone,
    title: "Built for phones and tablets too",
    description: "A mobile-first layout you can use on the mat, between classes, or on the train.",
  },
];

const SAMPLES = [
  {
    id: "beginner-flow-30min",
    title: "Beginner Flow — 30 Minutes",
    meta: "Beginner · 30 min",
  },
  {
    id: "vinyasa-peak-warrior",
    title: "Vinyasa — Peak Warrior III",
    meta: "Intermediate · 60 min",
  },
  {
    id: "yin-hip-openers",
    title: "Yin — Deep Hip Openers",
    meta: "Beginner · 60 min",
  },
] as const;

export default function HomePage() {
  const poses = getPoseMap();
  const heroPoses = HERO_POSE_SLUGS.flatMap((slug) => {
    const pose = poses.get(slug);
    return pose ? [pose] : [];
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center md:py-24">
          <Badge variant="secondary">Free for teachers</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Free yoga sequence builder for teachers
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg text-balance">
            Plan your class, print a clean handout, and share it with a link. No watermarks, no
            paywalled printing, no account required to start.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/builder">
                Start building <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-in">Sign in to save</Link>
            </Button>
          </div>

          <ul
            className="mt-6 flex flex-wrap items-end justify-center gap-4 sm:gap-8"
            aria-label="Example poses"
          >
            {heroPoses.map((pose) => (
              <li key={pose.slug} className="flex flex-col items-center gap-1">
                <Figure pose={pose.rig} skin="solid" size={104} showMat />
                <span className="text-muted-foreground text-xs">{pose.nameEn}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-muted/50 border-y">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-3">
            <h2 className="col-span-full text-2xl font-semibold tracking-tight">
              Everything you need to teach, nothing locked away
            </h2>
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="text-primary mb-2 size-6" />
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Start from a sample sequence</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Open one in the builder and make it your own.
          </p>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {SAMPLES.map((sample) => (
              <li key={sample.id}>
                <Link
                  href={`/builder?sample=${sample.id}`}
                  className="bg-card hover:bg-accent block rounded-lg border p-4 transition-colors"
                >
                  <p className="font-medium">{sample.title}</p>
                  <p className="text-muted-foreground text-sm">{sample.meta}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Plan your next class in minutes</h2>
            <Button asChild size="lg" variant="secondary">
              <Link href="/builder">Open the builder</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
