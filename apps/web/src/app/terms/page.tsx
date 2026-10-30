import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 30, 2026">
      <p>By using Yogseq you agree to these terms. If you do not agree, please do not use the service.</p>

      <h2>The service</h2>
      <p>
        Yogseq lets you plan, save, print and share yoga sequences. Features may change, and the
        service is provided &quot;as is&quot; without warranties of any kind.
      </p>

      <h2>Your account and content</h2>
      <ul>
        <li>You are responsible for activity on your account and the content you create.</li>
        <li>You keep ownership of your sequences. You grant us permission to store and display them as needed to run the service, including to people you share links with.</li>
        <li>Do not upload unlawful, infringing or abusive content.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Do not attempt to disrupt the service, bypass rate limits, scrape it at scale, or access
        other users&apos; data.
      </p>

      <h2>Health and safety</h2>
      <p>
        Yoga carries a risk of injury. Pose information is educational only. Please read the{" "}
        <Link href="/disclaimer" className="underline underline-offset-4">
          medical disclaimer
        </Link>
        .
      </p>

      <h2>Liability</h2>
      <p>
        To the maximum extent permitted by law, Yogseq is not liable for indirect or consequential
        damages, or for any injury arising from following a sequence.
      </p>

      <h2>Termination</h2>
      <p>You may delete your account at any time. We may suspend accounts that violate these terms.</p>

      <h2>Changes</h2>
      <p>We may update these terms; continued use after a change means you accept the update.</p>
    </LegalPage>
  );
}
