import { ImageResponse } from "next/og";
import { getSharedSequence } from "@/lib/shared-sequence";

export const alt = "Yogseq yoga sequence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OgImageProps {
  params: Promise<{ slug: string }>;
}

export default async function OpengraphImage({ params }: OgImageProps) {
  const { slug } = await params;
  const sequence = await getSharedSequence(slug);
  const title = sequence?.title ?? "Yoga sequence";
  const subtitle = sequence
    ? [
        `${sequence.items.length} items`,
        sequence.targetMinutes ? `${sequence.targetMinutes} min` : null,
        sequence.style,
      ]
        .filter(Boolean)
        .join("  ·  ")
    : "Free yoga sequence builder for teachers";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f6f5ec",
          color: "#1f2d24",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#3d6b4f" }}>
          Yogseq
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 40 ? 64 : 84,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 36, color: "#5b6b60" }}>{subtitle}</div>
        </div>
      </div>
    ),
    size,
  );
}
