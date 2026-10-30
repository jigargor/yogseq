import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 30, 2026">
      <p>
        Yogseq (&quot;we&quot;, &quot;us&quot;) is a yoga sequence builder. This policy explains
        what we collect and why.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> your email address and name (from Google, if you use
          Google sign-in), used to sign you in.
        </li>
        <li>
          <strong>Your content:</strong> sequences, titles, notes and tags you save to your
          library or publish through a share link.
        </li>
        <li>
          <strong>Technical data:</strong> IP address and browser information in server logs and
          session records, used for security and abuse prevention (including rate limiting).
        </li>
        <li>
          <strong>Optional analytics:</strong> if enabled, privacy-friendly aggregate analytics
          (Cloudflare Web Analytics) without advertising cookies.
        </li>
      </ul>

      <h2>On-device data</h2>
      <p>
        Without an account, drafts are stored in your browser (IndexedDB) and never leave your
        device until you choose to save them to your library.
      </p>

      <h2>Photos in Pose Studio</h2>
      <p>
        The internal pose studio processes reference photos locally in your browser; they are not
        uploaded.
      </p>

      <h2>Sharing</h2>
      <p>
        Anyone with a share link can view that sequence. Unlisted links are not searchable, but
        anyone you give the link to can pass it on. You can stop sharing or delete a sequence at
        any time.
      </p>

      <h2>Service providers</h2>
      <p>
        We use hosting and infrastructure providers (for example Cloudflare, Neon and Resend) to
        run the service and send sign-in emails. They process data only to provide those services.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can delete your account and all sequences from the account menu.</li>
        <li>You can request a copy of your data by contacting us.</li>
      </ul>

      <h2>Contact</h2>
      <p>Questions? Contact the Yogseq team using the address listed on the site.</p>
    </LegalPage>
  );
}
