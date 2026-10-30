import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

/** Shared shell for legal pages. Content is a starter template, not legal advice. */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Last updated: {updated}</p>
        <Alert className="mt-6">
          <AlertDescription>
            This page is a draft template and has not been reviewed by a lawyer. It will be
            replaced with reviewed text before general launch.
          </AlertDescription>
        </Alert>
        <div className="mt-8 flex flex-col gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
