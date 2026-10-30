import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Medical Disclaimer" };

export default function DisclaimerPage() {
  return (
    <LegalPage title="Medical Disclaimer" updated="October 30, 2026">
      <p>
        Yogseq provides general information about yoga poses and sequencing for educational
        purposes only. It is not medical advice and is not a substitute for professional
        diagnosis, treatment or guidance.
      </p>

      <h2>Before you practise or teach</h2>
      <ul>
        <li>Consult a qualified healthcare professional before starting any exercise program, especially if you are pregnant, have an injury, or have a medical condition.</li>
        <li>Stop immediately if you feel pain, dizziness or discomfort.</li>
        <li>Cautions listed for each pose are general and not exhaustive.</li>
      </ul>

      <h2>For teachers</h2>
      <p>
        Sequences you build are your responsibility. Adapt them to your students&apos; needs, offer
        modifications, and follow the standards of your training and insurance.
      </p>

      <h2>No guarantee</h2>
      <p>
        Figures are simplified illustrations and may not show correct alignment for every body. Use
        of Yogseq is at your own risk.
      </p>
    </LegalPage>
  );
}
