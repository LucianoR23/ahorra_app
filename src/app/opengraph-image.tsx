import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";
import { brandColor } from "@/config/brand-tokens";

export const alt = brand.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social preview: the wordmark from the brand kit on the dark background.
// Generated at build time, so reading the file from disk is fine.
export default async function OpengraphImage() {
  const svg = await readFile(join(process.cwd(), "public/brand/logo/valuo-wordmark-dark.svg"));
  const wordmark = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: brandColor("bg", "dark"),
          fontFamily: "system-ui, sans-serif",
          padding: 80,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> only */}
        <img src={wordmark} alt="" width={564} height={158} />
        <div style={{ marginTop: 48, fontSize: 40, color: brandColor("ink-muted", "dark"), textAlign: "center" }}>
          {brand.tagline}
        </div>
      </div>
    ),
    size,
  );
}
