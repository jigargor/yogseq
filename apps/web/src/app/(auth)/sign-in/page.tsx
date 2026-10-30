import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthProviders } from "@/lib/auth-providers";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save and share your yoga sequences.",
};

interface SignInPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

/** Only allow same-origin relative redirects. */
function safeNextPath(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/library";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const callbackURL = safeNextPath((await searchParams).next);
  if (await getSessionUser()) redirect(callbackURL);

  const { isMagicLinkEnabled, isGoogleEnabled } = getAuthProviders();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to Yogseq</CardTitle>
          <CardDescription>
            Sign in with your email and password, or create a free account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SignInForm
            callbackURL={callbackURL}
            isMagicLinkEnabled={isMagicLinkEnabled}
            isGoogleEnabled={isGoogleEnabled}
          />
          <p className="text-muted-foreground text-xs">
            By continuing you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            . You can build sequences without an account at{" "}
            <Link href="/builder" className="underline underline-offset-4">
              /builder
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
