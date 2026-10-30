import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { slugSchema } from "@yogseq/content";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isStudioWriteAllowed, loadPoseForStudio } from "@/lib/studio";
import { StudioEditor } from "./studio-editor";

interface StudioPosePageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Pose Studio",
  robots: { index: false, follow: false },
};

// Always read the latest content/poses file in development.
export const dynamic = "force-dynamic";

export default async function StudioPosePage({ params }: StudioPosePageProps) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) notFound();

  const pose = await loadPoseForStudio(slug);
  if (!pose) notFound();

  const canWrite = isStudioWriteAllowed();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/studio/poses">
            <ArrowLeft /> All poses
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">
          {pose.nameEn} <span className="text-muted-foreground text-sm font-normal">/{slug}</span>
        </h1>
      </div>

      {canWrite ? null : (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Saving is disabled in this environment (set NODE_ENV=development or
            ALLOW_STUDIO_WRITE=1 to enable it). You can still explore and preview edits.
          </AlertDescription>
        </Alert>
      )}

      <StudioEditor key={`${slug}:${pose.version}`} pose={pose} canWrite={canWrite} />
    </main>
  );
}
