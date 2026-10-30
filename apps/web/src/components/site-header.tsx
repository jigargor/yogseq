import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { ORG_HOME_URL, ORG_NAME, PRODUCT_NAME } from "@/lib/org";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-baseline gap-2">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            {PRODUCT_NAME}
          </Link>
          <span className="text-muted-foreground hidden text-xs sm:inline">
            by{" "}
            <a
              href={ORG_HOME_URL}
              className="underline-offset-4 hover:text-foreground hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              {ORG_NAME}
            </a>
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/builder" className="text-muted-foreground hover:text-foreground">
            Builder
          </Link>
          <Link href="/library" className="text-muted-foreground hover:text-foreground">
            Library
          </Link>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p>
            © 2026 {PRODUCT_NAME}. Yoga is not a substitute for medical advice —{" "}
            <Link href="/disclaimer" className="underline underline-offset-4">
              read the medical disclaimer
            </Link>
            .
          </p>
          <p>
            {PRODUCT_NAME} by{" "}
            <a
              href={ORG_HOME_URL}
              className="underline underline-offset-4 hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              {ORG_NAME}
            </a>
          </p>
        </div>
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/disclaimer" className="hover:text-foreground">
            Disclaimer
          </Link>
        </nav>
      </div>
    </footer>
  );
}
