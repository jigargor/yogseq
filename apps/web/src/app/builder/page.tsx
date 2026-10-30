import { Suspense } from "react";
import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { BuilderSkeleton } from "@/components/builder/builder-skeleton";

export const metadata: Metadata = {
  title: "Sequence builder",
  description: "Build, arrange, and teach yoga sequences with a visual pose library.",
};

export default function BuilderPage() {
  return (
    <Suspense fallback={<BuilderSkeleton />}>
      <BuilderShell />
    </Suspense>
  );
}
